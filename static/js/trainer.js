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

// Элементы модального окна
const modal = document.getElementById('showdown-modal');
const modalBody = document.getElementById('modal-body');
const closeModalBtn = document.getElementById('close-modal');

function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

function showModal() {
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function hideModal() {
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

function createCardElement(cardText) {
  const cardEl = document.createElement('div');
  cardEl.className = 'winner-card';
  cardEl.textContent = cardText;
  // Красные масти: ♥ ♦
  if (/[♥♦]/.test(cardText)) cardEl.classList.add('red');
  return cardEl;
}

function renderWinningInfo(winningInfo) {
  modalBody.innerHTML = '';
  
  // Проверяем, победил ли герой
  const heroWon = winningInfo['0'] !== undefined;
  
  // Показываем информацию о победителях
  for (const [playerIndex, info] of Object.entries(winningInfo)) {
    // Пропускаем специальный ключ для проигравшего героя
    if (playerIndex === 'hero_lost') continue;
    
    const winnerDiv = document.createElement('div');
    winnerDiv.className = 'winner-info';
    
    const title = document.createElement('div');
    title.className = 'winner-title';
    title.textContent = playerIndex === '0' ? 'Герой' : `Оппонент ${playerIndex}`;
    
    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'winner-cards';
    
    // Разделяем карты: первые 2 - карты игрока, остальные 5 - карты стола
    const playerCards = info.cards.slice(0, 2);  // Карты игрока
    const boardCardsForPlayer = info.cards.slice(2, 7);   // Карты стола
    
    // Добавляем карты игрока с зеленой подсветкой
    playerCards.forEach(cardText => {
      const cardEl = createCardElement(cardText);
      cardEl.classList.add('player-card');
      cardsDiv.appendChild(cardEl);
    });
    
    // Добавляем разделитель
    const separator = document.createElement('div');
    separator.className = 'winner-cards-separator';
    cardsDiv.appendChild(separator);
    
    // Добавляем карты стола
    boardCardsForPlayer.forEach(cardText => {
      cardsDiv.appendChild(createCardElement(cardText));
    });
    
    const description = document.createElement('div');
    description.className = 'hand-description';
    description.textContent = info.description;
    
    winnerDiv.appendChild(title);
    winnerDiv.appendChild(cardsDiv);
    winnerDiv.appendChild(description);
    modalBody.appendChild(winnerDiv);
  }
  
  // Если герой не победил, показываем его карты с красными границами
  if (!heroWon && winningInfo['hero_lost']) {
    const heroInfo = winningInfo['hero_lost'];
    const heroDiv = document.createElement('div');
    heroDiv.className = 'winner-info';
    
    const heroTitle = document.createElement('div');
    heroTitle.className = 'winner-title';
    heroTitle.textContent = 'Герой (проиграл)';
    
    const heroCardsDiv = document.createElement('div');
    heroCardsDiv.className = 'winner-cards';
    
    // Разделяем карты героя: первые 2 - карты героя, остальные 5 - карты стола
    const heroPlayerCards = heroInfo.cards.slice(0, 2);  // Карты героя
    const heroBoardCards = heroInfo.cards.slice(2, 7);    // Карты стола
    
    // Добавляем карты героя с красными границами
    heroPlayerCards.forEach(cardText => {
      const cardEl = createCardElement(cardText);
      cardEl.classList.add('hero-card');
      heroCardsDiv.appendChild(cardEl);
    });
    
    // Добавляем разделитель
    const heroSeparator = document.createElement('div');
    heroSeparator.className = 'winner-cards-separator';
    heroCardsDiv.appendChild(heroSeparator);
    
    // Добавляем карты стола
    heroBoardCards.forEach(cardText => {
      heroCardsDiv.appendChild(createCardElement(cardText));
    });
    
    const heroDescription = document.createElement('div');
    heroDescription.className = 'hand-description';
    heroDescription.textContent = heroInfo.description;
    
    heroDiv.appendChild(heroTitle);
    heroDiv.appendChild(heroCardsDiv);
    heroDiv.appendChild(heroDescription);
    modalBody.appendChild(heroDiv);
  }
}

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
  console.log('setControls called with beforeGuess:', beforeGuess, 'isRiver:', isRiver);
  submitGuessBtn.style.display = beforeGuess ? '' : 'none';
  restartBtn.style.display = '';
  showOddsBtn.style.display = beforeGuess ? 'none' : '';
  // Кнопка "Следующая улица" не показывается на ривере
  nextStreetBtn.style.display = (beforeGuess || isRiver) ? 'none' : '';
  // Кнопка вскрыться показывается только на ривере И только после ввода оценки
  showdownBtn.style.display = (isRiver && !beforeGuess) ? '' : 'none';
  console.log('showdownBtn display:', showdownBtn.style.display);
  console.log('nextStreetBtn display:', nextStreetBtn.style.display);
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
      // нужно определить, на какой улице мы находимся, чтобы правильно показать кнопку вскрыться
      const currentState = d.state || 'preflop';
      const isRiver = currentState === 'river';
      console.log('Current state:', currentState, 'isRiver:', isRiver);
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
      
      // Показываем модальное окно с детальной информацией о выигрышных комбинациях
      if (data.winning_info) {
        renderWinningInfo(data.winning_info);
        showModal();
      }
      
      // сохранить в статистику результат последней оценки, если была
      try {
        const stats = JSON.parse(localStorage.getItem('pt_last_odds') || '{}');
        const arr = JSON.parse(localStorage.getItem('pt_stats') || '[]');
        arr.push({ players: parsePlayers(), state: 'showdown', guess: stats.guess, win: stats.win, ts: Date.now() });
        localStorage.setItem('pt_stats', JSON.stringify(arr));
      } catch {}
    }
  });
  // Обработчики модального окна
  closeModalBtn.addEventListener('click', hideModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });
  
  // Закрытие модального окна по Escape
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.style.display === 'flex') {
      hideModal();
    }
    // Клавиатурные шорткаты +/-
    if (e.key === 'ArrowRight') incBtn.click();
    if (e.key === 'ArrowLeft') decBtn.click();
  });
});


