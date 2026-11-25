import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// The game's scripts are classic scripts that attach to a global, so that
// index.html runs from disk without a server. Load them for that side effect.
await import('../js/content.js');
await import('../js/game.js');

const { content, game } = globalThis.WaldLeiternspiel;
const { QUESTIONS, LADDER_EVENTS, TOPIC_LABELS, CONCLUSION } = content;
const { BOARD } = game;

const gameDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const newGame = (names = ['Ada', 'Ben'], seed = 7) => game.createGame(names, { questions: QUESTIONS, seed });

/** The position in which the correct answer is shown for the open question. */
const correctIndex = (state) => state.question.order.indexOf(0);
const wrongIndex = (state) => state.question.order.findIndex((original) => original !== 0);

/** Put the answering player on a field and the reader's next card on top of the pile. */
function staged(state, field, points) {
  const copy = structuredClone(state);
  copy.players[game.answererOf(copy)].field = field;
  if (points != null) {
    const id = copy.cards.find((card) => copy.points[card] === points);
    copy.pile = [...copy.pile.filter((card) => card !== id), id];
  }
  return copy;
}

/** Draw, answer (right or wrong) and resolve everything up to the next draw. */
function playTurn(state, right) {
  let next = game.drawCard(state);
  next = game.answer(next, right ? correctIndex(next) : wrongIndex(next));
  next = game.advance(next);
  if (next.phase === 'event') next = game.advance(next);
  return next;
}

/** A difficulty band: 1–2 points easy, 3–4 medium, 5–6 hard. */
const band = (points) => Math.ceil(points / 2);

