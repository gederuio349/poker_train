from __future__ import annotations

from typing import List, Tuple
from collections import Counter
from .cards import card_rank, card_suit

# Оценка лучшей 5-карточной комбинации из 7 карт.
# Возвращаем кортеж (category, tiebreakers...), где больше — лучше.
# Категории: 8=StraightFlush,7=Four,6=FullHouse,5=Flush,4=Straight,3=Three,2=TwoPair,1=OnePair,0=High


def best5_of7_rank(cards7: List[int]) -> Tuple[int, Tuple[int, ...]]:
    ranks = sorted([card_rank(c) for c in cards7], reverse=True)
    suits = [card_suit(c) for c in cards7]
    rank_counts = Counter(ranks)

    # Флэш
    suit_counts = Counter(suits)
    flush_suit = None
    for s, cnt in suit_counts.items():
        if cnt >= 5:
            flush_suit = s
            break

    # Массив уникальных рангов для стрита (туз может быть как 14, так и 1)
    unique_ranks = sorted(set(ranks), reverse=True)
    if 14 in unique_ranks:
        unique_ranks.append(1)

    def find_straight(run_ranks: List[int]) -> int:
        streak = 1
        for i in range(len(run_ranks) - 1):
            if run_ranks[i] - 1 == run_ranks[i + 1]:
                streak += 1
                if streak >= 5:
                    return run_ranks[i + 1] + 4  # старшая карта стрита
            elif run_ranks[i] != run_ranks[i + 1]:
                streak = 1
        return -1

    straight_high = find_straight(unique_ranks)

    # Стрит-флэш
    if flush_suit is not None:
        flush_cards = sorted([c for c in cards7 if card_suit(c) == flush_suit], key=lambda c: card_rank(c), reverse=True)
        flush_ranks = [card_rank(c) for c in flush_cards]
        fr_unique = sorted(set(flush_ranks), reverse=True)
        if 14 in fr_unique:
            fr_unique.append(1)
        sf_high = find_straight(fr_unique)
        if sf_high != -1:
            return 8, (sf_high,)

    # Каре / Фулл-хаус / Сет / Пары
    # Сгруппируем по частоте и по рангу
    groups = sorted(((cnt, r) for r, cnt in rank_counts.items()), reverse=True)
    # Пример groups: [(3, 14), (2, 10), (2, 9), (1, 8), ...]

    if groups[0][0] == 4:
        # Каре + кикер
        four = groups[0][1]
        kicker = max(r for r in ranks if r != four)
        return 7, (four, kicker)

    if groups[0][0] == 3 and any(g[0] >= 2 for g in groups[1:]):
        # Фулл-хаус: сет + лучшая пара/сет
        trips = groups[0][1]
        pair = max(g[1] for g in groups[1:] if g[0] >= 2)
        return 6, (trips, pair)

    if flush_suit is not None:
        # Флэш: топ-5 по флешу
        top5 = sorted((r for r, s in zip(ranks, suits) if s == flush_suit), reverse=True)[:5]
        return 5, tuple(top5)

    if straight_high != -1:
        return 4, (straight_high,)

    if groups[0][0] == 3:
        # Сет + два кикера
        trips = groups[0][1]
        kickers = [r for r in ranks if r != trips][:2]
        return 3, (trips, *kickers)

    if groups[0][0] == 2 and any(g[0] == 2 for g in groups[1:]):
        # Две пары + кикер
        pairs = [g[1] for g in groups if g[0] == 2]
        top2 = sorted(pairs, reverse=True)[:2]
        kicker = max(r for r in ranks if r not in top2)
        return 2, (top2[0], top2[1], kicker)

    if groups[0][0] == 2:
        # Пара + три кикера
        pair = groups[0][1]
        kickers = [r for r in ranks if r != pair][:3]
        return 1, (pair, *kickers)

    # Старшая карта: топ-5
    return 0, tuple(ranks[:5])


def get_hand_description(rank_tuple):
    """Возвращает описание покерной руки на русском языке"""
    category = rank_tuple[0]
    descriptions = {
        8: "Стрит-флеш",
        7: "Каре", 
        6: "Фулл-хаус",
        5: "Флеш",
        4: "Стрит",
        3: "Тройка",
        2: "Две пары",
        1: "Пара",
        0: "Старшая карта"
    }
    return descriptions.get(category, "Неизвестная комбинация")