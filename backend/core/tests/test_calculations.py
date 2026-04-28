"""Tests unitaires du module core.services.calculations.

Toutes les fonctions testées ici sont **pures** : aucun test ne touche la DB,
Django n'est pas requis pour les exécuter. Les DTOs sont construits en RAM
avec des `Decimal` (jamais de `float`).
"""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest

from core.services.calculations import (
    CostAllocInput,
    MoneyPair,
    TxnInput,
    allocate_costs_by_surface,
    budget_consumed_by_category,
    budget_remaining,
    cash_position,
    forecast_cash,
    margin_per_unit,
    sum_money_pairs,
)

# IMPORTANT : ces tests sont **purs** (aucun accès DB).
# Pas de `pytest.mark.django_db` : les DTOs sont construits en RAM.

ZERO = Decimal("0")
D = Decimal  # alias court pour les constructions de tests


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _txn(
    *,
    txn_id: int = 1,
    day: date | None = None,
    direction: str = "in",
    blanc: str = "0",
    noir: str = "0",
    category: str = "acquisition",
    project_id: int | None = 1,
) -> TxnInput:
    """Fabrique concise de TxnInput pour les tests."""
    return TxnInput(
        id=txn_id,
        date=day or date(2026, 4, 24),
        direction=direction,  # type: ignore[arg-type]
        blanc=D(blanc),
        noir=D(noir),
        category=category,
        project_id=project_id,
    )


# ---------------------------------------------------------------------------
# MoneyPair
# ---------------------------------------------------------------------------


class TestMoneyPair:
    def test_total_is_sum_of_blanc_and_noir(self) -> None:
        # Arrange
        pair = MoneyPair(blanc=D("100.50"), noir=D("49.50"))
        # Act
        total = pair.total
        # Assert
        assert total == D("150.00")
        assert isinstance(total, Decimal)

    def test_total_is_never_stored(self) -> None:
        # Arrange
        pair = MoneyPair(blanc=D("10"), noir=D("5"))
        # Assert — pas d'attribut `total` dans __dict__, c'est une property
        assert not hasattr(pair, "__dict__") or "total" not in getattr(pair, "__dict__", {})

    def test_is_frozen(self) -> None:
        # Arrange
        pair = MoneyPair(blanc=D("1"), noir=D("1"))
        # Assert — dataclass(frozen=True) → mutation interdite
        with pytest.raises(Exception):  # noqa: B017 — FrozenInstanceError
            pair.blanc = D("2")  # type: ignore[misc]

    def test_rejects_float_input(self) -> None:
        # Assert — garde-fou anti-float
        with pytest.raises(TypeError):
            MoneyPair(blanc=1.0, noir=D("0"))  # type: ignore[arg-type]
        with pytest.raises(TypeError):
            MoneyPair(blanc=D("0"), noir=2.5)  # type: ignore[arg-type]


# ---------------------------------------------------------------------------
# sum_money_pairs
# ---------------------------------------------------------------------------


class TestSumMoneyPairs:
    def test_empty_returns_zero_zero(self) -> None:
        # Act
        result = sum_money_pairs([])
        # Assert
        assert result == MoneyPair(blanc=ZERO, noir=ZERO)
        assert isinstance(result.blanc, Decimal)
        assert isinstance(result.noir, Decimal)

    def test_sums_blanc_and_noir_independently(self) -> None:
        # Arrange
        pairs = [
            MoneyPair(blanc=D("100"), noir=D("50")),
            MoneyPair(blanc=D("200"), noir=D("0")),
            MoneyPair(blanc=D("0"), noir=D("25")),
        ]
        # Act
        result = sum_money_pairs(pairs)
        # Assert
        assert result.blanc == D("300")
        assert result.noir == D("75")
        assert result.total == D("375")

    def test_handles_generator_input(self) -> None:
        # Arrange — Iterable, pas une liste
        pairs_gen = (MoneyPair(blanc=D(str(i)), noir=D("0")) for i in range(4))
        # Act
        result = sum_money_pairs(pairs_gen)
        # Assert
        assert result.blanc == D("6")  # 0+1+2+3


