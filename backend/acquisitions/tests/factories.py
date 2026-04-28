"""Factory factory_boy pour `Acquisition`.

Usage :
    from acquisitions.tests.factories import AcquisitionFactory
    a = AcquisitionFactory(owner=user, project=project)
"""
from __future__ import annotations

from decimal import Decimal

import factory
from factory.django import DjangoModelFactory

from acquisitions.models import Acquisition, AcquisitionStage
from core.tests.factories import UserFactory
from projects.tests.factories import ProjectFactory


class AcquisitionFactory(DjangoModelFactory):
    class Meta:
        model = Acquisition

    owner = factory.SubFactory(UserFactory)
    project = factory.SubFactory(
        ProjectFactory,
        owner=factory.SelfAttribute("..owner"),
    )
    title = factory.Sequence(lambda n: f"Terrain Bouskoura {n}")
    stage = AcquisitionStage.OPPORTUNITE
    surface_m2 = Decimal("2800.00")
    asking_price = Decimal("1500000.00")
    negotiated_price = None
    arrhes_amount = None
    option_deadline = None
    seller_name = "M. El Alaoui"
    seller_phone = "+212600000000"
    address = "Bouskoura, Casablanca"
    notes = ""
