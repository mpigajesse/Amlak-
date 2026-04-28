"""Factories factory_boy pour l'app `projects`."""

from __future__ import annotations

from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from core.tests.factories import UserFactory
from projects.models import Project


class ProjectFactory(DjangoModelFactory):
    """Crée un Project minimal par défaut.

    Exemples :
        p = ProjectFactory()                         # owner généré
        p = ProjectFactory(owner=user)               # owner explicite
        p = ProjectFactory(stage='actif')
    """

    class Meta:
        model = Project

    owner = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Résidence Atlas {n}")
    location = "Casablanca"
    description = ""
    stage = Project.STAGE_OPPORTUNITE
    budget_acquisition = Decimal("0")
    budget_travaux = Decimal("0")
    budget_admin = Decimal("0")
    budget_commercialisation = Decimal("0")
    cost_allocation_method = Project.COST_ALLOC_SURFACE
