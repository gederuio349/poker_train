const heroCardsEl = document.getElementById('hero-cards');
const boardEl = document.getElementById('board');
const seatsEl = document.getElementById('seats');
const guessEl = document.getElementById('guess');
const incBtn = document.getElementById('inc');
const decBtn = document.getElementById('dec');
const showOddsBtn = document.getElementById('show-odds');
const nextStreetBtn = document.getElementById('next-street');
const oddsResultEl = document.getElementById('odds-result');
const showdownBtn = document.getElementById('showdown');
const submitGuessBtn = document.getElementById('submit-guess');
const restartBtn = document.getElementById('restart');

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function cardNode(label = '?', revealed = false) {
  const el = document.createElement('div');
  el.className = 'card' + (revealed ? ' revealed' : '');
  const inner = document.createElement('div');
  inner.className = 'inner';
  const front = document.createElement('div');
  front.className = 'front';
  front.textContent = label;
  // Красные масти: ♥ ♦
  if (/[♥♦]/.test(label)) front.classList.add('red');
  const back = document.createElement('div');
  back.className = 'back';
  inner.appendChild(front);
  inner.appendChild(back);
  el.appendChild(inner);
  return el;
}

function renderInitial() {
  heroCardsEl.innerHTML = '';
  boardEl.innerHTML = '';
  heroCardsEl.appendChild(cardNode('?', false));
  heroCardsEl.appendChild(cardNode('?', false));
}

function setControls(beforeGuess, isRiver) {
  // beforeGuess=true: показываем только ввод, Подтвердить и Новый раунд
  submitGuessBtn.style.display = beforeGuess ? '' : 'none';
  restartBtn.style.display = '';
  showOddsBtn.style.display = beforeGuess ? 'none' : '';
  nextStreetBtn.style.display = beforeGuess ? 'none' : '';
  showdownBtn.style.display = (!beforeGuess && isRiver) ? '' : 'none';
}

async function startRound(players) {
  const res = await fetch('/api/new_round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players })
  });
  if (res.ok) {
    const data = await res.json();
    heroCardsEl.innerHTML = '';
    for (const c of data.hero) heroCardsEl.appendChild(cardNode(c, true));
    boardEl.innerHTML = '';
    for (const c of data.board) boardEl.appendChild(cardNode(c, true));
    // расставим пустые места оппонентов
    seatsEl.innerHTML = '';
    const playersCount = parsePlayers();
    // пометим стол классом для адаптивных размеров карт оппонентов
    const table = document.getElementById('table');
    table.className = `table players-${playersCount}`;

    // Динамические радиусы эллипса на основе размера стола
    const rect = table.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radiusX = Math.max(280, rect.width * 0.46);
    const radiusY = Math.max(170, rect.height * 0.34);

    // Сделаем «запретную дугу» снизу, где находятся карты героя
    const forbiddenCenter = Math.PI / 2; // низ
    const forbiddenArc = Math.PI / 3; // ~60°
    const startAngle = forbiddenCenter + forbiddenArc / 2;
    const endAngle = forbiddenCenter - forbiddenArc / 2 + Math.PI * 2;
    const span = (endAngle - startAngle);

    for (let i = 0; i < playersCount - 1; i++) {
      const t = (i + 0.5) / (playersCount - 1); // немного смещаем чтобы симметричнее
      const angle = startAngle + span * t;
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      const seat = document.createElement('div');
      seat.className = 'seat';
      seat.style.left = `${x}px`;
      seat.style.top = `${y}px`;
      seat.appendChild(cardNode('?', false));
      seat.appendChild(cardNode('?', false));
      seatsEl.appendChild(seat);
    }
    setControls(true, false);
  }
}

async function showOdds() {
  oddsResultEl.textContent = 'Расчёт…';
  const res = await fetch('/api/odds', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  if (res.ok) {
    const data = await res.json();
    oddsResultEl.textContent = `Win ${data.win}% • Tie ${data.tie}% • ~SE ${Math.round(data.se*100)/100} • iters ${data.iters}`;
    try {
      localStorage.setItem('pt_last_odds', JSON.stringify({ win: data.win, tie: data.tie }));
      // фиксируем ввод пользователя
      const guess = Number(guessEl.value);
      const arr = JSON.parse(localStorage.getItem('pt_stats') || '[]');
      arr.push({ players: parsePlayers(), state: 'odds', guess, win: data.win, ts: Date.now() });
      localStorage.setItem('pt_stats', JSON.stringify(arr));
    } catch {}
  } else {
    oddsResultEl.textContent = 'Недоступно.';
  }
}

function parsePlayers() {
  const params = new URLSearchParams(location.search);
  let players = Number(params.get('players') || 5);
  return clamp(players, 2, 9);
}

document.addEventListener('DOMContentLoaded', async () => {
  const players = parsePlayers();
  renderInitial();
  await startRound(players);

  incBtn.addEventListener('click', () => {
    guessEl.value = String(clamp(Number(guessEl.value) + 1, 0, 100));
  });
  decBtn.addEventListener('click', () => {
    guessEl.value = String(clamp(Number(guessEl.value) - 1, 0, 100));
  });
  showOddsBtn.addEventListener('click', showOdds);
  submitGuessBtn.addEventListener('click', async () => {
    const value = Number(guessEl.value);
    const res = await fetch('/api/guess', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
    if (res.ok) {
      const d = await res.json();
      // после ввода шанса показываем проверку и переход
      const isRiver = false; // неизвестно на этой стадии
      setControls(false, isRiver);
    }
  });
  restartBtn.addEventListener('click', async () => {
    oddsResultEl.textContent = '';
    await startRound(parsePlayers());
  });
  nextStreetBtn.addEventListener('click', async () => {
    const res = await fetch('/api/board', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      boardEl.innerHTML = '';
      for (const c of data.board) boardEl.appendChild(cardNode(c, true));
      oddsResultEl.textContent = `Открыта улица: ${data.state}`;
      const isRiver = data.state === 'river';
      // после открытия улицы снова требуется ввод шанса
      setControls(true, isRiver);
    }
  });
  showdownBtn.addEventListener('click', async () => {
    const res = await fetch('/api/showdown', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      boardEl.innerHTML = '';
      for (const c of data.board) boardEl.appendChild(cardNode(c, true));
    // анимировано раскрыть оппонентов
    const seatNodes = Array.from(seatsEl.querySelectorAll('.seat'));
    data.opponents.forEach((hand, idx) => {
      const seat = seatNodes[idx];
      if (!seat) return;
      seat.innerHTML = '';
      setTimeout(() => { seat.appendChild(cardNode(hand[0], true)); }, 150 * idx);
      setTimeout(() => { seat.appendChild(cardNode(hand[1], true)); }, 150 * idx + 150);
    });
    const winText = data.winners.includes(0) ? 'Победа героя' : `Победители: ${data.winners.join(',')}`;
    oddsResultEl.textContent = winText;
      // сохранить в статистику результат последней оценки, если была
      try {
        const stats = JSON.parse(localStorage.getItem('pt_last_odds') || '{}');
        const arr = JSON.parse(localStorage.getItem('pt_stats') || '[]');
        arr.push({ players: parsePlayers(), state: 'showdown', guess: stats.guess, win: stats.win, ts: Date.now() });
        localStorage.setItem('pt_stats', JSON.stringify(arr));
      } catch {}
    }
  });
  // Клавиатурные шорткаты +/-
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') incBtn.click();
    if (e.key === 'ArrowLeft') decBtn.click();
  });
});


