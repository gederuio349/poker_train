from __future__ import annotations

from typing import Dict, List, Optional
from .cards import shuffled_deck, draw, serialize_cards


def start_round(players: int, seed: Optional[int] = None) -> Dict:
    if players < 2 or players > 9:
        raise ValueError('players must be 2..9')
    deck = shuffled_deck(seed)
    hero, deck = draw(deck, 2)
    # Скрытый борд (пока пуст)
    return {
        'players': players,
        'state': 'preflop',
        'hero': hero,
        'board': [],
        'seed': seed,
        'deck': deck,  # оставшаяся колода в сессии
    }


def next_street(state: Dict) -> Dict:
    deck: List[int] = state['deck']
    board: List[int] = state['board']
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
    return state



