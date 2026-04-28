"""Factories pour Transaction."""
from __future__ import annotations

from datetime import date
from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from core.tests.factories import UserFactory
from transactions.models import Transaction


class TransactionFactory(DjangoModelFactory):
    class Meta:
        model = Transaction

    owner = factory.SubFactory(UserFactory)
    date = factory.LazyFunction(date.today)
    direction = Transaction.Direction.OUT
    payment_mode = Transaction.PaymentMode.ESPECE
    amount_blanc = Decimal("1000.00")
    amount_noir = Decimal("0.00")
    category = Transaction.Category.TRAVAUX
    subcategory = ""