# ---------------------------------------------------------------------------
# cash_position
# ---------------------------------------------------------------------------


class TestCashPosition:
    def test_empty_returns_zero(self) -> None:
        # Act
        result = cash_position([])
        # Assert
        assert result == MoneyPair(blanc=ZERO, noir=ZERO)

    def test_mix_of_in_and_out(self) -> None:
        # Arrange
        txns = [
            _txn(txn_id=1, direction="in", blanc="1000", noir="500"),
            _txn(txn_id=2, direction="out", blanc="300", noir="100"),
            _txn(txn_id=3, direction="in", blanc="200", noir="0"),
        ]
        # Act
        result = cash_position(txns)
        # Assert — blanc: 1000 - 300 + 200 = 900 ; noir: 500 - 100 + 0 = 400
        assert result.blanc == D("900")
        assert result.noir == D("400")
        assert result.total == D("1300")

    def test_only_outflows_is_negative(self) -> None:
        # Arrange
        txns = [
            _txn(txn_id=1, direction="out", blanc="500", noir="200"),
        ]
        # Act
        result = cash_position(txns)
        # Assert
        assert result.blanc == D("-500")
        assert result.noir == D("-200")

    def test_unknown_direction_is_ignored(self) -> None:
        # Arrange — direction hors "in"/"out" ignorée (défensif)
        weird = TxnInput(
            id=99,
            date=date(2026, 4, 24),
            direction="wat",  # type: ignore[arg-type]
            blanc=D("1000"),
            noir=D("1000"),
            category="admin",
            project_id=None,
        )
        # Act
        result = cash_position([weird])
        # Assert
        assert result == MoneyPair(blanc=ZERO, noir=ZERO)


# ---------------------------------------------------------------------------
# budget_consumed_by_category
# ---------------------------------------------------------------------------


class TestBudgetConsumedByCategory:
    def test_filters_by_requested_categories(self) -> None:
        # Arrange
        txns = [
            _txn(txn_id=1, direction="out", blanc="1000", noir="0", category="travaux"),
            _txn(txn_id=2, direction="out", blanc="500", noir="0", category="admin"),
            _txn(
                txn_id=3,
                direction="out",
                blanc="200",
                noir="0",
                category="commercialisation",
            ),
        ]
        # Act — on ne demande que travaux et admin
        result = budget_consumed_by_category(txns, ["travaux", "admin"])
        # Assert
        assert set(result.keys()) == {"travaux", "admin"}
        assert result["travaux"].total == D("1000")
        assert result["admin"].total == D("500")

    def test_ignores_incoming_transactions(self) -> None:
        # Arrange — les "in" ne doivent JAMAIS entrer dans le consumé
        txns = [
            _txn(direction="in", blanc="10000", noir="0", category="travaux"),
            _txn(direction="out", blanc="300", noir="0", category="travaux"),
        ]
        # Act
        result = budget_consumed_by_category(txns, ["travaux"])
        # Assert
        assert result["travaux"] == MoneyPair(blanc=D("300"), noir=ZERO)

    def test_unknown_category_in_txn_is_skipped(self) -> None:
        # Arrange — txn avec catégorie non demandée : ignorée
        txns = [
            _txn(direction="out", blanc="999", noir="0", category="exotic"),
        ]
        # Act
        result = budget_consumed_by_category(txns, ["travaux"])
        # Assert
        assert result["travaux"] == MoneyPair(blanc=ZERO, noir=ZERO)

    def test_returns_zero_pair_for_categories_with_no_match(self) -> None:
        # Act
        result = budget_consumed_by_category([], ["acquisition", "travaux"])
        # Assert — chaque catégorie demandée est présente, à zéro
        assert result == {
            "acquisition": MoneyPair(blanc=ZERO, noir=ZERO),
            "travaux": MoneyPair(blanc=ZERO, noir=ZERO),
        }

    def test_sums_blanc_and_noir_per_category(self) -> None:
        # Arrange
        txns = [
            _txn(direction="out", blanc="100", noir="50", category="travaux"),
            _txn(direction="out", blanc="200", noir="100", category="travaux"),
        ]
        # Act
        result = budget_consumed_by_category(txns, ["travaux"])
        # Assert
        assert result["travaux"].blanc == D("300")
        assert result["travaux"].noir == D("150")


