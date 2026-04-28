"""Factories pour Cheque."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from cheques.models import Cheque
from core.tests.factories import UserFactory


class ChequeFactory(DjangoModelFactory):
    class Meta:
        model = Cheque

    owner = factory.SubFactory(UserFactory)
    direction = Cheque.Direction.OUT
    kind = Cheque.Kind.NORMAL
    number = factory.Sequence(lambda n: f"{10_000_000 + n}")
    bank = "bmce"
    amount = Decimal("1000.00")
    amount_blanc = Decimal("1000.00")
    amount_noir = Decimal("0.00")
    party_name = factory.Faker("name", locale="fr_FR")
    due_date = factory.LazyFunction(lambda: date.today() + timedelta(days=30))
    status = Cheque.Status.PENDING
