"""Services core — fonctions pures de calcul.

Ce package regroupe la logique métier stateless, indépendante de Django/ORM.
Les modules internes n'ont PAS le droit d'importer Django ; ils travaillent
sur des DTOs (`@dataclass(frozen=True)`) alimentés par des adaptateurs en
amont (views, serializers, tâches Celery).
"""

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

__all__ = [
    "CostAllocInput",
    "MoneyPair",
    "TxnInput",
    "allocate_costs_by_surface",
    "budget_consumed_by_category",
    "budget_remaining",
    "cash_position",
    "forecast_cash",
    "margin_per_unit",
    "sum_money_pairs",
]