# ---------------------------------------------------------------------------
# budget_remaining
# ---------------------------------------------------------------------------


class TestBudgetRemaining:
    def test_positive_remaining(self) -> None:
        # Arrange
        budget = MoneyPair(blanc=D("10000"), noir=D("5000"))
        consumed = MoneyPair(blanc=D("3000"), noir=D("1000"))
        # Act
        result = budget_remaining(budget, consumed)
        # Assert
        assert result.blanc == D("7000")
        assert result.noir == D("4000")

    def test_can_be_negative_over_budget(self) -> None:
        # Arrange
        budget = MoneyPair(blanc=D("1000"), noir=D("0"))
        consumed = MoneyPair(blanc=D("1500"), noir=D("200"))
        # Act
        result = budget_remaining(budget, consumed)
        # Assert — dépassement autorisé, pas de cap à zéro
        assert result.blanc == D("-500")
        assert result.noir == D("-200")

    def test_exact_match_returns_zero(self) -> None:
        # Arrange
        budget = MoneyPair(blanc=D("100"), noir=D("50"))
        consumed = MoneyPair(blanc=D("100"), noir=D("50"))
        # Act
        result = budget_remaining(budget, consumed)
        # Assert
        assert result == MoneyPair(blanc=ZERO, noir=ZERO)


# ---------------------------------------------------------------------------
# allocate_costs_by_surface
# ---------------------------------------------------------------------------


class TestAllocateCostsBySurface:
    def test_single_unit_gets_full_cost(self) -> None:
        # Arrange
        units = [CostAllocInput(unit_id=1, surface_m2=D("80"))]
        # Act
        result = allocate_costs_by_surface(D("500000"), units)
        # Assert
        assert result == {1: D("500000.00")}

    def test_equal_surfaces_get_equal_costs(self) -> None:
        # Arrange — 3 unités de 50 m² chacune, 300 000 DH total
        units = [
            CostAllocInput(unit_id=1, surface_m2=D("50")),
            CostAllocInput(unit_id=2, surface_m2=D("50")),
            CostAllocInput(unit_id=3, surface_m2=D("50")),
        ]
        # Act
        result = allocate_costs_by_surface(D("300000"), units)
        # Assert — 100 000 DH chacune
        assert result == {1: D("100000.00"), 2: D("100000.00"), 3: D("100000.00")}
        # Invariant fondamental : somme == total
        assert sum(result.values()) == D("300000.00")

    def test_sum_equals_total_with_rounding(self) -> None:
        # Arrange — cas piège : division qui ne tombe pas juste en centimes.
        # 100 DH à répartir sur 3 unités → 33.33 / 33.33 / 33.34 (last absorbs).
        units = [
            CostAllocInput(unit_id=1, surface_m2=D("10")),
            CostAllocInput(unit_id=2, surface_m2=D("10")),
            CostAllocInput(unit_id=3, surface_m2=D("10")),
        ]
        # Act
        result = allocate_costs_by_surface(D("100"), units)
        # Assert — somme STRICTEMENT == total (pas de dérive centime)
        assert sum(result.values()) == D("100.00")
        # 2 premières à 33.33, la dernière absorbe 33.34
        assert result[1] == D("33.33")
        assert result[2] == D("33.33")
        assert result[3] == D("33.34")

    def test_zero_surface_unit_receives_zero(self) -> None:
        # Arrange
        units = [
            CostAllocInput(unit_id=1, surface_m2=D("80")),
            CostAllocInput(unit_id=2, surface_m2=D("0")),
            CostAllocInput(unit_id=3, surface_m2=D("20")),
        ]
        # Act
        result = allocate_costs_by_surface(D("10000"), units)
        # Assert
        assert result[2] == D("0")  # surface nulle → rien
        assert result[1] + result[3] == D("10000.00")
        assert sum(result.values()) == D("10000.00")

    def test_proportional_split(self) -> None:
        # Arrange — 25% vs 75% des surfaces
        units = [
            CostAllocInput(unit_id=1, surface_m2=D("25")),
            CostAllocInput(unit_id=2, surface_m2=D("75")),
        ]
        # Act
        result = allocate_costs_by_surface(D("400000"), units)
        # Assert
        assert result[1] == D("100000.00")
        assert result[2] == D("300000.00")
        assert sum(result.values()) == D("400000.00")

    def test_empty_units_returns_empty_dict(self) -> None:
        # Act
        result = allocate_costs_by_surface(D("100000"), [])
        # Assert
        assert result == {}

    def test_all_zero_surfaces_returns_zeros(self) -> None:
        # Arrange — aucun dénominateur valide
        units = [
            CostAllocInput(unit_id=1, surface_m2=D("0")),
            CostAllocInput(unit_id=2, surface_m2=D("0")),
        ]
        # Act
        result = allocate_costs_by_surface(D("5000"), units)
        # Assert — on ne peut rien répartir, 0 partout (pas d'exception)
        assert result == {1: ZERO, 2: ZERO}

    def test_all_allocations_are_decimal(self) -> None:
        # Arrange
        units = [
            CostAllocInput(unit_id=1, surface_m2=D("33")),
            CostAllocInput(unit_id=2, surface_m2=D("67")),
        ]
        # Act
        result = allocate_costs_by_surface(D("123456.78"), units)
        # Assert — anti-float strict
        for amount in result.values():
            assert isinstance(amount, Decimal)
            assert not isinstance(amount, float)


