/**
 * Wald-Leiternspiel – the rules.
 *
 * A board game with question cards instead of dice, played like the printed
 * version: one player draws a card from a shuffled pile and reads it out, the
 * next player answers. A correct answer moves the answering player as many
 * fields as the card has points; a wrong one leaves them where they are. Then
 * the player who answered reads the next card to the player after them.
 *
 * There are only ladders. Landing on the bottom end of a ladder takes a player
 * up to its top; landing on the top end takes them down to its bottom.
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

  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 4;
  const MIN_POINTS = 1;
  const MAX_POINTS = 6;
  const STATE_VERSION = 2;

  /**
   * Fields run 1..36 in a serpentine from the bottom-left corner, so field 36
   * ends up top-left. Everyone starts on field 1.
   *
   *   36 35 34 33 32 31
   *   25 26 27 28 29 30
   *   24 23 22 21 20 19
   *   13 14 15 16 17 18
   *   12 11 10  9  8  7
   *    1  2  3  4  5  6
   *
   * Each ladder stands in one column, so it never crosses another field's
   * number. No field belongs to two ladders, and no ladder touches the start
   * or the goal, so a move never sets off a second ladder.
   *
   * Size and ladders were settled by simulation (see the tests): two players
   * who answer three out of four questions correctly need about 18 questions
   * in all, and four games out of five end after 11 to 30.
   */
  const BOARD = Object.freeze({
    columns: 6,
    rows: 6,
    size: 36,
    ladders: Object.freeze([
      Object.freeze({ bottom: 3, top: 10 }),
      Object.freeze({ bottom: 7, top: 18 }),
      Object.freeze({ bottom: 9, top: 21 }),
      Object.freeze({ bottom: 14, top: 23 }),
      Object.freeze({ bottom: 20, top: 29 }),
      Object.freeze({ bottom: 27, top: 34 }),
    ]),
  });

  const LADDER_ENDS = new Map();
  for (const ladder of BOARD.ladders) {
    LADDER_ENDS.set(ladder.bottom, ladder);
    LADDER_ENDS.set(ladder.top, ladder);
  }

  /** Column and row of a field, both 0-based, with row 0 at the bottom. */
  function cellPosition(field) {
    const index = field - 1;
    const row = Math.floor(index / BOARD.columns);
    const offset = index % BOARD.columns;
    return { column: row % 2 === 0 ? offset : BOARD.columns - 1 - offset, row };
  }

  /**
   * The ladder that has an end on a field, and where it takes a player who
   * lands there: up from the bottom end, down from the top end. Null if none.
   */
  function ladderAt(field) {
    const ladder = LADDER_ENDS.get(field);
    if (!ladder) return null;
    const up = field === ladder.bottom;
    return {
      bottom: ladder.bottom,
      top: ladder.top,
      direction: up ? 'up' : 'down',
      from: field,
      to: up ? ladder.top : ladder.bottom,
    };
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

  /** The player who answers the card that the reader reads out: the next one. */
  function answererOf(state) {
    return (state.reader + 1) % state.players.length;
  }

  /** Shuffle every card into a new pile. The top card is the last one. */
  function freshPile(state) {
    const pile = shuffled(state, state.cards);
    // After a reshuffle, don't let the card the players have just seen come
    // straight back up.
    if (pile.length > 1 && pile[pile.length - 1] === state.lastDrawn) {
      [pile[0], pile[pile.length - 1]] = [pile[pile.length - 1], pile[0]];
    }
    return pile;
  }

  /**
   * Start a game.
   *
   * @param {string[]} names  Two to four player names in seating order: the
   *                          youngest first, then each player to the left of
   *                          the one before. Blanks get a default.
   * @param {object}   options
   * @param {Array}    options.questions  The question list from content.js.
   * @param {number}   [options.seed]     Fixes the shuffle; defaults to the clock.
   */
  function createGame(names, { questions, seed = Date.now() } = {}) {
    if (!Array.isArray(names) || names.length < MIN_PLAYERS || names.length > MAX_PLAYERS) {
      throw new Error(`A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players.`);
    }
    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('A game needs questions.');
    }

    const state = {
      version: STATE_VERSION,
      phase: 'draw',
      seed: seed | 0,
      players: names.map((name, index) => ({
        name: String(name ?? '').trim().slice(0, 20) || `Spieler ${index + 1}`,
        field: 1,
        correct: 0,
        wrong: 0,
      })),
      // The youngest player reads the first card.
      reader: 0,
      // How many cards have been drawn in this game.
      asked: 0,
      // Every card in the game, with its points and how many answers it has.
      // The state keeps these so that reshuffling needs nothing from outside.
      cards: [],
      points: {},
      answerCounts: {},
      pile: [],
      lastDrawn: null,
      question: null,
      answer: null,
      move: null,
      winner: null,
    };

    for (const question of questions) {
      if (!Number.isInteger(question.points) || question.points < MIN_POINTS || question.points > MAX_POINTS) {
        throw new Error(`Question "${question.id}" needs ${MIN_POINTS} to ${MAX_POINTS} points.`);
      }
      state.cards.push(question.id);
      state.points[question.id] = question.points;
      state.answerCounts[question.id] = question.answers.length;
    }

    state.pile = freshPile(state);
    return state;
  }

  /**
   * The same players back on the start field. The pile carries on where it
   * was, so the next game does not repeat cards until all have been seen.
   */
  function rematch(previous) {
    const state = clone(previous);
    for (const player of state.players) Object.assign(player, { field: 1, correct: 0, wrong: 0 });
    Object.assign(state, {
      phase: 'draw',
      reader: 0,
      asked: 0,
      question: null,
      answer: null,
      move: null,
      winner: null,
    });
    return state;
  }

  /** The reader draws the top card of the pile; the pile is reshuffled when empty. */
  function drawCard(previous) {
    expectPhase(previous, 'draw', 'Drawing a card');

    const state = clone(previous);
    if (state.pile.length === 0) state.pile = freshPile(state);
    const id = state.pile.pop();
    state.lastDrawn = id;
    state.asked += 1;

    const order = shuffled(state, Array.from({ length: state.answerCounts[id] }, (_, i) => i));
    // `order[i]` is the index, in the question's own answer list, of the
    // answer shown in position i. Answer 0 is always the correct one.
    state.question = { id, points: state.points[id], order };
    state.phase = 'question';
    return state;
  }

  /** The answering player gives the answer shown at `shownIndex`. */
  function answer(previous, shownIndex) {
    expectPhase(previous, 'question', 'Answering');
    const { order, points } = previous.question;
    if (!Number.isInteger(shownIndex) || shownIndex < 0 || shownIndex >= order.length) {
      throw new Error(`There is no answer ${shownIndex}.`);
    }

    const state = clone(previous);
    const index = answererOf(state);
    const player = state.players[index];
    const correct = order[shownIndex] === 0;
    state.answer = { chosen: shownIndex, correct };

    if (correct) {
      player.correct += 1;
      const landing = Math.min(BOARD.size, player.field + points);
      state.move = {
        player: index,
        from: player.field,
        landing,
        ladder: landing < BOARD.size ? ladderAt(landing) : null,
      };
    } else {
      player.wrong += 1;
      state.move = null;
    }

    state.phase = 'reveal';
    return state;
  }

  /** The player who has just answered reads the next card. */
  function endTurn(state) {
    state.reader = answererOf(state);
    state.question = null;
    state.answer = null;
    state.move = null;
    state.phase = 'draw';
  }

  function finish(state) {
    state.winner = state.move.player;
    state.phase = 'over';
  }

  /**
   * Carry the game forward after the answer has been revealed, and again after
   * a ladder has been announced.
   *
   *   reveal ─ wrong ──────────────────────────→ next reader
   *   reveal ─ right ─ plain field ────────────→ next reader
   *                  ─ goal ───────────────────→ over
   *                  ─ ladder end → event ─────→ next reader
   */
  function advance(previous) {
    const state = clone(previous);

    if (state.phase === 'reveal') {
      if (!state.answer.correct) {
        endTurn(state);
      } else {
        const player = state.players[state.move.player];
        player.field = state.move.landing;
        if (player.field >= BOARD.size) finish(state);
        else if (state.move.ladder) state.phase = 'event';
        else endTurn(state);
      }
      return state;
    }

    if (state.phase === 'event') {
      // One ladder per move: the other end of this ladder does not count.
      state.players[state.move.player].field = state.move.ladder.to;
      endTurn(state);
      return state;
    }

    throw new Error(`Nothing to advance in phase "${state.phase}".`);
  }

  /** Whether a value read back from storage looks like a game this code can run. */
  function isValidState(state) {
    if (!state || typeof state !== 'object' || state.version !== STATE_VERSION) return false;
    if (!['draw', 'question', 'reveal', 'event', 'over'].includes(state.phase)) return false;
    const { players } = state;
    if (!Array.isArray(players) || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return false;
    if (!Number.isInteger(state.reader) || !players[state.reader]) return false;
    const fieldsOk = players.every(
      (player) =>
        player &&
        typeof player.name === 'string' &&
        Number.isInteger(player.field) &&
        player.field >= 1 &&
        player.field <= BOARD.size,
    );
    if (!fieldsOk) return false;
    if (!Array.isArray(state.cards) || state.cards.length === 0 || !Array.isArray(state.pile)) return false;
    if (!state.points || !state.answerCounts) return false;
    if (!state.pile.every((id) => state.cards.includes(id))) return false;
    if ((state.phase === 'question' || state.phase === 'reveal') && !state.question) return false;
    if (state.phase === 'reveal' && !state.answer) return false;
    if (state.phase === 'event' && !(state.move && state.move.ladder)) return false;
    if (state.phase === 'over' && !players[state.winner]) return false;
    return true;
  }

  const namespace = (global.WaldLeiternspiel = global.WaldLeiternspiel || {});
  namespace.game = {
    BOARD,
    MIN_PLAYERS,
    MAX_PLAYERS,
    MIN_POINTS,
    MAX_POINTS,
    cellPosition,
    ladderAt,
    answererOf,
    createGame,
    rematch,
    drawCard,
    answer,
    advance,
    isValidState,
  };
})(globalThis);
