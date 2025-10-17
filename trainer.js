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
    const players = parsePlayers();
    const radiusX = 420; const radiusY = 220; const centerX = seatsEl.clientWidth/2; const centerY = seatsEl.clientHeight/2;
    for (let i = 0; i < players - 1; i++) {
      const angle = (Math.PI * 2) * (i / (players - 1));
      const x = centerX + Math.cos(angle) * radiusX;
      const y = centerY + Math.sin(angle) * radiusY;
      const seat = document.createElement('div');
      seat.className = 'seat';
      seat.style.left = `${x - 100}px`;
      seat.style.top = `${y - 55}px`;
      seat.appendChild(cardNode('?', false));
      seat.appendChild(cardNode('?', false));
      seatsEl.appendChild(seat);
    }
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
  nextStreetBtn.addEventListener('click', async () => {
    const res = await fetch('/api/board', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      boardEl.innerHTML = '';
    for (const c of data.board) boardEl.appendChild(cardNode(c, true));
      oddsResultEl.textContent = `Открыта улица: ${data.state}`;
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