# ---------------------------------------------------------------------------
# forecast_cash
# ---------------------------------------------------------------------------


class TestForecastCash:
    def test_empty_returns_single_point_at_until(self) -> None:
        # Arrange
        current = MoneyPair(blanc=D("1000"), noir=D("500"))
        until = date(2026, 5, 1)
        # Act — aucun chèque : courbe plate sur un seul point (= until)
        result = forecast_cash(current, [], until)
        # Assert
        assert len(result) == 1
        assert result[0] == (until, current)

    def test_sorted_by_date_ascending(self) -> None:
        # Arrange — chèques dans le désordre d'entrée
        current = MoneyPair(blanc=D("0"), noir=D("0"))
        txns = [
            _txn(day=date(2026, 4, 28), direction="in", blanc="100"),
            _txn(day=date(2026, 4, 25), direction="in", blanc="50"),
            _txn(day=date(2026, 4, 30), direction="out", blanc="30"),
        ]
        # Act
        result = forecast_cash(current, txns, until=date(2026, 4, 30))
        # Assert — tri strict ascendant
        dates_only = [day for day, _ in result]
        assert dates_only == sorted(dates_only)
        assert dates_only[0] == date(2026, 4, 25)
        assert dates_only[-1] == date(2026, 4, 30)

    def test_cumulative_curve(self) -> None:
        # Arrange
        current = MoneyPair(blanc=D("1000"), noir=D("0"))
        txns = [
            _txn(day=date(2026, 5, 1), direction="in", blanc="500"),
            _txn(day=date(2026, 5, 3), direction="out", blanc="200"),
        ]
        # Act
        result = forecast_cash(current, txns, until=date(2026, 5, 3))
        # Assert — on a les 3 jours, valeurs cumulées
        by_date = dict(result)
        assert by_date[date(2026, 5, 1)].blanc == D("1500")  # 1000 + 500
        assert by_date[date(2026, 5, 2)].blanc == D("1500")  # pas d'évt → stable
        assert by_date[date(2026, 5, 3)].blanc == D("1300")  # 1500 - 200

    def test_in_and_out_same_day_are_netted(self) -> None:
        # Arrange — un reçu et un émis le même jour
        current = MoneyPair(blanc=D("100"), noir=D("0"))
        same_day = date(2026, 4, 24)
        txns = [
            _txn(txn_id=1, day=same_day, direction="in", blanc="500"),
            _txn(txn_id=2, day=same_day, direction="out", blanc="200"),
        ]
        # Act
        result = forecast_cash(current, txns, until=same_day)
        # Assert
        assert len(result) == 1
        assert result[0] == (same_day, MoneyPair(blanc=D("400"), noir=ZERO))

    def test_ignores_cheques_beyond_horizon(self) -> None:
        # Arrange
        current = MoneyPair(blanc=D("1000"), noir=D("0"))
        txns = [
            _txn(day=date(2026, 12, 31), direction="in", blanc="99999"),
        ]
        # Act — horizon à fin avril, le chèque de décembre est ignoré
        result = forecast_cash(current, txns, until=date(2026, 4, 30))
        # Assert
        assert len(result) == 1
        assert result[0][1].blanc == D("1000")

    def test_additive_future_cheques(self) -> None:
        # Arrange — plusieurs encaissements entrants successifs
        current = MoneyPair(blanc=D("0"), noir=D("0"))
        txns = [
            _txn(day=date(2026, 5, 1), direction="in", blanc="100"),
            _txn(day=date(2026, 5, 2), direction="in", blanc="100"),
            _txn(day=date(2026, 5, 3), direction="in", blanc="100"),
        ]
        # Act
        result = forecast_cash(current, txns, until=date(2026, 5, 3))
        by_date = dict(result)
        # Assert — cumulatif croissant
        assert by_date[date(2026, 5, 1)].blanc == D("100")
        assert by_date[date(2026, 5, 2)].blanc == D("200")
        assert by_date[date(2026, 5, 3)].blanc == D("300")

    def test_values_are_money_pairs_with_decimal(self) -> None:
        # Arrange
        current = MoneyPair(blanc=D("0"), noir=D("0"))
        txns = [_txn(day=date(2026, 5, 1), direction="in", blanc="1", noir="2")]
        # Act
        result = forecast_cash(current, txns, until=date(2026, 5, 1))
        # Assert — anti-float
        for _day, pair in result:
            assert isinstance(pair, MoneyPair)
            assert isinstance(pair.blanc, Decimal)
            assert isinstance(pair.noir, Decimal)

    def test_ignores_unknown_direction_in_pending(self) -> None:
        # Arrange — chèque avec direction invalide, ignoré proprement
        current = MoneyPair(blanc=D("100"), noir=D("0"))
        weird = TxnInput(
            id=1,
            date=date(2026, 5, 1),
            direction="nope",  # type: ignore[arg-type]
            blanc=D("9999"),
            noir=D("0"),
            category="acquisition",
            project_id=None,
        )
        # Act
        result = forecast_cash(current, [weird], until=date(2026, 5, 1))
        # Assert — le chèque exotique est filtré, cash inchangé
        assert result[-1][1] == current


