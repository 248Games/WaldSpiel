// Wald-Leiternspiel: die Spielregeln
// Hier gibt es keine Anzeige, nur den Spielstand (ein normales Objekt).
// Jede Funktion bekommt den alten Stand und gibt einen neuen zurück.
// Kein import/export, damit index.html auch direkt von der Festplatte läuft.
(function (global) {
  'use strict';

  const MIN_PLAYERS = 2;
  const MAX_PLAYERS = 4;
  const MIN_POINTS = 1;
  const MAX_POINTS = 6;
  const STATE_VERSION = 2;

  // Das Brett (Feld 1 unten links, Ziel 36 oben links):
  //
  //   36 35 34 33 32 31
  //   25 26 27 28 29 30
  //   24 23 22 21 20 19
  //   13 14 15 16 17 18
  //   12 11 10  9  8  7
  //    1  2  3  4  5  6
  //
  // Jede Leiter steht in einer Spalte. Kein Feld gehört zu zwei Leitern.
  // Größe und Leitern habe ich ausprobiert, bis ein Spiel zu zweit
  // ungefähr 15 bis 30 Fragen dauert (siehe Tests).
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

  // Spalte und Reihe eines Feldes (Reihe 0 ist unten)
  function cellPosition(field) {
    const index = field - 1;
    const row = Math.floor(index / BOARD.columns);
    const offset = index % BOARD.columns;
    return { column: row % 2 === 0 ? offset : BOARD.columns - 1 - offset, row };
  }

  // Leiter auf diesem Feld? Unten = hinauf, oben = hinunter. Sonst null.
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

  // Zufall (mit eigenem Startwert, damit die Tests immer gleich laufen)

  // Zufallszahl zwischen 0 und 1 (mulberry32)
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

  // Spielstand

  const clone = (state) => JSON.parse(JSON.stringify(state));

  function expectPhase(state, phase, action) {
    if (state.phase !== phase) {
      throw new Error(`${action} is only possible in phase "${phase}", not "${state.phase}".`);
    }
  }

  // Wer antwortet: der Spieler nach dem Vorleser
  function answererOf(state) {
    return (state.reader + 1) % state.players.length;
  }

  // Alle Karten neu mischen. Die oberste Karte ist die letzte im Array.
  function freshPile(state) {
    const pile = shuffled(state, state.cards);
    // Die gerade gezogene Karte soll nicht sofort wieder oben liegen
    if (pile.length > 1 && pile[pile.length - 1] === state.lastDrawn) {
      [pile[0], pile[pile.length - 1]] = [pile[pile.length - 1], pile[0]];
    }
    return pile;
  }

  // Neues Spiel. names: 2 bis 4 Namen, der jüngste Spieler zuerst,
  // dann immer der Spieler links daneben.
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
      // der jüngste Spieler liest zuerst vor
      reader: 0,
      // gezogene Karten in diesem Spiel
      asked: 0,
      // alle Karten mit Punkten und Anzahl der Antworten
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

  // Noch ein Spiel: alle zurück auf Start, der Stapel wird weiter benutzt
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

  // Vorleser zieht die oberste Karte (leerer Stapel wird neu gemischt)
  function drawCard(previous) {
    expectPhase(previous, 'draw', 'Drawing a card');

    const state = clone(previous);
    if (state.pile.length === 0) state.pile = freshPile(state);
    const id = state.pile.pop();
    state.lastDrawn = id;
    state.asked += 1;

    const order = shuffled(state, Array.from({ length: state.answerCounts[id] }, (_, i) => i));
    // order = Reihenfolge der Antworten auf dem Bildschirm. Antwort 0 ist richtig.
    state.question = { id, points: state.points[id], order };
    state.phase = 'question';
    return state;
  }

  // Der Antwortende tippt eine Antwort an
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

  // Wer gerade geantwortet hat, liest als Nächstes vor
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

  // Weiter nach der Auflösung (und nach einer Leiter):
  // falsch -> nächster Zug, richtig -> vorrücken, dann Ziel, Leiter oder nächster Zug
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
      // nur eine Leiter pro Zug
      state.players[state.move.player].field = state.move.ladder.to;
      endTurn(state);
      return state;
    }

    throw new Error(`Nothing to advance in phase "${state.phase}".`);
  }

  // Prüft, ob ein gespeicherter Spielstand noch passt
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