describe('Leiternspiel: cards', () => {
  it('gives every card a fixed number of points from 1 to 6', () => {
    for (const q of QUESTIONS) {
      assert.ok(Number.isInteger(q.points) && q.points >= 1 && q.points <= 6, `${q.id}: ${q.points} points`);
      assert.equal(q.level, undefined, `${q.id}: still has a level`);
    }
  });

  it('uses every number of points about equally often, like the faces of a die', () => {
    const counts = [1, 2, 3, 4, 5, 6].map((points) => QUESTIONS.filter((q) => q.points === points).length);
    const mean = QUESTIONS.length / 6;
    for (const [i, count] of counts.entries()) {
      assert.ok(Math.abs(count - mean) <= 2, `${i + 1} points on ${count} cards, expected about ${mean}`);
    }
  });

  it('gives every question a unique id', () => {
    const ids = QUESTIONS.map((q) => q.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('gives every question a known topic', () => {
    for (const q of QUESTIONS) assert.ok(TOPIC_LABELS[q.topic], `${q.id}: topic "${q.topic}"`);
  });

  it('gives every question text, an explanation and 3 or 4 distinct answers', () => {
    for (const q of QUESTIONS) {
      assert.ok(q.question.trim().length > 10, `${q.id}: question text`);
      assert.ok(q.explanation.trim().length > 10, `${q.id}: explanation`);
      assert.ok(q.answers.length >= 3 && q.answers.length <= 4, `${q.id}: ${q.answers.length} answers`);
      assert.equal(new Set(q.answers.map((a) => a.trim())).size, q.answers.length, `${q.id}: duplicate answer`);
      assert.ok(q.answers.every((a) => a.trim().length > 0), `${q.id}: empty answer`);
    }
  });

  it('covers both halves of the research question at every difficulty', () => {
    for (const level of [1, 2, 3]) {
      for (const topic of ['economy', 'society']) {
        const count = QUESTIONS.filter((q) => band(q.points) === level && q.topic === topic).length;
        assert.ok(count >= 4, `only ${count} "${topic}" questions in band ${level}`);
      }
    }
  });

  it('answers the research question for every topic', () => {
    assert.deepEqual(CONCLUSION.groups.map((g) => g.topic).sort(), Object.keys(TOPIC_LABELS).sort());
    assert.ok(CONCLUSION.groups.every((g) => g.points.length >= 3));
    assert.ok(CONCLUSION.summary.length > 20);
  });

  it('refuses a card without valid points', () => {
    const bad = { ...QUESTIONS[0], points: 7 };
    assert.throws(() => game.createGame(['Ada', 'Ben'], { questions: [bad] }));
    const none = { ...QUESTIONS[0], points: undefined };
    assert.throws(() => game.createGame(['Ada', 'Ben'], { questions: [none] }));
  });
});

describe('Leiternspiel: board', () => {
  const ends = BOARD.ladders.flatMap(({ bottom, top }) => [bottom, top]);

  it('runs in a serpentine from the bottom-left corner', () => {
    assert.deepEqual(game.cellPosition(1), { column: 0, row: 0 });
    assert.deepEqual(game.cellPosition(6), { column: 5, row: 0 });
    assert.deepEqual(game.cellPosition(7), { column: 5, row: 1 });
    assert.deepEqual(game.cellPosition(12), { column: 0, row: 1 });
    assert.deepEqual(game.cellPosition(13), { column: 0, row: 2 });
    assert.deepEqual(game.cellPosition(BOARD.size), { column: 0, row: BOARD.rows - 1 });
  });

  it('gives every field its own cell', () => {
    const cells = new Set();
    for (let field = 1; field <= BOARD.size; field++) {
      const { column, row } = game.cellPosition(field);
      assert.ok(column >= 0 && column < BOARD.columns && row >= 0 && row < BOARD.rows);
      cells.add(`${column},${row}`);
    }
    assert.equal(cells.size, BOARD.size);
    assert.equal(BOARD.size, BOARD.columns * BOARD.rows);
  });

  it('has only ladders, no slides', () => {
    assert.equal(BOARD.slides, undefined);
    assert.ok(BOARD.ladders.length >= 4);
    for (const ladder of BOARD.ladders) assert.deepEqual(Object.keys(ladder).sort(), ['bottom', 'top']);
  });

  it('has ladders whose top is higher up the board than their bottom', () => {
    for (const { bottom, top } of BOARD.ladders) {
      assert.ok(top > bottom, `ladder ${bottom}`);
      assert.ok(game.cellPosition(top).row > game.cellPosition(bottom).row, `ladder ${bottom} goes up a row`);
    }
  });

  it('stands every ladder in one column, clear of the other fields', () => {
    for (const { bottom, top } of BOARD.ladders) {
      assert.equal(game.cellPosition(top).column, game.cellPosition(bottom).column, `ladder ${bottom}`);
    }
  });

  it('keeps ladders off the start and the goal', () => {
    for (const field of ends) assert.ok(field > 1 && field < BOARD.size, `field ${field}`);
  });

  it('never chains: no field belongs to two ladders', () => {
    assert.equal(new Set(ends).size, ends.length);
  });

  it('reports both ends of a ladder', () => {
    assert.deepEqual(game.ladderAt(3), { bottom: 3, top: 10, direction: 'up', from: 3, to: 10 });
    assert.deepEqual(game.ladderAt(10), { bottom: 3, top: 10, direction: 'down', from: 10, to: 3 });
    assert.equal(game.ladderAt(4), null);
    assert.equal(game.ladderAt(1), null);
    assert.equal(game.ladderAt(BOARD.size), null);
  });

  it('explains every ladder both ways, and nothing else', () => {
    const bottoms = BOARD.ladders.map((ladder) => String(ladder.bottom)).sort();
    assert.deepEqual(Object.keys(LADDER_EVENTS).sort(), bottoms);
    for (const [field, event] of Object.entries(LADDER_EVENTS)) {
      assert.deepEqual(Object.keys(event).sort(), ['down', 'up'], `ladder ${field}`);
      for (const side of [event.up, event.down]) {
        assert.ok(side.title.trim().length > 3 && side.text.trim().length > 20, `ladder ${field}`);
      }
      assert.notEqual(event.up.title, event.down.title, `ladder ${field}`);
    }
  });
});

describe('Leiternspiel: reader and answerer', () => {
  it('starts everyone on field 1 with the youngest (first) player reading', () => {
    const state = newGame(['Ada', 'Ben', 'Cem']);
    assert.equal(state.phase, 'draw');
    assert.equal(state.reader, 0);
    assert.equal(game.answererOf(state), 1);
    assert.deepEqual(state.players.map((p) => p.field), [1, 1, 1]);
  });

  it('names players who left their name blank', () => {
    const state = newGame(['', '  ', 'Cem']);
    assert.deepEqual(state.players.map((p) => p.name), ['Spieler 1', 'Spieler 2', 'Cem']);
  });

  it('needs at least 2 and at most 4 players', () => {
    assert.throws(() => newGame([]));
    assert.throws(() => newGame(['Ada']));
    assert.doesNotThrow(() => newGame(['a', 'b']));
    assert.doesNotThrow(() => newGame(['a', 'b', 'c', 'd']));
    assert.throws(() => newGame(['a', 'b', 'c', 'd', 'e']));
  });

  it('moves the answering player, not the reader', () => {
    let state = staged(newGame(['Ada', 'Ben', 'Cem']), 5, 3);
    state = game.drawCard(state);
    assert.equal(state.question.points, 3);
    state = game.answer(state, correctIndex(state));
    assert.deepEqual(state.move, { player: 1, from: 5, landing: 8, ladder: null });
    state = game.advance(state);
    assert.deepEqual(state.players.map((p) => p.field), [1, 8, 1]);
    assert.deepEqual(state.players.map((p) => p.correct), [0, 1, 0]);
  });

  it('hands the reading to whoever has just answered', () => {
    let state = newGame(['Ada', 'Ben', 'Cem']);
    const turns = [];
    for (let i = 0; i < 7; i++) {
      turns.push([state.reader, game.answererOf(state)]);
      state = playTurn(state, i % 2 === 0);
    }
    assert.deepEqual(turns, [[0, 1], [1, 2], [2, 0], [0, 1], [1, 2], [2, 0], [0, 1]]);
  });

  it('passes the reading on after a wrong answer too', () => {
    let state = newGame(['Ada', 'Ben']);
    state = playTurn(state, false);
    assert.equal(state.reader, 1);
    assert.equal(game.answererOf(state), 0);
    assert.deepEqual(state.players.map((p) => [p.field, p.wrong]), [[1, 0], [1, 1]]);
  });

  it('lets two players take turns reading to each other', () => {
    let state = newGame(['Ada', 'Ben']);
    const answerers = [];
    for (let i = 0; i < 6; i++) {
      answerers.push(game.answererOf(state));
      state = playTurn(state, false);
    }
    assert.deepEqual(answerers, [1, 0, 1, 0, 1, 0]);
  });
});

describe('Leiternspiel: a turn', () => {
  it('moves as many fields as the card has points on a correct answer', () => {
    for (const points of [1, 2, 3, 4, 5, 6]) {
      let state = staged(newGame(), 24, points);
      state = game.drawCard(state);
      assert.equal(state.question.points, points);
      state = game.answer(state, correctIndex(state));
      assert.equal(state.answer.correct, true);
      assert.equal(state.move.landing, 24 + points);
    }
  });

  it('leaves the player in place on a wrong answer', () => {
    let state = staged(newGame(), 5, 6);
    state = game.drawCard(state);
    state = game.answer(state, wrongIndex(state));
    assert.equal(state.answer.correct, false);
    assert.equal(state.move, null);

    state = game.advance(state);
    assert.equal(state.players[1].field, 5);
    assert.equal(state.players[1].wrong, 1);
    assert.equal(state.phase, 'draw');
  });

  it('climbs a ladder after landing on its bottom end', () => {
    let state = staged(newGame(), 1, 2);
    state = game.drawCard(state);
    state = game.answer(state, correctIndex(state));
    assert.deepEqual(state.move.ladder, { bottom: 3, top: 10, direction: 'up', from: 3, to: 10 });
    state = game.advance(state);
    assert.equal(state.phase, 'event');
    assert.equal(state.players[1].field, 3);
    assert.equal(state.reader, 0, 'the turn is not over until the ladder is taken');

    state = game.advance(state);
    assert.equal(state.players[1].field, 10);
    assert.equal(state.phase, 'draw');
    assert.equal(state.reader, 1);
  });

  it('goes down a ladder after landing on its top end', () => {
    let state = staged(newGame(), 6, 4);
    state = game.drawCard(state);
    state = game.answer(state, correctIndex(state));
    assert.deepEqual(state.move.ladder, { bottom: 3, top: 10, direction: 'down', from: 10, to: 3 });
    state = game.advance(state);
    assert.equal(state.phase, 'event');
    state = game.advance(state);
    assert.equal(state.players[1].field, 3, 'down the ladder, and not back up again');
    assert.equal(state.phase, 'draw');
  });

  it('takes every ladder both ways and never sets off a second one', () => {
    for (const { bottom, top } of BOARD.ladders) {
      for (const [landing, to] of [[bottom, top], [top, bottom]]) {
        const points = Math.min(6, landing - 1);
        let state = staged(newGame(), landing - points, points);
        state = game.drawCard(state);
        state = game.answer(state, correctIndex(state));
        state = game.advance(state);
        assert.equal(state.phase, 'event', `landing on ${landing}`);
        state = game.advance(state);
        assert.equal(state.players[1].field, to, `landing on ${landing}`);
        assert.equal(state.phase, 'draw');
        assert.equal(game.ladderAt(to).to, landing, 'the field reached is the other end of the same ladder');
      }
    }
  });

  it('ends the game when the answering player reaches the goal', () => {
    let state = staged(newGame(), BOARD.size - 2, 6);
    state = game.drawCard(state);
    state = game.answer(state, correctIndex(state));
    assert.equal(state.move.landing, BOARD.size, 'overshooting still reaches the goal');
    state = game.advance(state);
    assert.equal(state.phase, 'over');
    assert.equal(state.winner, 1);
    assert.equal(state.players[1].field, BOARD.size);
    assert.throws(() => game.advance(state));
    assert.throws(() => game.drawCard(state));
  });

  it('rejects actions that do not fit the phase', () => {
    const state = newGame();
    assert.throws(() => game.answer(state, 0));
    assert.throws(() => game.advance(state));
    const asked = game.drawCard(state);
    assert.throws(() => game.drawCard(asked));
    assert.throws(() => game.answer(asked, 9));
    assert.throws(() => game.advance(asked));
  });

  it('never changes the state it was given', () => {
    const state = newGame();
    const before = JSON.stringify(state);
    const asked = game.drawCard(state);
    const askedBefore = JSON.stringify(asked);
    game.advance(game.answer(asked, 0));
    assert.equal(JSON.stringify(state), before);
    assert.equal(JSON.stringify(asked), askedBefore);
  });
});

describe('Leiternspiel: the pile', () => {
  it('starts with every card in a shuffled pile', () => {
    const a = newGame(['Ada', 'Ben'], 1);
    const b = newGame(['Ada', 'Ben'], 2);
    assert.equal(a.pile.length, QUESTIONS.length);
    assert.deepEqual([...a.pile].sort(), QUESTIONS.map((q) => q.id).sort());
    assert.notDeepEqual(a.pile, b.pile);
    assert.notDeepEqual(a.pile, QUESTIONS.map((q) => q.id), 'shuffled, not in file order');
  });

  it('draws the top card, face down until drawn', () => {
    const state = newGame();
    assert.equal(state.question, null, 'no card is shown before it is drawn');
    const top = state.pile[state.pile.length - 1];
    const drawn = game.drawCard(state);
    assert.equal(drawn.question.id, top);
    assert.equal(drawn.pile.length, QUESTIONS.length - 1);
    assert.equal(drawn.asked, 1);
    assert.equal(drawn.phase, 'question');
  });

  it('shows the points printed on the card', () => {
    let state = newGame();
    for (let i = 0; i < 20; i++) {
      state = game.drawCard(state);
      const card = QUESTIONS.find((q) => q.id === state.question.id);
      assert.equal(state.question.points, card.points);
      assert.deepEqual([...state.question.order].sort(), card.answers.map((_, j) => j));
      state = game.advance(game.answer(state, wrongIndex(state)));
    }
  });

  it('plays through the whole pile before any card comes back', () => {
    let state = newGame(['Ada', 'Ben']);
    const seen = [];
    for (let i = 0; i < QUESTIONS.length; i++) {
      state = game.drawCard(state);
      seen.push(state.question.id);
      state = game.advance(game.answer(state, wrongIndex(state)));
    }
    assert.equal(new Set(seen).size, QUESTIONS.length);
    assert.equal(state.pile.length, 0);

    state = game.drawCard(state);
    assert.equal(state.pile.length, QUESTIONS.length - 1, 'reshuffled the whole pile');
    assert.notEqual(state.question.id, seen[seen.length - 1], 'not the card just seen');
  });

  it('reshuffles when the pile runs out, without an immediate repeat', () => {
    const three = QUESTIONS.slice(0, 3);
    for (let seed = 1; seed <= 40; seed++) {
      let state = game.createGame(['Ada', 'Ben'], { questions: three, seed });
      let previous = null;
      const rounds = [];
      for (let i = 0; i < 12; i++) {
        state = game.drawCard(state);
        assert.notEqual(state.question.id, previous, `seed ${seed}, draw ${i}`);
        previous = state.question.id;
        rounds.push(state.question.id);
        state = game.advance(game.answer(state, wrongIndex(state)));
      }
      for (let r = 0; r < 4; r++) {
        assert.equal(new Set(rounds.slice(r * 3, r * 3 + 3)).size, 3, `seed ${seed}: every card once per pile`);
      }
    }
  });

  it('plays the same game from the same seed', () => {
    const play = (seed) => {
      let state = newGame(['Ada', 'Ben'], seed);
      const log = [];
      for (let i = 0; i < 10 && state.phase !== 'over'; i++) {
        state = game.drawCard(state);
        log.push(state.question.id, state.question.order.join(''));
        state = game.advance(game.answer(state, correctIndex(state)));
        if (state.phase === 'event') state = game.advance(state);
      }
      return log;
    };
    assert.deepEqual(play(42), play(42));
    assert.notDeepEqual(play(42), play(43));
  });

  it('puts the correct answer in every position over time', () => {
    const positions = new Set();
    for (let seed = 1; seed <= 80; seed++) {
      let state = newGame(['Ada', 'Ben'], seed);
      state = game.drawCard(state);
      if (state.question.order.length === 4) positions.add(correctIndex(state));
    }
    assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
  });
});

describe('Leiternspiel: whole games', () => {
  /** Play to the end, answering correctly with the given probability. */
  function playOut(seed, players, accuracy) {
    let state = newGame(players, seed);
    let draws = seed;
    const random = () => {
      draws = (draws * 1103515245 + 12345) & 0x7fffffff;
      return draws / 0x7fffffff;
    };
    while (state.phase !== 'over') {
      assert.ok(state.asked < 2000, 'the game should end');
      state = playTurn(state, random() < accuracy);
      assert.ok(game.isValidState(state));
    }
    return state;
  }

  it('always finishes with exactly one winner on the goal', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const state = playOut(seed, ['Ada', 'Ben', 'Cem'], 0.7);
      const onGoal = state.players.filter((p) => p.field === BOARD.size);
      assert.equal(onGoal.length, 1);
      assert.equal(state.players[state.winner].field, BOARD.size);
      const answered = state.players.reduce((sum, p) => sum + p.correct + p.wrong, 0);
      assert.equal(answered, state.asked, 'every drawn card was answered once');
    }
  });

  it('takes about 15 to 30 questions for two players', () => {
    const lengths = [];
    for (let seed = 1; seed <= 1000; seed++) lengths.push(playOut(seed, ['Ada', 'Ben'], 0.75).asked);
    lengths.sort((a, b) => a - b);
    const median = lengths[lengths.length / 2];
    const typical = lengths.filter((n) => n >= 10 && n <= 32).length / lengths.length;
    assert.ok(median >= 15 && median <= 25, `median ${median} questions`);
    assert.ok(typical >= 0.8, `only ${Math.round(typical * 100)} % of games take 10 to 32 questions`);
  });

  it('survives a save and reload at every step', () => {
    let state = newGame(['Ada', 'Ben'], 11);
    const reload = (s) => {
      const copy = JSON.parse(JSON.stringify(s));
      assert.ok(game.isValidState(copy), `phase ${s.phase}`);
      return copy;
    };
    for (let i = 0; i < 40 && state.phase !== 'over'; i++) {
      state = reload(game.drawCard(state));
      state = reload(game.answer(state, correctIndex(state)));
      state = reload(game.advance(state));
      if (state.phase === 'event') state = reload(game.advance(state));
    }
    assert.equal(state.phase, 'over');
    reload(state);
  });

  it('rejects saved data it cannot run', () => {
    assert.equal(game.isValidState(null), false);
    assert.equal(game.isValidState({}), false);
    assert.equal(game.isValidState({ ...newGame(), version: 1 }), false, 'a game saved by the old version');
    assert.equal(game.isValidState({ ...newGame(), phase: 'question' }), false);
    assert.equal(game.isValidState({ ...newGame(), phase: 'choose' }), false);
    assert.equal(game.isValidState({ ...newGame(), reader: 2 }), false);
    const alone = newGame();
    alone.players.pop();
    assert.equal(game.isValidState(alone), false);
    const offBoard = newGame();
    offBoard.players[0].field = BOARD.size + 1;
    assert.equal(game.isValidState(offBoard), false);
  });

  it('starts a rematch with the same players, the youngest reading, and the rest of the pile', () => {
    const state = playOut(3, ['Ada', 'Ben'], 0.9);
    const again = game.rematch(state);
    assert.deepEqual(again.players.map((p) => p.name), ['Ada', 'Ben']);
    assert.deepEqual(again.players.map((p) => [p.field, p.correct, p.wrong]), [[1, 0, 0], [1, 0, 0]]);
    assert.equal(again.phase, 'draw');
    assert.equal(again.reader, 0);
    assert.equal(again.asked, 0);
    assert.deepEqual(again.pile, state.pile, 'the pile carries on');
    assert.ok(game.isValidState(again));
  });
});

describe('Leiternspiel: runs straight from disk', () => {
  it('uses no module syntax, which file:// pages cannot load', async () => {
    const scripts = (await readdir(join(gameDir, 'js'))).filter((f) => f.endsWith('.js'));
    assert.ok(scripts.length >= 3);
    for (const file of scripts) {
      const source = await readFile(join(gameDir, 'js', file), 'utf8');
      assert.equal(/^\s*(import|export)\s/m.test(source), false, `${file} uses import/export`);
    }
    const html = await readFile(join(gameDir, 'index.html'), 'utf8');
    assert.equal(/type=["']module["']/.test(html), false, 'index.html loads a module script');
  });

  it('loads nothing from the network', async () => {
    for (const file of ['index.html', 'style.css']) {
      const source = await readFile(join(gameDir, file), 'utf8');
      const remote = source.match(/(?:src|href)=["']https?:|url\(["']?https?:|@import/g);
      assert.equal(remote, null, `${file} loads a remote resource`);
    }
  });

  it('mentions no slides any more', async () => {
    for (const file of ['index.html', 'style.css', 'js/app.js', 'js/content.js', 'js/game.js', 'README.md']) {
      const source = await readFile(join(gameDir, file), 'utf8');
      assert.equal(/Rutsche|\bslides?\b/.test(source), false, `${file} still mentions slides`);
    }
  });
});
