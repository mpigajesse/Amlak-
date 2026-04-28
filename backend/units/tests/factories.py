"""Factories factory_boy pour l'app `units`.

Usage :
    from units.tests.factories import StockUnitFactory
    u = StockUnitFactory(owner=user, project=project)
"""
from __future__ import annotations

from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from core.tests.factories import UserFactory
from projects.tests.factories import ProjectFactory
from units.models import StockUnit, UnitStage, UnitType


class StockUnitFactory(DjangoModelFactory):
    class Meta:
        model = StockUnit

    owner = factory.SubFactory(UserFactory)
    project = factory.SubFactory(
        ProjectFactory,
        owner=factory.SelfAttribute("..owner"),
    )
    acquisition = None
    label = factory.Sequence(lambda n: f"A1-{n:02d}")
    unit_type = UnitType.APPARTEMENT
    surface_m2 = Decimal("78.00")
    price_asked = Decimal("780000.00")
    price_negotiated = None
    stage = UnitStage.STOCK
    buyer_name = ""
    buyer_phone = ""
    allocated_cost = Decimal("0")
    notes = ""
