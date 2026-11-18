/**
 * Wald-Leiternspiel – the rules.
 *
 * Snakes and ladders where a question card replaces the dice: each turn the
 * player is offered one card per difficulty, each worth a number of steps.
 * A correct answer moves that far; a wrong one stays put. Ladders lift,
 * slides drop, first to the last field wins.
 *
 * Everything here is a pure function over a plain JSON state: no DOM, no
 * timers, no Math.random (the state carries its own seed). That keeps a game
 * reproducible, lets it be saved with JSON.stringify, and makes the rules
 * testable without a browser.
 *
 * Classic script on purpose (no import/export) so index.html works when it is
 * opened straight from disk; the tests load it for its side effect.
 */
(function (global) {
  'use strict';

  const LEVELS = ['easy', 'medium', 'hard'];

  /** The steps a card of each difficulty can be worth: together, one die. */
  const STEPS = { easy: [1, 2], medium: [3, 4], hard: [5, 6] };

  const MAX_PLAYERS = 4;
  const STATE_VERSION = 1;

  /**
   * Fields run 1..49 in a serpentine from the bottom-left corner, so field 49
   * ends up top-right. Everyone starts on field 1.
   *
   *   43 44 45 46 47 48 49
   *   42 41 40 39 38 37 36
   *   29 30 31 32 33 34 35
   *   28 27 26 25 24 23 22
   *   15 16 17 18 19 20 21
   *   14 13 12 11 10  9  8
   *    1  2  3  4  5  6  7
   *
   * Ladders and slides are placed so that none starts where another starts or
   * ends (no chain reactions) and their gains and losses cancel out (68 each).
   * The size was settled by simulation: with players who use the ladders about
   * half the time, two players need around 20 questions and four around 32.
   */
  const BOARD = Object.freeze({
    columns: 7,
    rows: 7,
    size: 49,
    ladders: Object.freeze([
      Object.freeze({ from: 4, to: 17 }),
      Object.freeze({ from: 9, to: 23 }),
      Object.freeze({ from: 16, to: 30 }),
      Object.freeze({ from: 26, to: 39 }),
      Object.freeze({ from: 33, to: 47 }),
    ]),
    slides: Object.freeze([
      Object.freeze({ from: 14, to: 2 }),
      Object.freeze({ from: 24, to: 10 }),
      Object.freeze({ from: 32, to: 18 }),
      Object.freeze({ from: 35, to: 21 }),
      Object.freeze({ from: 48, to: 34 }),
    ]),
  });

  const SPECIALS = new Map();
  for (const ladder of BOARD.ladders) SPECIALS.set(ladder.from, { kind: 'ladder', ...ladder });
  for (const slide of BOARD.slides) SPECIALS.set(slide.from, { kind: 'slide', ...slide });

  /** Column and row of a field, both 0-based, with row 0 at the bottom. */
  function cellPosition(field) {
    const index = field - 1;
    const row = Math.floor(index / BOARD.columns);
    const offset = index % BOARD.columns;
    return { column: row % 2 === 0 ? offset : BOARD.columns - 1 - offset, row };
  }

  /** The ladder or slide that starts on a field, or null. */
  function specialAt(field) {
    const special = SPECIALS.get(field);
    return special ? { ...special } : null;
  }

  // ── Randomness ────────────────────────────────────────────────────────────

  /** One step of mulberry32. Advances state.seed and returns a float in [0, 1). */
  function nextRandom(state) {
    state.seed = (state.seed + 0x6d2b79f5) | 0;
    let t = state.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function randomInt(state, exclusiveMax) {
    return Math.floor(nextRandom(state) * exclusiveMax);
  }

  function shuffled(state, items) {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(state, i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // ── State ─────────────────────────────────────────────────────────────────

  const clone = (state) => JSON.parse(JSON.stringify(state));

  function expectPhase(state, phase, action) {
    if (state.phase !== phase) {
      throw new Error(`${action} is only possible in phase "${phase}", not "${state.phase}".`);
    }
  }

  function dealOffer(state) {
    state.offer = {};
    for (const level of LEVELS) {
      state.offer[level] = STEPS[level][randomInt(state, STEPS[level].length)];
    }
  }

  /**
   * Start a game.
   *
   * @param {string[]} names      One to four player names; blanks get a default.
   * @param {object}   options
   * @param {Array}    options.questions  The question list from content.js.
   * @param {number}   [options.seed]     Fixes the shuffle; defaults to the clock.
   */
  function createGame(names, { questions, seed = Date.now() } = {}) {
    if (!Array.isArray(names) || names.length < 1 || names.length > MAX_PLAYERS) {
      throw new Error(`A game needs 1 to ${MAX_PLAYERS} players.`);
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('A game needs questions.');
    }

    const state = {
      version: STATE_VERSION,
      phase: 'choose',
      seed: seed | 0,
      players: names.map((name, index) => ({
        name: String(name ?? '').trim().slice(0, 20) || `Team ${index + 1}`,
        field: 1,
        correct: 0,
        wrong: 0,
      })),
      current: 0,
      round: 1,
      // Every question id per level, and how many answers each one has. The
      // state keeps these so that refilling a pile needs nothing from outside.
      pool: { easy: [], medium: [], hard: [] },
      answerCounts: {},
      piles: { easy: [], medium: [], hard: [] },
      lastDrawn: { easy: null, medium: null, hard: null },
      offer: null,
      question: null,
      answer: null,
      move: null,
      winner: null,
    };

    for (const question of questions) {
      if (!state.pool[question.level]) continue;
      state.pool[question.level].push(question.id);
      state.answerCounts[question.id] = question.answers.length;
    }
    for (const level of LEVELS) {
      if (state.pool[level].length === 0) throw new Error(`No "${level}" questions.`);
    }

    dealOffer(state);
    return state;
  }

  /** The same players, a fresh board and a fresh shuffle. */
  function rematch(state, { questions, seed = Date.now() } = {}) {
    return createGame(state.players.map((player) => player.name), { questions, seed });
  }

  /** Take the top card of a pile, reshuffling the whole level when it runs out. */
  function drawQuestion(state, level) {
    if (state.piles[level].length === 0) {
      const pile = shuffled(state, state.pool[level]);
      // The card that is drawn next sits at the end. After a reshuffle, don't
      // let it be the one the players have just seen.
      if (pile.length > 1 && pile[pile.length - 1] === state.lastDrawn[level]) {
        [pile[0], pile[pile.length - 1]] = [pile[pile.length - 1], pile[0]];
      }
      state.piles[level] = pile;
    }
    const id = state.piles[level].pop();
    state.lastDrawn[level] = id;
    return id;
  }

  /**
   * Where each of the three offered cards would take the current player.
   * @returns {Array<{level, steps, target, reachesGoal, special}>}
   */
  function previewOffer(state) {
    if (state.phase !== 'choose') return [];
    const from = state.players[state.current].field;
    return LEVELS.map((level) => {
      const steps = state.offer[level];
      const target = Math.min(BOARD.size, from + steps);
      return {
        level,
        steps,
        target,
        reachesGoal: target === BOARD.size,
        special: specialAt(target),
      };
    });
  }

  /** The current player picks a difficulty and gets a question. */
  function chooseCard(previous, level) {
    expectPhase(previous, 'choose', 'Choosing a card');
    if (!LEVELS.includes(level)) throw new Error(`Unknown level "${level}".`);

    const state = clone(previous);
    const id = drawQuestion(state, level);
    const order = shuffled(state, Array.from({ length: state.answerCounts[id] }, (_, i) => i));
    // `order[i]` is the index, in the question's own answer list, of the
    // answer shown in position i. Answer 0 is always the correct one.
    state.question = { id, level, steps: state.offer[level], order };
    state.phase = 'question';
    return state;
  }

  /** The current player picks the answer shown at `shownIndex`. */
  function answer(previous, shownIndex) {
    expectPhase(previous, 'question', 'Answering');
    const { order, steps } = previous.question;
    if (!Number.isInteger(shownIndex) || shownIndex < 0 || shownIndex >= order.length) {
      throw new Error(`There is no answer ${shownIndex}.`);
    }

    const state = clone(previous);
    const player = state.players[state.current];
    const correct = order[shownIndex] === 0;
    state.answer = { chosen: shownIndex, correct };

    if (correct) {
      player.correct += 1;
      const landing = Math.min(BOARD.size, player.field + steps);
      state.move = {
        player: state.current,
        from: player.field,
        landing,
        special: landing < BOARD.size ? specialAt(landing) : null,
      };
    } else {
      player.wrong += 1;
      state.move = null;
    }

    state.phase = 'reveal';
    return state;
  }

  function endTurn(state) {
    state.current = (state.current + 1) % state.players.length;
    if (state.current === 0) state.round += 1;
    state.question = null;
    state.answer = null;
    state.move = null;
    dealOffer(state);
    state.phase = 'choose';
  }

  function finish(state) {
    state.winner = state.current;
    state.phase = 'over';
  }

  /**
   * Carry the game forward after the answer has been revealed, and again after
   * a ladder or slide has been announced.
   *
   *   reveal ─ wrong ──────────────────────────→ next player
   *   reveal ─ right ─ plain field ────────────→ next player
   *                  ─ last field ─────────────→ over
   *                  ─ ladder/slide → event ───→ next player
   */
  function advance(previous) {
    const state = clone(previous);
    const player = state.players[state.current];

    if (state.phase === 'reveal') {
      if (!state.answer.correct) {
        endTurn(state);
      } else {
        player.field = state.move.landing;
        if (player.field >= BOARD.size) finish(state);
        else if (state.move.special) state.phase = 'event';
        else endTurn(state);
      }
      return state;
    }

    if (state.phase === 'event') {
      player.field = state.move.special.to;
      if (player.field >= BOARD.size) finish(state);
      else endTurn(state);
      return state;
    }

    throw new Error(`Nothing to advance in phase "${state.phase}".`);
  }

  /** Whether a value read back from storage looks like a game this code can run. */
  function isValidState(state) {
    if (!state || typeof state !== 'object' || state.version !== STATE_VERSION) return false;
    if (!['choose', 'question', 'reveal', 'event', 'over'].includes(state.phase)) return false;
    if (!Array.isArray(state.players) || state.players.length < 1 || state.players.length > MAX_PLAYERS) {
      return false;
    }
    if (!Number.isInteger(state.current) || !state.players[state.current]) return false;
    const fieldsOk = state.players.every(
      (player) =>
        player &&
        typeof player.name === 'string' &&
        Number.isInteger(player.field) &&
        player.field >= 1 &&
        player.field <= BOARD.size,
    );
    if (!fieldsOk) return false;
    if (!state.pool || !state.piles || !state.answerCounts) return false;
    if (state.phase === 'choose' && !state.offer) return false;
    if ((state.phase === 'question' || state.phase === 'reveal') && !state.question) return false;
    if (state.phase === 'reveal' && !state.answer) return false;
    if (state.phase === 'event' && !(state.move && state.move.special)) return false;
    return true;
  }

  const namespace = (global.WaldLeiternspiel = global.WaldLeiternspiel || {});
  namespace.game = {
    BOARD,
    LEVELS,
    STEPS,
    MAX_PLAYERS,
    cellPosition,
    specialAt,
    createGame,
    rematch,
    previewOffer,
    chooseCard,
    answer,
    advance,
    isValidState,
  };
})(globalThis);
