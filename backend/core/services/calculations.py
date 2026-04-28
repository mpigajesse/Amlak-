"""Fonctions pures de calcul financier Amlak.

Toutes les fonctions de ce module sont **pures** :
- Pas d'I/O, pas d'accès DB, pas d'import Django.
- Inputs : DTOs immuables (`@dataclass(frozen=True)`).
- Outputs : `Decimal` ou structures immuables de `Decimal`.
- Jamais de `float` : l'argent est manipulé exclusivement en `Decimal`.

Le module est donc testable sans base de données, et importable depuis un
REPL Python pur (aucune dépendance à Django ou à l'ORM). Les agents models
produiront plus tard des adaptateurs mappant les QuerySets vers ces DTOs.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal, getcontext
from typing import Literal

# Précision Decimal suffisante pour sommes de montants immobiliers
# (14 chiffres avant la virgule, 2 après — cf DecimalField(14,2) côté modèle).
getcontext().prec = 28

# Constantes internes (UPPER_SNAKE_CASE, pas de magic numbers).
ZERO: Decimal = Decimal("0")
TWO_PLACES: Decimal = Decimal("0.01")
HUNDRED: Decimal = Decimal("100")

Direction = Literal["in", "out"]


# ---------------------------------------------------------------------------
# DTOs
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class MoneyPair:
    """Couple (Blanc, Noir) avec total calculé, jamais stocké.

    Attributs :
        blanc: montant officiel (Decimal).
        noir: montant non déclaré (Decimal).

    `total` est une property : il n'est pas stocké, toujours recalculé,
    conformément à la règle non négociable du projet.
    """

    blanc: Decimal
    noir: Decimal

    def __post_init__(self) -> None:
        # Garde-fou anti-float à la construction.
        if not isinstance(self.blanc, Decimal) or not isinstance(self.noir, Decimal):
            raise TypeError("MoneyPair n'accepte que des Decimal (jamais float).")

    @property
    def total(self) -> Decimal:
        """Somme Blanc + Noir (toujours calculée à la volée)."""
        return self.blanc + self.noir


@dataclass(frozen=True)
class TxnInput:
    """DTO pour une transaction (mouvement de cash daté).

    Attributs :
        id: identifiant stable (utile pour tri/debug).
        date: date de valeur du mouvement.
        direction: "in" = entrée, "out" = sortie.
        blanc: part Blanc (Decimal).
        noir: part Noir (Decimal).
        category: catégorie de frais (acquisition / travaux / admin /
            commercialisation / etc.).
        project_id: projet rattaché (None si transaction hors projet).
    """

    id: int
    date: date
    direction: Direction
    blanc: Decimal
    noir: Decimal
    category: str
    project_id: int | None


@dataclass(frozen=True)
class CostAllocInput:
    """DTO pour répartition de coût au prorata des surfaces.

    Attributs :
        unit_id: identifiant de l'unité (clé de retour du dict d'allocation).
        surface_m2: surface en m² (Decimal, peut être 0).
    """

    unit_id: int
    surface_m2: Decimal


# ---------------------------------------------------------------------------
# Helpers internes
# ---------------------------------------------------------------------------


def _quantize_money(value: Decimal) -> Decimal:
    """Arrondit à 2 décimales, half-up (convention comptable)."""
    return value.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


# ---------------------------------------------------------------------------
# Fonctions publiques
# ---------------------------------------------------------------------------


def sum_money_pairs(pairs: Iterable[MoneyPair]) -> MoneyPair:
    """Additionne une collection de MoneyPair.

    Formule : (Σ blanc, Σ noir). Sur collection vide, retourne MoneyPair(0, 0).
    """
    total_blanc: Decimal = ZERO
    total_noir: Decimal = ZERO
    for pair in pairs:
        total_blanc += pair.blanc
        total_noir += pair.noir
    return MoneyPair(blanc=total_blanc, noir=total_noir)


def cash_position(transactions: Iterable[TxnInput]) -> MoneyPair:
    """Position cash nette : Σ entrées − Σ sorties (Blanc et Noir séparés).

    Formule par axe :
        position_blanc = Σ blanc("in") − Σ blanc("out")
        position_noir  = Σ noir("in")  − Σ noir("out")

    Les transactions de direction inconnue sont ignorées (défensif).
    """
    position_blanc: Decimal = ZERO
    position_noir: Decimal = ZERO
    for txn in transactions:
        if txn.direction == "in":
            position_blanc += txn.blanc
            position_noir += txn.noir
        elif txn.direction == "out":
            position_blanc -= txn.blanc
            position_noir -= txn.noir
        # autres directions : ignorer silencieusement (pas d'exception).
    return MoneyPair(blanc=position_blanc, noir=position_noir)


def budget_consumed_by_category(
    transactions: Iterable[TxnInput],
    categories: list[str],
) -> dict[str, MoneyPair]:
    """Budget consommé (sorties uniquement) par catégorie.

    Formule par catégorie c :
        consumed(c) = Σ (blanc + noir) des transactions "out" avec category == c

    Le dictionnaire retourné contient UNE entrée par catégorie demandée,
    même si aucune transaction ne matche (MoneyPair(0, 0)). Les transactions
    dont la catégorie n'est pas dans `categories` sont ignorées.
    Les transactions entrantes ("in") ne sont PAS comptabilisées.
    """
    # Initialisation à zéro pour chaque catégorie demandée (réponse complète).
    accumulator: dict[str, tuple[Decimal, Decimal]] = {cat: (ZERO, ZERO) for cat in categories}
    for txn in transactions:
        if txn.direction != "out":
            continue
        if txn.category not in accumulator:
            continue
        blanc_acc, noir_acc = accumulator[txn.category]
        accumulator[txn.category] = (blanc_acc + txn.blanc, noir_acc + txn.noir)

    return {cat: MoneyPair(blanc=blanc, noir=noir) for cat, (blanc, noir) in accumulator.items()}


def budget_remaining(budget: MoneyPair, consumed: MoneyPair) -> MoneyPair:
    """Budget restant = budget − consommé (peut être négatif en dépassement)."""
    return MoneyPair(
        blanc=budget.blanc - consumed.blanc,
        noir=budget.noir - consumed.noir,
    )


def allocate_costs_by_surface(
    total_cost: Decimal,
    units: Iterable[CostAllocInput],
) -> dict[int, Decimal]:
    """Répartit `total_cost` au prorata des surfaces de chaque unité.

    Formule :
        allocation(u) = total_cost × (surface(u) / Σ surfaces)

    Règles :
    - Surface totale nulle (ou aucune unité) → dict vide.
    - Une surface nulle reçoit 0 DH.
    - Tous les montants sont arrondis à 2 décimales (convention comptable).
    - La somme des allocations est **strictement égale** à `total_cost` :
      la dernière unité non nulle absorbe le reste d'arrondi (sinon la somme
      des centimes arrondis peut dériver de quelques centimes).
    """
    units_list: list[CostAllocInput] = list(units)
    if not units_list:
        return {}

    total_surface: Decimal = sum((u.surface_m2 for u in units_list), start=ZERO)
    if total_surface == ZERO:
        # Cas limite : que des surfaces nulles. On ne peut rien répartir
        # équitablement → 0 DH partout, personne n'absorbe le reste.
        return {u.unit_id: ZERO for u in units_list}

    allocations: dict[int, Decimal] = {}
    # Indice de la dernière unité à surface non nulle : elle absorbera le
    # résidu d'arrondi pour garantir Σ allocations == total_cost.
    last_nonzero_idx: int = -1
    for idx, unit in enumerate(units_list):
        if unit.surface_m2 > ZERO:
            last_nonzero_idx = idx

    running_sum: Decimal = ZERO
    for idx, unit in enumerate(units_list):
        if unit.surface_m2 == ZERO:
            allocations[unit.unit_id] = ZERO
            continue
        if idx == last_nonzero_idx:
            # Dernière unité non nulle → reste exact (anti-dérive d'arrondi).
            allocations[unit.unit_id] = _quantize_money(total_cost - running_sum)
        else:
            share: Decimal = total_cost * (unit.surface_m2 / total_surface)
            quantized: Decimal = _quantize_money(share)
            allocations[unit.unit_id] = quantized
            running_sum += quantized

    return allocations


def forecast_cash(
    current: MoneyPair,
    pending_cheques: Iterable[TxnInput],
    until: date,
) -> list[tuple[date, MoneyPair]]:
    """Courbe cumulée de trésorerie jour par jour jusqu'à `until` (inclus).

    Logique :
    1. Point de départ : `current` (position cash aujourd'hui implicite).
    2. Pour chaque chèque pending dont `date <= until` :
       - direction "in"  → +montant à cette date
       - direction "out" → −montant à cette date
    3. La courbe part de la date la plus ancienne (min des dates de chèques
       dans l'horizon, sinon `until`) et va jusqu'à `until` inclus.
    4. Les montants sont cumulés jour par jour : chaque point = cash à la
       fin du jour.

    Returns:
        Liste de tuples (date, MoneyPair) triés par date croissante. Les
        jours sans événement portent la valeur cumulée du jour précédent.
    """
    # Filtre les chèques dans l'horizon et les regroupe par date.
    deltas_by_date: dict[date, tuple[Decimal, Decimal]] = {}
    for txn in pending_cheques:
        if txn.date > until:
            continue
        sign: int = 1 if txn.direction == "in" else -1 if txn.direction == "out" else 0
        if sign == 0:
            continue
        blanc_delta: Decimal = sign * txn.blanc
        noir_delta: Decimal = sign * txn.noir
        existing_blanc, existing_noir = deltas_by_date.get(txn.date, (ZERO, ZERO))
        deltas_by_date[txn.date] = (
            existing_blanc + blanc_delta,
            existing_noir + noir_delta,
        )

    # Détermination du jour de départ : min des dates d'événements, sinon `until`.
    # Par construction, start_date <= until (on prend min(..., until) ou until),
    # donc la boucle while produit toujours au moins un point.
    if deltas_by_date:
        start_date: date = min(min(deltas_by_date.keys()), until)
    else:
        start_date = until

    curve: list[tuple[date, MoneyPair]] = []
    cumulative_blanc: Decimal = current.blanc
    cumulative_noir: Decimal = current.noir

    current_day: date = start_date
    one_day: timedelta = timedelta(days=1)
    while current_day <= until:
        delta_blanc, delta_noir = deltas_by_date.get(current_day, (ZERO, ZERO))
        cumulative_blanc += delta_blanc
        cumulative_noir += delta_noir
        curve.append((current_day, MoneyPair(blanc=cumulative_blanc, noir=cumulative_noir)))
        current_day += one_day

    return curve


def margin_per_unit(sell_price: Decimal, allocated_cost: Decimal) -> Decimal:
    """Marge unitaire brute = prix de vente − coût imputé.

    Peut être négative (perte). Résultat arrondi à 2 décimales.
    """
    if not isinstance(sell_price, Decimal) or not isinstance(allocated_cost, Decimal):
        raise TypeError("margin_per_unit n'accepte que des Decimal (jamais float).")
    return _quantize_money(sell_price - allocated_cost)