# ---------------------------------------------------------------------------
# margin_per_unit
# ---------------------------------------------------------------------------


class TestMarginPerUnit:
    def test_positive_margin(self) -> None:
        # Act
        result = margin_per_unit(D("1000000"), D("700000"))
        # Assert
        assert result == D("300000.00")
        assert isinstance(result, Decimal)

    def test_negative_margin_is_allowed(self) -> None:
        # Act — vente à perte possible
        result = margin_per_unit(D("500000"), D("800000"))
        # Assert
        assert result == D("-300000.00")

    def test_zero_margin(self) -> None:
        # Act
        result = margin_per_unit(D("100"), D("100"))
        # Assert
        assert result == D("0.00")

    def test_rejects_float(self) -> None:
        # Assert — garde-fou anti-float
        with pytest.raises(TypeError):
            margin_per_unit(1000.0, D("500"))  # type: ignore[arg-type]
        with pytest.raises(TypeError):
            margin_per_unit(D("1000"), 500.0)  # type: ignore[arg-type]

    def test_rounded_to_two_decimals(self) -> None:
        # Act — 100.005 arrondi half-up → 100.01
        result = margin_per_unit(D("100.005"), D("0"))
        # Assert
        assert result == D("100.01")


# ---------------------------------------------------------------------------
# Garde-fous anti-float (transversal)
# ---------------------------------------------------------------------------


