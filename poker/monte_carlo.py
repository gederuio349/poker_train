from __future__ import annotations

import random
from typing import List, Tuple, Optional
from .cards import new_deck, remove_cards
from .hand_rank import best5_of7_rank


def simulate_equity(players: int, hero: List[int], board: List[int], max_error: float = 0.005,
                    max_iters: int = 200000, seed: Optional[int] = None) -> Tuple[float, float, float, float, int]:
    if players < 2 or players > 9:
        raise ValueError('players must be 2..9')
    if len(hero) != 2:
        raise ValueError('hero must have 2 cards')
    if len(board) not in (0, 3, 4, 5):
        raise ValueError('board length must be 0/3/4/5')

    rng = random.Random(seed)

    # Известные карты - только карты героя и борда
    # Карты оппонентов НЕ известны и должны быть случайными
    known = list(hero) + list(board)
    total = 0
    wins = 0
    ties = 0

    # z-score ~1.96 (95%) не применяем напрямую; берём простую оценку se = sqrt(p*(1-p)/n)
    check_every = 20000

    while total < max_iters:
        # Убираем из колоды только известные карты (герой + борд)
        # Карты оппонентов остаются в колоде для случайной раздачи
        deck = remove_cards(new_deck(), known)
        rng.shuffle(deck)

        # Раздаём нераскрытые борд-карты
        board_fill = 5 - len(board)
        filled_board = list(board)
        if board_fill > 0:
            filled_board.extend(deck[:board_fill])
            del deck[:board_fill]

        # Раздаём соперникам по 2 карты из оставшейся колоды
        # Карты оппонентов случайные - мы их не знаем!
        opp_hands = []
        for _ in range(players - 1):
            opp_hands.append([deck[0], deck[1]])
            del deck[:2]

        # Оценка рук
        hero_rank = best5_of7_rank(hero + filled_board)
        # Сравниваем ТОЛЬКО с оппонентами
        max_opp = None
        max_opp_count = 0
        for opp in opp_hands:
            r = best5_of7_rank(opp + filled_board)
            if (max_opp is None) or (r > max_opp):
                max_opp = r
                max_opp_count = 1
            elif r == max_opp:
                max_opp_count += 1

        total += 1
        if (max_opp is None) or (hero_rank > max_opp):
            wins += 1
        elif hero_rank == max_opp:
            # Ничья между героем и max_opp_count оппонентами
            ties += 1

        if total % check_every == 0:
            p = wins / total
            se = (p * (1 - p) / total) ** 0.5
            if se <= max_error:
                lose = 1 - p - (ties / total)
                return p, ties / total, lose, se, total

    p = wins / total if total else 0.0
    se = (p * (1 - p) / total) ** 0.5 if total else 0.0
    tie_p = ties / total if total else 0.0
    lose = 1 - p - tie_p if total else 0.0
    return p, tie_p, lose, se, total



