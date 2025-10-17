from __future__ import annotations

import random
from typing import List, Tuple, Iterable, Optional

# Карта кодируется как int [0..51]
# rank: 2..14 (2..A), suit: 0..3 (♠, ♥, ♦, ♣) — порядок не критичен

RANKS = list(range(2, 15))
SUITS = list(range(4))
RANK_TO_CHAR = {10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'}
CHAR_TO_RANK = {v: k for k, v in RANK_TO_CHAR.items()}
for r in range(2, 10):
    CHAR_TO_RANK[str(r)] = r

SUIT_TO_CHAR = {0: 's', 1: 'h', 2: 'd', 3: 'c'}
CHAR_TO_SUIT = {v: k for k, v in SUIT_TO_CHAR.items()}

# Русские отображения для фронтенда
RANK_TO_RU = {11: 'В', 12: 'Д', 13: 'К', 14: 'Т'}
SUIT_TO_SYMBOL = {0: '♠', 1: '♥', 2: '♦', 3: '♣'}


def make_card(rank: int, suit: int) -> int:
    return (rank - 2) * 4 + suit


def card_rank(card: int) -> int:
    return (card // 4) + 2


def card_suit(card: int) -> int:
    return card % 4


def card_to_str(card: int) -> str:
    r = card_rank(card)
    s = card_suit(card)
    rc = RANK_TO_CHAR.get(r, str(r))
    return rc + SUIT_TO_CHAR[s]


def card_to_ru_str(card: int) -> str:
    r = card_rank(card)
    s = card_suit(card)
    rc = RANK_TO_RU.get(r, str(r)) if r != 10 else '10'
    return f"{rc}{SUIT_TO_SYMBOL[s]}"


def str_to_card(s: str) -> int:
    s = s.strip()
    if len(s) != 2:
        raise ValueError('Bad card string')
    rch, sch = s[0].upper(), s[1].lower()
    if rch not in CHAR_TO_RANK or sch not in CHAR_TO_SUIT:
        raise ValueError('Bad card string')
    return make_card(CHAR_TO_RANK[rch], CHAR_TO_SUIT[sch])


def new_deck() -> List[int]:
    return [make_card(r, s) for r in RANKS for s in SUITS]


def shuffled_deck(seed: Optional[int] = None) -> List[int]:
    deck = new_deck()
    rng = random.Random(seed)
    rng.shuffle(deck)
    return deck


def draw(deck: List[int], n: int) -> Tuple[List[int], List[int]]:
    if n < 0 or n > len(deck):
        raise ValueError('draw out of range')
    return deck[:n], deck[n:]


def remove_cards(deck: List[int], cards: Iterable[int]) -> List[int]:
    to_remove = set(cards)
    return [c for c in deck if c not in to_remove]


def serialize_cards(cards: Iterable[int]) -> List[str]:
    return [card_to_str(c) for c in cards]


def serialize_cards_ru(cards: Iterable[int]) -> List[str]:
    return [card_to_ru_str(c) for c in cards]


def deserialize_cards(cards: Iterable[str]) -> List[int]:
    return [str_to_card(x) for x in cards]