class TestNoFloatEverywhere:
    """Vérifie que TOUTES les sorties monétaires sont des Decimal, pas des float."""

    def test_sum_money_pairs_outputs_decimal(self) -> None:
        result = sum_money_pairs([MoneyPair(blanc=D("1.5"), noir=D("2.5"))])
        assert isinstance(result.blanc, Decimal)
        assert isinstance(result.noir, Decimal)
        assert not isinstance(result.blanc, float)
        assert not isinstance(result.noir, float)

    def test_cash_position_outputs_decimal(self) -> None:
        result = cash_position([_txn(direction="in", blanc="1", noir="2")])
        assert isinstance(result.blanc, Decimal)
        assert isinstance(result.noir, Decimal)

    def test_budget_consumed_outputs_decimal(self) -> None:
        result = budget_consumed_by_category(
            [_txn(direction="out", blanc="1", noir="2", category="travaux")],
            ["travaux"],
        )
        for pair in result.values():
            assert isinstance(pair.blanc, Decimal)
            assert isinstance(pair.noir, Decimal)

    def test_budget_remaining_outputs_decimal(self) -> None:
        result = budget_remaining(
            MoneyPair(blanc=D("10"), noir=D("5")),
            MoneyPair(blanc=D("3"), noir=D("2")),
        )
        assert isinstance(result.blanc, Decimal)
        assert isinstance(result.noir, Decimal)

    def test_allocate_costs_outputs_decimal(self) -> None:
        result = allocate_costs_by_surface(
            D("100"), [CostAllocInput(unit_id=1, surface_m2=D("50"))]
        )
        for value in result.values():
            assert isinstance(value, Decimal)
            assert not isinstance(value, float)

    def test_forecast_cash_outputs_decimal(self) -> None:
        result = forecast_cash(
            MoneyPair(blanc=D("0"), noir=D("0")),
            [],
            until=date(2026, 4, 24),
        )
        for _day, pair in result:
            assert isinstance(pair.blanc, Decimal)
            assert isinstance(pair.noir, Decimal)

    def test_margin_per_unit_outputs_decimal(self) -> None:
        result = margin_per_unit(D("10"), D("5"))
        assert isinstance(result, Decimal)
        assert not isinstance(result, float)


# ---------------------------------------------------------------------------
# Property-like : invariants généraux d'allocate_costs_by_surface
# ---------------------------------------------------------------------------


class TestAllocateCostsInvariants:
    """Invariants qui doivent tenir quelle que soit la configuration."""

    @pytest.mark.parametrize(
        "total,surfaces",
        [
            ("1000", [("10"), ("20"), ("30")]),
            ("999999.99", [("7"), ("13"), ("17"), ("23")]),
            ("0.03", [("1"), ("1"), ("1")]),
            ("7", [("1"), ("1"), ("1")]),
        ],
    )
    def test_sum_always_equals_total(self, total: str, surfaces: list[str]) -> None:
        # Arrange
        units = [
            CostAllocInput(unit_id=i, surface_m2=D(s)) for i, s in enumerate(surfaces, start=1)
        ]
        # Act
        result = allocate_costs_by_surface(D(total), units)
        # Assert — invariant : Σ allocations == total (au centime près, exact)
        assert sum(result.values()) == D(total).quantize(D("0.01"))

    def test_horizon_one_day_in_past_returns_empty_list(self) -> None:
        # Edge case : until < première date d'événement.
        # Ici on teste que la courbe ne panique pas si until est "vide".
        current = MoneyPair(blanc=D("100"), noir=D("0"))
        result = forecast_cash(
            current,
            [_txn(day=date(2026, 5, 10), direction="in", blanc="50")],
            until=date(2026, 5, 10) - timedelta(days=1),
        )
        # Le chèque est hors horizon → au moins un point (le jour until)
        assert len(result) >= 1
        # Et la valeur à until est bien `current` (pas de chèque appliqué)
        assert result[-1][1] == current
