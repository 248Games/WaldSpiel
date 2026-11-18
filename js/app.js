/**
 * Wald-Leiternspiel – the interface.
 *
 * Draws the board, deals the cards, asks the questions and moves the pieces.
 * All rules live in game.js; this file only turns a game state into what is on
 * screen and turns clicks into the next state.
 */
(function () {
  'use strict';

  const { content, game } = window.WaldLeiternspiel;
  const { BOARD } = game;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CELL = 100;
  const STORAGE_KEY = 'wald-leiternspiel';
  const STEP_MS = 230;
  const GLIDE_MS = 800;

  /** Where each player's piece sits inside a cell, so four pieces never overlap. */
  const SLOTS = [[-20, 0], [20, 0], [-20, 32], [20, 32]];

  const questionsById = new Map(content.QUESTIONS.map((question) => [question.id, question]));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrowScreen = window.matchMedia('(max-width: 59.99rem)');
  const $ = (selector) => document.querySelector(selector);

  // ── What the interface remembers ──────────────────────────────────────────

  let state = null;           // the game; null while the teams are being chosen
  let busy = false;           // a piece is on the move, input waits
  let status = '';            // one sentence about what just happened
  let resultDismissed = false; // the result dialog was closed to look at the board
  let shownQuestion = '';     // which question and phase the dialog currently shows
  let shownOffer = '';        // which hand of cards the panel currently shows

  // ── Small builders ────────────────────────────────────────────────────────

  function build(create, tag, props, children) {
    const node = create(tag);
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'text') node.textContent = value;
      else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? '' : value);
    }
    node.append(...children.filter((child) => child != null && child !== false));
    return node;
  }

  const h = (tag, props, ...children) => build((t) => document.createElement(t), tag, props, children);
  const s = (tag, props, ...children) => build((t) => document.createElementNS(SVG_NS, t), tag, props, children);

  const fields = (count) => (count === 1 ? '1 Feld' : `${count} Felder`);
  const round = (value) => Math.round(value * 10) / 10;

  // ── Board geometry ────────────────────────────────────────────────────────

  function cellOrigin(field) {
    const { column, row } = game.cellPosition(field);
    return { x: column * CELL, y: (BOARD.rows - 1 - row) * CELL };
  }

  function cellCenter(field) {
    const { x, y } = cellOrigin(field);
    return { x: x + CELL / 2, y: y + CELL / 2 };
  }

  /** Where ladders and slides meet a cell: right of centre, clear of its number. */
  function pathAnchor(field) {
    const { x, y } = cellCenter(field);
    return { x: x + 9, y: y + 2 };
  }

  function piecePosition(field, player) {
    const { x, y } = cellCenter(field);
    return { x: x + SLOTS[player][0], y: y + SLOTS[player][1] };
  }

  // ── Trail markers: the playing pieces ─────────────────────────────────────
  // German hiking trails are marked with simple shapes painted on a white
  // plate. Each team gets one, so pieces differ by shape as well as colour.

  function markerSign(player) {
    const cls = `marke__zeichen marke__zeichen--${player}`;
    switch (player) {
      case 0:
        return s('circle', { class: cls, r: 8.5 });
      case 1:
        return s('path', { class: cls, d: 'M-3.6-10.5h7.2v6.9h6.9v7.2h-6.9v6.9h-7.2v-6.9h-6.9v-7.2h6.9z' });
      case 2:
        return s('path', { class: cls, d: 'M0-11.5 9.5 0 0 11.5-9.5 0z' });
      default:
        return s('path', { class: cls, d: 'M0-10.5 11 8.5h-22z' });
    }
  }

  function markerIcon(player) {
    return s(
      'svg',
      { class: 'marke', viewBox: '-17 -17 34 34', 'aria-hidden': 'true' },
      s('rect', { class: 'marke__platte', x: -15, y: -15, width: 30, height: 30, rx: 7 }),
      markerSign(player),
    );
  }

  // ── Drawing the board ─────────────────────────────────────────────────────

  /** Map signatures as on a German topographic map: deciduous and coniferous. */
  function signaturePattern(id, signature) {
    const at = (x, y) => s('path', { class: 'kartenzeichen', d: signature, transform: `translate(${x} ${y})` });
    return s(
      'pattern',
      { id, width: CELL, height: CELL, patternUnits: 'userSpaceOnUse' },
      at(72, 22),
      at(24, 62),
      at(80, 82),
    );
  }

  function ladderShape(from, to) {
    const a = pathAnchor(from);
    const b = pathAnchor(to);
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / length;
    const uy = (b.y - a.y) / length;
    const half = 13;
    const point = (along, side) => `${round(a.x + ux * along - uy * side)} ${round(a.y + uy * along + ux * side)}`;

    let d = '';
    for (const side of [-half, half]) d += `M${point(-10, side)}L${point(length + 10, side)}`;
    const rungs = Math.round(length / 27);
    for (let i = 0; i <= rungs; i++) {
      const along = (length * i) / rungs;
      d += `M${point(along, -half)}L${point(along, half)}`;
    }
    return d;
  }

  function slideShape(from, to) {
    const a = pathAnchor(from);
    const b = pathAnchor(to);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    // Slides run downhill (dy > 0), so this always bows them to the right,
    // away from the field numbers in the cells they cross.
    const bend = Math.min(30, length * 0.15);
    const m = { x: (a.x + b.x) / 2 + (dy / length) * bend, y: (a.y + b.y) / 2 - (dx / length) * bend };

    // Chevrons pointing downhill, so the direction reads without colour.
    let arrows = '';
    for (const t of [0.3, 0.55, 0.8]) {
      const px = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * m.x + t ** 2 * b.x;
      const py = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * m.y + t ** 2 * b.y;
      let tx = 2 * (1 - t) * (m.x - a.x) + 2 * t * (b.x - m.x);
      let ty = 2 * (1 - t) * (m.y - a.y) + 2 * t * (b.y - m.y);
      const tangent = Math.hypot(tx, ty);
      tx /= tangent;
      ty /= tangent;
      const wing = (side) => `${round(px - tx * 3 - ty * 6 * side)} ${round(py - ty * 3 + tx * 6 * side)}`;
      arrows += `M${wing(-1)}L${round(px + tx * 4)} ${round(py + ty * 4)}L${wing(1)}`;
    }

    return { path: `M${a.x} ${a.y}Q${round(m.x)} ${round(m.y)} ${b.x} ${b.y}`, arrows };
  }

  function ladderNode(ladder) {
    const d = ladderShape(ladder.from, ladder.to);
    return s('g', {}, s('path', { class: 'leiter__kante', d }), s('path', { class: 'leiter__holz', d }));
  }

  function slideNode(slide) {
    const { path, arrows } = slideShape(slide.from, slide.to);
    return s(
      'g',
      {},
      s('path', { class: 'rutsche__kante', d: path }),
      s('path', { class: 'rutsche__erde', d: path }),
      s('path', { class: 'rutsche__pfeil', d: arrows }),
    );
  }

  function boardDescription() {
    const list = (items) => items.map(({ from, to }) => `${from} nach ${to}`).join(', ');
    return (
      `Spielbrett mit ${BOARD.size} Feldern. ` +
      `Leitern: ${list(BOARD.ladders)}. Rutschen: ${list(BOARD.slides)}. ` +
      'Wo die Teams stehen, steht im Spielstand.'
    );
  }

  function buildBoard() {
    const cells = [];
    const numbers = [];

    for (let field = 1; field <= BOARD.size; field++) {
      const { x, y } = cellOrigin(field);
      const { column, row } = game.cellPosition(field);
      const special = game.specialAt(field);
      const isGoal = field === BOARD.size;
      const tone = (column + row) % 2 === 0 ? 'a' : 'b';

      let kind = `feld--${tone}`;
      if (isGoal) kind = 'feld--ziel';
      else if (special) kind = special.kind === 'ladder' ? 'feld--leiter' : 'feld--rutsche';

      cells.push(s('rect', { class: `feld ${kind}`, x, y, width: CELL, height: CELL }));
      // A slide starts on bare ground: no forest signature there.
      if (!isGoal && !(special && special.kind === 'slide')) {
        cells.push(
          s('rect', {
            class: 'feld__muster',
            x,
            y,
            width: CELL,
            height: CELL,
            fill: `url(#${tone === 'a' ? 'sig-laub' : 'sig-nadel'})`,
          }),
        );
      }

      const word = field === 1 ? 'Start' : isGoal ? 'Ziel' : null;
      numbers.push(
        s(
          'text',
          { x: x + 9, y: y + 29 },
          s('tspan', { class: `feld__zahl${isGoal ? ' feld__zahl--ziel' : ''}`, text: String(field) }),
          word && s('tspan', { class: `feld__wort${isGoal ? ' feld__wort--ziel' : ''}`, dx: 6, text: word }),
        ),
      );
    }

    const board = $('#board');
    board.setAttribute('viewBox', `0 0 ${BOARD.columns * CELL} ${BOARD.rows * CELL}`);
    board.setAttribute('aria-label', boardDescription());
    board.replaceChildren(
      s(
        'defs',
        {},
        signaturePattern('sig-laub', 'M0-5a4.5 4.5 0 1 0 .01 0M0 4v5'),
        signaturePattern('sig-nadel', 'M0-8 4.5 3h-9zM0 3v5'),
        s(
          'clipPath',
          { id: 'brett-rand' },
          s('rect', { width: BOARD.columns * CELL, height: BOARD.rows * CELL, rx: 22 }),
        ),
      ),
      s(
        'g',
        { 'clip-path': 'url(#brett-rand)' },
        ...cells,
        ...BOARD.slides.map((slide) => slideNode(slide)),
        ...BOARD.ladders.map((ladder) => ladderNode(ladder)),
        ...numbers,
      ),
      s('g', { id: 'targets' }),
      s('g', { id: 'pieces' }),
    );
  }

  // ── Pieces ────────────────────────────────────────────────────────────────

  function place(piece, field) {
    const { x, y } = piecePosition(field, Number(piece.dataset.player));
    piece.style.transform = `translate(${x}px, ${y}px)`;
  }

  function pieceFor(player) {
    return $(`#pieces [data-player="${player}"]`);
  }

  function renderPieces() {
    const layer = $('#pieces');
    const count = state ? state.players.length : selectedCount();

    for (let player = 0; player < game.MAX_PLAYERS; player++) {
      let piece = pieceFor(player);
      if (player >= count) {
        if (piece) piece.remove();
        continue;
      }
      if (!piece) {
        piece = s(
          'g',
          { class: 'stein', 'data-player': player },
          s(
            'g',
            { class: 'stein__koerper' },
            s('rect', { class: 'stein__platte', x: -15, y: -15, width: 30, height: 30, rx: 7 }),
            markerSign(player),
          ),
        );
        layer.append(piece);
      }
      place(piece, state ? state.players[player].field : 1);
      const active = Boolean(state) && state.phase !== 'over' && state.current === player;
      piece.classList.toggle('stein--aktiv', active);
    }

    // Whoever is to move lies on top of a shared cell.
    if (state && state.phase !== 'over') layer.append(pieceFor(state.current));
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 0 : ms));

  async function walk(player, from, to) {
    const piece = pieceFor(player);
    $('#pieces').append(piece);
    for (let field = from + 1; field <= to; field++) {
      place(piece, field);
      await wait(STEP_MS);
    }
  }

  async function glide(player, to) {
    const piece = pieceFor(player);
    $('#pieces').append(piece);
    await wait(250);
    piece.classList.add('stein--gleitet');
    place(piece, to);
    await wait(GLIDE_MS);
    piece.classList.remove('stein--gleitet');
  }

  // ── Where the cards lead ──────────────────────────────────────────────────

  function renderTargets() {
    const layer = $('#targets');
    layer.replaceChildren();
    layer.classList.remove('hat-auswahl');
    if (!state || state.phase !== 'choose' || busy) return;

    const byField = new Map();
    for (const preview of game.previewOffer(state)) {
      if (!byField.has(preview.target)) byField.set(preview.target, []);
      byField.get(preview.target).push(preview);
    }

    for (const [field, previews] of byField) {
      const { x, y } = cellOrigin(field);
      const mark = s(
        'g',
        { class: 'ziel-marke', 'data-levels': previews.map((p) => p.level).join(' ') },
        s('rect', { class: 'ziel-marke__rand', x: x + 5, y: y + 5, width: CELL - 10, height: CELL - 10, rx: 12 }),
      );
      // Several cards can reach the goal at once; the goal needs no label.
      if (field !== BOARD.size) {
        mark.append(
          s('rect', { class: 'ziel-marke__schild', x: x + 55, y: y + 8, width: 38, height: 24, rx: 12 }),
          s('text', { class: 'ziel-marke__text', x: x + 74, y: y + 26, text: `+${previews[0].steps}` }),
        );
      }
      layer.append(mark);
    }
  }

  function highlightTarget(level) {
    const layer = $('#targets');
    layer.classList.toggle('hat-auswahl', Boolean(level));
    for (const mark of layer.children) {
      mark.classList.toggle('ist-aktiv', Boolean(level) && mark.dataset.levels.split(' ').includes(level));
    }
  }

  // ── The panel ─────────────────────────────────────────────────────────────

  function selectedCount() {
    const checked = document.querySelector('input[name="count"]:checked');
    return checked ? Number(checked.value) : 2;
  }

  function renderSetup() {
    const count = selectedCount();
    for (const row of document.querySelectorAll('.namen__zeile')) {
      row.hidden = Number(row.dataset.player) >= count;
    }
  }

  function difficultyPips(level) {
    const filled = game.LEVELS.indexOf(level) + 1;
    return s(
      'svg',
      { class: 'karte__tannen', viewBox: '0 0 44 14', 'aria-hidden': 'true' },
      ...[0, 1, 2].map((i) =>
        s('path', {
          class: `karte__tanne${i < filled ? ' karte__tanne--voll' : ''}`,
          d: `M${6 + i * 15} 1.5 ${11.5 + i * 15} 12.5h-11z`,
        }),
      ),
    );
  }

  function cardNode(preview) {
    const { level, steps, target, reachesGoal, special } = preview;
    return h(
      'button',
      {
        type: 'button',
        class: 'karte',
        'data-level': level,
        onclick: () => onChoose(level),
        onpointerenter: () => highlightTarget(level),
        onpointerleave: () => highlightTarget(null),
        onfocus: () => highlightTarget(level),
        onblur: () => highlightTarget(null),
      },
      h('span', { class: 'karte__stufe' }, difficultyPips(level), h('span', { text: content.LEVEL_LABELS[level] })),
      h(
        'span',
        { class: 'karte__wert' },
        h('span', { class: 'karte__zahl', text: String(steps) }),
        h('span', { class: 'karte__einheit', text: steps === 1 ? 'Feld' : 'Felder' }),
      ),
      h('span', { class: 'karte__ziel', text: reachesGoal ? 'ins Ziel' : `bis Feld ${target}` }),
      special &&
        h(
          'span',
          { class: `karte__sonder karte__sonder--${special.kind}` },
          s(
            'svg',
            { viewBox: '0 0 10 10', 'aria-hidden': 'true' },
            s('path', { d: special.kind === 'ladder' ? 'M5 1.5 9 8.5H1z' : 'M5 8.5 9 1.5H1z' }),
          ),
          h('span', { text: special.kind === 'ladder' ? 'Leiter' : 'Rutsche' }),
          h('span', { class: 'sr-only', text: ` auf Feld ${special.to}` }),
        ),
    );
  }

  function renderTurn() {
    const over = state.phase === 'over';
    const player = state.players[over ? state.winner : state.current];
    const index = over ? state.winner : state.current;

    $('#turn-who').replaceChildren(
      markerIcon(index),
      // Worded so that it fits "Team 1" as well as "Die Eichhörnchen".
      h('span', { text: over ? `Sieg für ${player.name}!` : `Am Zug: ${player.name}` }),
    );
    $('#turn-hint').textContent = over
      ? `Ziel erreicht in ${state.round} ${state.round === 1 ? 'Runde' : 'Runden'}.`
      : 'Wähle eine Fragekarte. Stimmt deine Antwort, rückst du so weit vor.';

    const cards = $('#cards');
    cards.hidden = over;
    $('#over-actions').hidden = !over;

    if (state.phase === 'choose') {
      // Deal a new hand only when it really is one, so a card never changes
      // under a finger that is about to tap it.
      const offer = `${state.round}:${state.current}:${JSON.stringify(state.offer)}`;
      if (offer !== shownOffer) {
        shownOffer = offer;
        cards.replaceChildren(...game.previewOffer(state).map(cardNode));
      }
      for (const card of cards.children) card.disabled = false;
    } else {
      for (const card of cards.children) card.disabled = true;
    }

    $('#status').textContent = status;
  }

  function standingRow(player, index, current) {
    const asked = player.correct + player.wrong;
    return h(
      'li',
      { class: 'stand__zeile', 'aria-current': current ? 'true' : null },
      markerIcon(index),
      h('span', { class: 'stand__name', text: player.name }),
      h('span', { class: 'stand__feld', text: player.field === BOARD.size ? 'Ziel' : `Feld ${player.field}` }),
      h('span', {
        class: 'stand__quote',
        text: asked === 0 ? 'Noch keine Frage' : `${player.correct} von ${asked} richtig`,
      }),
    );
  }

  function renderStandings() {
    $('#standings').replaceChildren(
      ...state.players.map((player, index) =>
        standingRow(player, index, state.phase !== 'over' && index === state.current),
      ),
    );
  }

  // ── Dialogs ───────────────────────────────────────────────────────────────

  function setOpen(dialog, open) {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }

  const CHECK = 'M4 12.5 9.5 18 20 6.5';
  const CROSS = 'M6 6 18 18M18 6 6 18';

  function renderQuestion() {
    const { id, level, steps, order } = state.question;
    const key = `${id}:${state.phase}:${state.current}`;
    if (key === shownQuestion) return;
    shownQuestion = key;

    const question = questionsById.get(id);
    const revealed = state.phase === 'reveal';
    const player = state.players[state.current];

    $('#question-topic').textContent = content.TOPIC_LABELS[question.topic];
    $('#question-worth').textContent = `${content.LEVEL_LABELS[level]} · ${fields(steps)}`;
    $('#question-who').replaceChildren(markerIcon(state.current), h('span', { text: player.name }));
    $('#question-text').textContent = question.question;

    $('#answers').replaceChildren(
      ...order.map((original, shown) => {
        let mood = '';
        let sign = String.fromCharCode(65 + shown);
        if (revealed) {
          if (original === 0) {
            mood = ' antwort--richtig';
            sign = s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, s('path', { d: CHECK }));
          } else if (shown === state.answer.chosen) {
            mood = ' antwort--falsch';
            sign = s('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' }, s('path', { d: CROSS }));
          } else {
            mood = ' antwort--blass';
          }
        }
        return h(
          'button',
          { type: 'button', class: `antwort${mood}`, disabled: revealed, onclick: () => onAnswer(shown) },
          h('span', { class: 'antwort__zeichen' }, sign),
          h('span', { text: question.answers[original] }),
        );
      }),
    );

    const reveal = $('#reveal');
    reveal.hidden = !revealed;
    if (!revealed) return;

    const { correct } = state.answer;
    reveal.className = `aufloesung aufloesung--${correct ? 'richtig' : 'falsch'}`;
    $('#reveal-verdict').textContent = correct ? 'Richtig!' : 'Leider falsch.';
    $('#reveal-text').textContent = correct
      ? question.explanation
      : `Richtig ist: ${question.answers[0]}. ${question.explanation}`;

    let next = 'Stehen bleiben';
    if (correct) {
      const { from, landing } = state.move;
      next = landing === BOARD.size ? 'Ins Ziel ziehen' : `${fields(landing - from)} vorrücken`;
    }
    $('#btn-continue').textContent = next;
  }

  function eventArt(kind) {
    // A small picture of what is about to happen, drawn like the board.
    const ground = s('rect', { class: `ereignis__grund--${kind}`, width: 120, height: 84 });
    if (kind === 'ladder') {
      const d = 'M48 78 60 6M72 78 84 6M50 66H74M52 54H76M54 42H78M56 30H80M58 18H82';
      return [ground, s('path', { class: 'leiter__kante', d }), s('path', { class: 'leiter__holz', d })];
    }
    const d = 'M24 12Q78 22 96 72';
    return [
      ground,
      s('path', { class: 'rutsche__kante', d }),
      s('path', { class: 'rutsche__erde', d }),
      s('path', { class: 'rutsche__pfeil', d: 'M48 14 56 22 46 27M73 35 78 45 67 47M89 58 91 69 80 68' }),
    ];
  }

  function renderEvent() {
    const { special } = state.move;
    const event = content.BOARD_EVENTS[special.from];
    const up = special.kind === 'ladder';

    $('#event-art').replaceChildren(...eventArt(special.kind));
    $('#event-kind').textContent = `${up ? 'Leiter' : 'Rutsche'} von Feld ${special.from} auf Feld ${special.to}`;
    $('#event-title').textContent = event.title;
    $('#event-text').textContent = event.text;
    $('#btn-event').textContent = up
      ? `Hochklettern auf Feld ${special.to}`
      : `Zurückrutschen auf Feld ${special.to}`;
  }

  function renderResult() {
    const winner = state.players[state.winner];
    $('#over-rounds').textContent = `Ziel erreicht in ${state.round} ${state.round === 1 ? 'Runde' : 'Runden'}`;
    $('#over-title').textContent = `Sieg für ${winner.name}!`;

    const ranking = state.players
      .map((player, index) => ({ player, index }))
      .sort((a, b) => b.player.field - a.player.field);
    $('#over-standings').replaceChildren(
      ...ranking.map(({ player, index }) => standingRow(player, index, index === state.winner)),
    );
  }

  function conclusionNode() {
    return [
      h(
        'div',
        { class: 'fazit__gruppen' },
        ...content.CONCLUSION.groups.map((group) =>
          h(
            'div',
            { class: 'fazit__gruppe' },
            h('h4', { class: 'chip', text: content.TOPIC_LABELS[group.topic] }),
            h('ul', {}, ...group.points.map((point) => h('li', { text: point }))),
          ),
        ),
      ),
      h('p', { class: 'fazit__schluss', text: content.CONCLUSION.summary }),
    ];
  }

  function fillStaticContent() {
    $('#research-question').textContent = content.RESEARCH_QUESTION;
    $('#over-conclusion-title').textContent = content.RESEARCH_QUESTION;
    $('#conclusion-title').textContent = content.RESEARCH_QUESTION;

    for (const holder of document.querySelectorAll('[data-conclusion]')) {
      holder.replaceChildren(...conclusionNode());
    }

    $('#sources').replaceChildren(
      ...content.SOURCES.map((source) =>
        h(
          'li',
          {},
          source.url
            ? h('a', { href: source.url, target: '_blank', rel: 'noopener', text: source.label })
            : h('strong', { text: source.label }),
          h('span', { class: 'quellen__detail', text: source.detail }),
        ),
      ),
    );

    for (const row of document.querySelectorAll('.namen__zeile')) {
      row.prepend(markerIcon(Number(row.dataset.player)));
    }
  }

  // ── One render for everything ─────────────────────────────────────────────

  function render() {
    // While a piece travels the screen stays as it is: the cards lock, and
    // the next player's turn only appears once the piece has arrived.
    if (busy) {
      for (const card of $('#cards').children) card.disabled = true;
      renderTargets();
      return;
    }

    const phase = state ? state.phase : 'setup';
    document.body.dataset.phase = phase;

    $('#setup').hidden = Boolean(state);
    $('#turn').hidden = !state;
    $('#standings-section').hidden = !state;

    if (state) {
      renderTurn();
      renderStandings();
    } else {
      renderSetup();
    }

    renderTargets();
    renderPieces();

    const asking = phase === 'question' || phase === 'reveal';
    if (asking) renderQuestion();
    else shownQuestion = '';
    if (phase === 'event') renderEvent();
    if (phase === 'over') renderResult();

    setOpen($('#dlg-question'), asking);
    setOpen($('#dlg-event'), phase === 'event');
    setOpen($('#dlg-over'), phase === 'over' && !resultDismissed);

    save();
  }

  // ── Saving ────────────────────────────────────────────────────────────────
  // A reload in the middle of a lesson should not cost the class its game.

  function save() {
    try {
      if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, status }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private window or blocked storage: the game simply isn't remembered */
    }
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !game.isValidState(saved.state)) return;
      // The questions may have been edited since the game was saved.
      const known = Object.values(saved.state.pool).flat().every((id) => questionsById.has(id));
      if (!known) return;
      state = saved.state;
      status = typeof saved.status === 'string' ? saved.status : '';
    } catch {
      /* nothing usable stored */
    }
  }

  // ── What the players do ───────────────────────────────────────────────────

  function startGame() {
    shownOffer = '';
    const names = [];
    for (let player = 0; player < selectedCount(); player++) names.push($(`#name-${player}`).value);
    state = game.createGame(names, { questions: content.QUESTIONS });
    status = '';
    resultDismissed = false;
    render();
    // On a phone the panel sits below the board: bring both back into view.
    if (narrowScreen.matches) {
      $('.tisch').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  function rematch() {
    shownOffer = '';
    state = game.rematch(state, { questions: content.QUESTIONS });
    status = '';
    resultDismissed = false;
    render();
  }

  function backToSetup() {
    if (state) {
      const count = state.players.length;
      $(`#count-${count}`).checked = true;
      state.players.forEach((player, index) => {
        $(`#name-${index}`).value = player.name === `Team ${index + 1}` ? '' : player.name;
      });
    }
    state = null;
    status = '';
    resultDismissed = false;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    render();
  }

  function onChoose(level) {
    if (busy || !state || state.phase !== 'choose') return;
    state = game.chooseCard(state, level);
    status = '';
    render();
  }

  function onAnswer(shownIndex) {
    if (!state || state.phase !== 'question') return;
    state = game.answer(state, shownIndex);
    render();
    $('#btn-continue').focus();
  }

  /** Close the dialogs, let the piece travel, then show whatever comes next. */
  async function moving(travel) {
    busy = true;
    for (const id of ['#dlg-question', '#dlg-event']) setOpen($(id), false);
    render();
    try {
      await travel();
    } finally {
      busy = false;
    }
    render();
  }

  function onContinue() {
    if (busy || !state || state.phase !== 'reveal') return;
    const before = state;
    const player = before.players[before.current];
    state = game.advance(before);

    if (!before.answer.correct) {
      status = `${player.name}: falsch, weiter auf Feld ${player.field}.`;
      render();
      return;
    }

    const { from, landing } = before.move;
    status =
      landing === BOARD.size
        ? `${player.name}: richtig, im Ziel!`
        : `${player.name}: richtig, vor auf Feld ${landing}.`;
    moving(() => walk(before.current, from, landing));
  }

  function onEventContinue() {
    if (busy || !state || state.phase !== 'event') return;
    const before = state;
    const { special, player: index } = before.move;
    const { name } = before.players[index];
    state = game.advance(before);
    status =
      special.kind === 'ladder'
        ? `${name}: Leiter hoch auf Feld ${special.to}.`
        : `${name}: Rutsche zurück auf Feld ${special.to}.`;
    moving(() => glide(index, special.to));
  }

  // ── Wiring ────────────────────────────────────────────────────────────────

  function wire() {
    for (const radio of document.querySelectorAll('input[name="count"]')) {
      radio.addEventListener('change', render);
    }
    $('#btn-start').addEventListener('click', startGame);
    $('#names').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') startGame();
    });

    $('#btn-continue').addEventListener('click', onContinue);
    $('#btn-event').addEventListener('click', onEventContinue);

    $('#btn-rules').addEventListener('click', () => $('#dlg-rules').showModal());
    $('#btn-conclusion').addEventListener('click', () => $('#dlg-conclusion').showModal());
    $('#btn-new').addEventListener('click', () => {
      if (state && state.phase !== 'over') $('#dlg-confirm').showModal();
      else backToSetup();
    });
    $('#btn-confirm-new').addEventListener('click', backToSetup);

    $('#btn-rematch').addEventListener('click', rematch);
    $('#btn-rematch-panel').addEventListener('click', rematch);
    $('#btn-new-teams').addEventListener('click', backToSetup);
    $('#btn-show-result').addEventListener('click', () => {
      resultDismissed = false;
      render();
    });
    $('#dlg-over').addEventListener('close', () => {
      if (state && state.phase === 'over') resultDismissed = true;
    });

    for (const button of document.querySelectorAll('[data-close]')) {
      button.addEventListener('click', () => button.closest('dialog').close());
    }

    // A question has to be answered and an event acknowledged: Escape must not
    // skip them. If the browser closes the dialog anyway, put it back.
    for (const id of ['#dlg-question', '#dlg-event']) {
      $(id).addEventListener('cancel', (event) => event.preventDefault());
      $(id).addEventListener('close', () => {
        if (!busy) render();
      });
    }

    // A to D (or 1 to 4) answer the open question.
    $('#dlg-question').addEventListener('keydown', (event) => {
      if (!state || state.phase !== 'question' || event.ctrlKey || event.metaKey || event.altKey) return;
      const key = event.key.toLowerCase();
      const index = 'abcd'.includes(key) && key.length === 1 ? 'abcd'.indexOf(key) : '1234'.indexOf(key);
      if (index >= 0 && index < state.question.order.length) {
        event.preventDefault();
        onAnswer(index);
      }
    });
  }

  buildBoard();
  fillStaticContent();
  wire();
  load();
  render();
})();
