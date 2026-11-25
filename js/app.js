// Wald-Leiternspiel: Anzeige und Bedienung
// Zeichnet Brett, Stapel und Dialoge. Die Regeln stehen in game.js.
(function () {
  'use strict';

  const { content, game } = window.WaldLeiternspiel;
  const { BOARD } = game;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CELL = 100;
  const STORAGE_KEY = 'wald-leiternspiel';
  const STEP_MS = 230;
  const GLIDE_MS = 800;

  // Wo die Figuren im Feld stehen, damit sich vier nicht überdecken
  const SLOTS = [[-20, 0], [20, 0], [-20, 32], [20, 32]];

  const questionsById = new Map(content.QUESTIONS.map((question) => [question.id, question]));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const narrowScreen = window.matchMedia('(max-width: 59.99rem)');
  const $ = (selector) => document.querySelector(selector);


  let state = null;            // Spielstand, null beim Startbildschirm
  let busy = false;            // Figur läuft gerade
  let status = '';             // was zuletzt passiert ist
  let resultDismissed = false; // Ergebnis geschlossen, um das Brett anzusehen
  let shownQuestion = '';      // welche Karte gerade im Dialog steht

  // Hilfsfunktionen für HTML (h) und SVG (s)

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
  const questions = (count) => (count === 1 ? '1 Frage' : `${count} Fragen`);
  const round = (value) => Math.round(value * 10) / 10;

  // Wer liest vor, wer antwortet
  function roles() {
    return { reader: state.reader, answerer: game.answererOf(state) };
  }

  // Brett

  function cellOrigin(field) {
    const { column, row } = game.cellPosition(field);
    return { x: column * CELL, y: (BOARD.rows - 1 - row) * CELL };
  }

  function cellCenter(field) {
    const { x, y } = cellOrigin(field);
    return { x: x + CELL / 2, y: y + CELL / 2 };
  }

  function piecePosition(field, player) {
    const { x, y } = cellCenter(field);
    return { x: x + SLOTS[player][0], y: y + SLOTS[player][1] };
  }

  // Spielfiguren sehen aus wie Wanderweg-Zeichen (Punkt, Kreuz, Raute, Dreieck)

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


  // Laub- und Nadelbaum-Zeichen wie auf einer Wanderkarte
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

  // Leiter leicht schräg zeichnen, rechts von den Feldnummern
  function ladderShape(ladder) {
    const low = cellOrigin(ladder.bottom);
    const high = cellOrigin(ladder.top);
    const a = { x: low.x + 61, y: low.y + 66 };
    const b = { x: high.x + 80, y: high.y + 50 };
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / length;
    const uy = (b.y - a.y) / length;
    const half = 12;
    const point = (along, side) => `${round(a.x + ux * along - uy * side)} ${round(a.y + uy * along + ux * side)}`;

    let d = '';
    for (const side of [-half, half]) d += `M${point(-10, side)}L${point(length + 10, side)}`;
    const rungs = Math.round(length / 26);
    for (let i = 0; i <= rungs; i++) {
      const along = (length * i) / rungs;
      d += `M${point(along, -half)}L${point(along, half)}`;
    }
    return d;
  }

  function ladderNode(ladder) {
    const d = ladderShape(ladder);
    return s('g', {}, s('path', { class: 'leiter__kante', d }), s('path', { class: 'leiter__holz', d }));
  }

  // Pfeil unter der Feldnummer: hoch am unteren Ende, runter am oberen
  function arrowPath(x, y, direction) {
    return direction === 'up' ? `M${x + 20} ${y + 40}l9 15h-18z` : `M${x + 11} ${y + 41}h18l-9 15z`;
  }

  function boardDescription() {
    const list = BOARD.ladders.map(({ bottom, top }) => `${bottom} und ${top}`).join(', ');
    return (
      `Spielbrett mit ${BOARD.size} Feldern. Leitern zwischen den Feldern ${list}. ` +
      'Wer am unteren Ende landet, steigt hinauf. Wer am oberen Ende landet, muss hinunter. ' +
      'Wo die Spieler stehen, steht im Spielstand.'
    );
  }

  function buildBoard() {
    const cells = [];
    const marks = [];

    for (let field = 1; field <= BOARD.size; field++) {
      const { x, y } = cellOrigin(field);
      const { column, row } = game.cellPosition(field);
      const ladder = game.ladderAt(field);
      const isGoal = field === BOARD.size;
      const tone = (column + row) % 2 === 0 ? 'a' : 'b';

      let kind = `feld--${tone}`;
      if (isGoal) kind = 'feld--ziel';
      else if (ladder) kind = ladder.direction === 'up' ? 'feld--unten' : 'feld--oben';

      cells.push(s('rect', { class: `feld ${kind}`, x, y, width: CELL, height: CELL }));
      // oberes Leiterende = kahler Boden, also keine Bäume
      if (!isGoal && !(ladder && ladder.direction === 'down')) {
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
      marks.push(
        s(
          'text',
          { x: x + 9, y: y + 29 },
          s('tspan', { class: `feld__zahl${isGoal ? ' feld__zahl--ziel' : ''}`, text: String(field) }),
          word && s('tspan', { class: `feld__wort${isGoal ? ' feld__wort--ziel' : ''}`, dx: 6, text: word }),
        ),
      );
      if (ladder) marks.push(s('path', { class: 'feld__pfeil', d: arrowPath(x, y, ladder.direction) }));
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
          s('rect', { width: BOARD.columns * CELL, height: BOARD.rows * CELL, rx: 12 }),
        ),
      ),
      s(
        'g',
        { 'clip-path': 'url(#brett-rand)' },
        ...cells,
        ...BOARD.ladders.map((ladder) => ladderNode(ladder)),
        ...marks,
      ),
      s('g', { id: 'pieces' }),
    );
  }

  // Figuren

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
    const active = state && state.phase !== 'over' ? game.answererOf(state) : -1;

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
      piece.classList.toggle('stein--aktiv', player === active);
    }

    // wer antwortet, liegt oben
    if (active >= 0) layer.append(pieceFor(active));
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

  // Rechte Seite: Startbildschirm, Zug, Spielstand

  function selectedCount() {
    const checked = document.querySelector('input[name="count"]:checked');
    return checked ? Number(checked.value) : 2;
  }

  function renderSetup() {
    const count = selectedCount();
    $('#prompts').replaceChildren(
      ...content.AI_PROMPTS.map((entry) =>
        h(
          'li',
          {},
          h('blockquote', { class: 'prompts__text', text: entry.prompt }),
          h('span', { class: 'prompts__zweck', text: entry.purpose }),
        ),
      ),
    );

    for (const row of document.querySelectorAll('.namen__zeile')) {
      row.hidden = Number(row.dataset.player) >= count;
    }
  }

  // "Ada liest vor, Ben antwortet"
  function rolesLine() {
    const { reader, answerer } = roles();
    return [
      h('span', { class: 'rolle' }, markerIcon(reader), h('span', { text: `${state.players[reader].name} liest vor,` })),
      ' ',
      h('span', { class: 'rolle' }, markerIcon(answerer), h('span', { text: `${state.players[answerer].name} antwortet` })),
    ];
  }

  function deckCount() {
    const left = state.pile.length;
    if (left === 0) return 'Alle Karten gespielt: Der Stapel wird neu gemischt.';
    return left === 1 ? 'Noch 1 Karte im Stapel' : `Noch ${left} Karten im Stapel`;
  }

  function renderTurn() {
    const over = state.phase === 'over';

    if (over) {
      const winner = state.players[state.winner];
      $('#turn-title').replaceChildren(
        h('span', { class: 'rolle' }, markerIcon(state.winner), h('span', { text: `Sieg für ${winner.name}!` })),
      );
      $('#turn-hint').textContent = `Ziel erreicht nach ${questions(state.asked)}.`;
    } else {
      const { reader, answerer } = roles();
      const readerName = state.players[reader].name;
      const answererName = state.players[answerer].name;
      $('#turn-title').replaceChildren(...rolesLine());
      $('#turn-hint').textContent =
        `${readerName} zieht eine Karte und liest sie ${answererName} vor. ` +
        `Ist die Antwort richtig, rückt ${answererName} so viele Felder vor, wie Punkte auf der Karte stehen.`;
      $('#deck-count').textContent = deckCount();
    }

    const draw = $('#btn-draw');
    draw.hidden = over;
    draw.disabled = busy || state.phase !== 'draw';
    $('#over-actions').hidden = !over;
    $('#status').textContent = status;
  }

  function standingRow(player, index, current) {
    const asked = player.correct + player.wrong;
    let role = null;
    if (current) {
      if (index === current.reader) role = h('span', { class: 'stand__rolle', text: 'liest vor' });
      if (index === current.answerer) role = h('span', { class: 'stand__rolle stand__rolle--antwortet', text: 'antwortet' });
    }
    return h(
      'li',
      { class: 'stand__zeile', 'aria-current': current && index === current.answerer ? 'true' : null },
      markerIcon(index),
      h('span', { class: 'stand__name' }, h('span', { text: player.name }), role),
      h('span', { class: 'stand__feld', text: player.field === BOARD.size ? 'Ziel' : `Feld ${player.field}` }),
      h('span', {
        class: 'stand__quote',
        text: asked === 0 ? 'Noch keine Frage beantwortet' : `${player.correct} von ${asked} richtig`,
      }),
    );
  }

  function renderStandings() {
    const current = state.phase === 'over' ? null : roles();
    $('#standings').replaceChildren(...state.players.map((player, index) => standingRow(player, index, current)));
  }

  // Dialoge

  function setOpen(dialog, open) {
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }

  const CHECK = 'M4 12.5 9.5 18 20 6.5';
  const CROSS = 'M6 6 18 18M18 6 6 18';

  function renderQuestion() {
    const { id, points, order } = state.question;
    const key = `${state.asked}:${id}:${state.phase}`;
    if (key === shownQuestion) return;
    shownQuestion = key;

    const question = questionsById.get(id);
    const revealed = state.phase === 'reveal';
    const { reader, answerer } = roles();
    const readerName = state.players[reader].name;
    const answererName = state.players[answerer].name;

    $('#question-roles').replaceChildren(...rolesLine());
    const hint = $('#question-hint');
    hint.hidden = revealed;
    hint.textContent =
      `${readerName}, lies die Karte laut vor: Frage, Antworten und Punktzahl. ` +
      `${answererName} antwortet. Tippt dann die Antwort von ${answererName} an.`;

    $('#question-topic').textContent = content.TOPIC_LABELS[question.topic];
    $('#question-points').replaceChildren(
      h('span', { class: 'karte__zahl', text: String(points) }),
      h('span', { class: 'karte__einheit', text: points === 1 ? 'Punkt' : 'Punkte' }),
    );
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

    let next = `${answererName} bleibt stehen`;
    if (correct) {
      const { from, landing } = state.move;
      next =
        landing === BOARD.size
          ? `${answererName} zieht ins Ziel`
          : `${answererName} rückt ${fields(landing - from)} vor`;
    }
    $('#btn-continue').textContent = next;
  }

  function eventArt(direction) {
    // kleines Bild: Leiter mit Pfeil
    const ground = s('rect', { class: `ereignis__grund--${direction}`, width: 120, height: 84 });
    const d = 'M36 78 48 6M60 78 72 6M38 66H62M40 54H64M42 42H66M44 30H68M46 18H70';
    const arrow = direction === 'up' ? 'M97 62V20M86 32 97 20 108 32' : 'M97 20V62M86 50 97 62 108 50';
    return [
      ground,
      s('path', { class: 'leiter__kante', d }),
      s('path', { class: 'leiter__holz', d }),
      s('path', { class: 'ereignis__pfeil', d: arrow }),
    ];
  }

  function renderEvent() {
    const { ladder, player } = state.move;
    const event = content.LADDER_EVENTS[ladder.bottom][ladder.direction];
    const up = ladder.direction === 'up';
    const { name } = state.players[player];

    $('#event-art').replaceChildren(...eventArt(ladder.direction));
    $('#event-kind').textContent = up ? 'Leiter hinauf: Das gibt uns der Wald' : 'Leiter hinunter: Das passiert ohne Wald';
    $('#event-title').textContent = event.title;
    $('#event-text').textContent = event.text;
    $('#btn-event').textContent = up
      ? `${name} steigt hinauf auf Feld ${ladder.to}`
      : `${name} muss hinunter auf Feld ${ladder.to}`;
  }

  function renderResult() {
    const winner = state.players[state.winner];
    $('#over-rounds').textContent = `Ziel erreicht nach ${questions(state.asked)}`;
    $('#over-title').textContent = `Sieg für ${winner.name}!`;

    const ranking = state.players
      .map((player, index) => ({ player, index }))
      .sort((a, b) => b.player.field - a.player.field);
    $('#over-standings').replaceChildren(...ranking.map(({ player, index }) => standingRow(player, index, null)));
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
    for (const holder of document.querySelectorAll('[data-goal]')) holder.textContent = String(BOARD.size);

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

  // Alles neu anzeigen

  function render() {
    // solange eine Figur läuft, warten
    if (busy) {
      $('#btn-draw').disabled = true;
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

  // Speichern, damit das Spiel ein Neuladen übersteht

  function save() {
    try {
      if (state) localStorage.setItem(STORAGE_KEY, JSON.stringify({ state, status }));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // z. B. privates Fenster: dann wird nicht gespeichert
    }
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (!saved || !game.isValidState(saved.state)) return;
      // Fragen könnten inzwischen geändert worden sein
      if (!saved.state.cards.every((id) => questionsById.has(id))) return;
      state = saved.state;
      status = typeof saved.status === 'string' ? saved.status : '';
    } catch {
      // nichts Brauchbares gespeichert
    }
  }

  // Was die Spieler tun

  function startGame() {
    const names = [];
    for (let player = 0; player < selectedCount(); player++) names.push($(`#name-${player}`).value);
    state = game.createGame(names, { questions: content.QUESTIONS });
    status = '';
    resultDismissed = false;
    render();
    // am Handy zurück nach oben zum Brett scrollen
    if (narrowScreen.matches) {
      $('.tisch').scrollIntoView({ block: 'start', behavior: reducedMotion.matches ? 'auto' : 'smooth' });
    }
  }

  function rematch() {
    state = game.rematch(state);
    status = '';
    resultDismissed = false;
    render();
  }

  function backToSetup() {
    if (state) {
      const count = state.players.length;
      $(`#count-${count}`).checked = true;
      state.players.forEach((player, index) => {
        $(`#name-${index}`).value = player.name === `Spieler ${index + 1}` ? '' : player.name;
      });
    }
    state = null;
    status = '';
    resultDismissed = false;
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    render();
  }

  function onDraw() {
    if (busy || !state || state.phase !== 'draw') return;
    state = game.drawCard(state);
    status = '';
    render();
  }

  function onAnswer(shownIndex) {
    if (!state || state.phase !== 'question') return;
    state = game.answer(state, shownIndex);
    render();
    $('#btn-continue').focus();
  }

  // Dialog zu, Figur laufen lassen, dann weiter
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
    const index = game.answererOf(before);
    const player = before.players[index];
    state = game.advance(before);

    if (!before.answer.correct) {
      status = `${player.name}: falsch, bleibt auf Feld ${player.field}.`;
      render();
      return;
    }

    const { from, landing } = before.move;
    status =
      landing === BOARD.size
        ? `${player.name}: richtig, im Ziel!`
        : `${player.name}: richtig, vor auf Feld ${landing}.`;
    moving(() => walk(index, from, landing));
  }

  function onEventContinue() {
    if (busy || !state || state.phase !== 'event') return;
    const before = state;
    const { ladder, player: index } = before.move;
    const { name } = before.players[index];
    state = game.advance(before);
    status =
      ladder.direction === 'up'
        ? `${name}: Leiter hinauf auf Feld ${ladder.to}.`
        : `${name}: Leiter hinunter auf Feld ${ladder.to}.`;
    moving(() => glide(index, ladder.to));
  }

  // Knöpfe verbinden

  function wire() {
    for (const radio of document.querySelectorAll('input[name="count"]')) {
      radio.addEventListener('change', render);
    }
    $('#btn-start').addEventListener('click', startGame);
    $('#names').addEventListener('keydown', (event) => {
      if (event.key === 'Enter') startGame();
    });

    $('#btn-draw').addEventListener('click', onDraw);
    $('#btn-continue').addEventListener('click', onContinue);
    $('#btn-event').addEventListener('click', onEventContinue);

    $('#btn-rules').addEventListener('click', () => $('#dlg-rules').showModal());
    $('#btn-conclusion').addEventListener('click', () => $('#dlg-conclusion').showModal());
    $('#btn-prompts').addEventListener('click', () => $('#dlg-prompts').showModal());
    $('#btn-new').addEventListener('click', () => {
      if (state && state.phase !== 'over') $('#dlg-confirm').showModal();
      else backToSetup();
    });
    $('#btn-confirm-new').addEventListener('click', backToSetup);

    $('#btn-rematch').addEventListener('click', rematch);
    $('#btn-rematch-panel').addEventListener('click', rematch);
    $('#btn-new-players').addEventListener('click', backToSetup);
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

    // Frage und Leiter kann man nicht mit Escape überspringen
    for (const id of ['#dlg-question', '#dlg-event']) {
      $(id).addEventListener('cancel', (event) => event.preventDefault());
      $(id).addEventListener('close', () => {
        if (!busy) render();
      });
    }

    // Tasten A bis D (oder 1 bis 4) wählen eine Antwort
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
