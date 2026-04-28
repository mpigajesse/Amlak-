"""Factory factory_boy pour `Supplier`.

Usage :
    from suppliers.tests.factories import SupplierFactory
    s = SupplierFactory(owner=user)
"""
from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from core.tests.factories import UserFactory
from suppliers.models import Supplier, SupplierCategory


class SupplierFactory(DjangoModelFactory):
    class Meta:
        model = Supplier

    owner = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Fournisseur {n}")
    category = SupplierCategory.GROS_OEUVRE
    phone = factory.Sequence(lambda n: f"+2126612345{n:02d}")
    email = factory.LazyAttribute(lambda obj: f"contact{obj.name}@exemple.ma".replace(" ", ""))
    ice = ""
    address = ""
    notes = ""
    is_active = True
