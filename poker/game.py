from __future__ import annotations

from typing import Dict, List, Optional
from .cards import shuffled_deck, draw


def start_round(players: int, seed: Optional[int] = None) -> Dict:
    if players < 2 or players > 9:
        raise ValueError('players must be 2..9')
    deck = shuffled_deck(seed)
    # Герой
    hero, deck = draw(deck, 2)
    # Оппоненты фиксируются на весь раунд
    opponents: List[List[int]] = []
    for _ in range(players - 1):
        hand, deck = draw(deck, 2)
        opponents.append(hand)
    # Скрытый борд (пока пуст)
    return {
        'players': players,
        'state': 'preflop',
        'hero': hero,
        'board': [],
        'seed': seed,
        'deck': deck,  # оставшаяся колода в сессии
        'opponents': opponents,  # фиксированные руки оппонентов
        'guess_submitted': False,  # пользователь должен ввести шанс перед переходом
    }


def next_street(state: Dict) -> Dict:
    deck: List[int] = state['deck']
    board: List[int] = state['board']
    # Запрет перехода без ввода угадывания на текущей улице
    if not state.get('guess_submitted', False):
        raise ValueError('guess_required_before_next_street')
    if state['state'] == 'preflop':
        # Флоп: 3 карты
        cards, deck = draw(deck, 3)
        board.extend(cards)
        state['state'] = 'flop'
    elif state['state'] == 'flop':
        # Тёрн: 1 карта
        cards, deck = draw(deck, 1)
        board.extend(cards)
        state['state'] = 'turn'
    elif state['state'] == 'turn':
        # Ривер: 1 карта
        cards, deck = draw(deck, 1)
        board.extend(cards)
        state['state'] = 'river'
    else:
        raise ValueError('No more streets')
    state['deck'] = deck
    state['board'] = board
    # После перехода требуем новый ввод угадывания
    state['guess_submitted'] = False
    return state


def submit_guess(state: Dict, value: float) -> Dict:
    # Сохраняем последнюю оценку пользователя для текущей улицы
    guesses = state.get('guesses', {})
    street = state.get('state', 'preflop')
    try:
        v = float(value)
    except Exception:
        v = None
    if v is not None:
        guesses[street] = v
        state['guesses'] = guesses
    # Разрешаем переход на следующую улицу
    state['guess_submitted'] = True
    return state



