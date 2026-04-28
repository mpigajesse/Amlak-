"""Tests unitaires pour le modèle `StockUnit`.

Couvre :
- Création + defaults
- `margin_previsionnelle` (avec et sans prix négocié)
- Contraintes DB (unique label/project/owner, montants non négatifs)
- `clean()` cross-fields
"""
from __future__ import annotations

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from acquisitions.tests.factories import AcquisitionFactory
from core.tests.factories import UserFactory
from projects.tests.factories import ProjectFactory
from units.models import StockUnit, UnitStage, UnitType
from units.tests.factories import StockUnitFactory


@pytest.mark.django_db
class TestStockUnitCreation:
    def test_create_defaults(self):
        unit = StockUnitFactory()
        assert unit.stage == UnitStage.STOCK
        assert unit.unit_type == UnitType.APPARTEMENT
        assert unit.allocated_cost == Decimal("0")
        assert unit.price_negotiated is None
        assert unit.reserved_at is None
        assert unit.compromis_at is None
        assert unit.encaisse_at is None


@pytest.mark.django_db
class TestStockUnitMargin:
    def test_margin_uses_asked_when_no_negotiated(self):
        unit = StockUnitFactory(
            price_asked=Decimal("780000.00"),
            price_negotiated=None,
            allocated_cost=Decimal("500000.00"),
        )
        assert unit.margin_previsionnelle == Decimal("280000.00")

    def test_margin_uses_negotiated_when_set(self):
        unit = StockUnitFactory(
            price_asked=Decimal("780000.00"),
            price_negotiated=Decimal("760000.00"),
            allocated_cost=Decimal("500000.00"),
        )
        assert unit.margin_previsionnelle == Decimal("260000.00")

    def test_margin_negative_allowed(self):
        """Marge peut être négative (vente à perte)."""
        unit = StockUnitFactory(
            price_asked=Decimal("400000.00"),
            allocated_cost=Decimal("500000.00"),
        )
        assert unit.margin_previsionnelle == Decimal("-100000.00")


@pytest.mark.django_db
class TestStockUnitConstraints:
    def test_unique_label_per_owner_project(self):
        user = UserFactory()
        project = ProjectFactory(owner=user)
        StockUnitFactory(owner=user, project=project, label="A1-01")

        with pytest.raises(IntegrityError):
            with transaction.atomic():
                StockUnitFactory(owner=user, project=project, label="A1-01")

    def test_same_label_allowed_in_different_project(self):
        user = UserFactory()
        p1 = ProjectFactory(owner=user)
        p2 = ProjectFactory(owner=user)
        StockUnitFactory(owner=user, project=p1, label="A1-01")
        # Pas d'erreur
        StockUnitFactory(owner=user, project=p2, label="A1-01")

    def test_negative_price_asked_rejected(self):
        user = UserFactory()
        project = ProjectFactory(owner=user)
        with pytest.raises(IntegrityError):
            with transaction.atomic():
                StockUnit.objects.create(
                    owner=user,
                    project=project,
                    label="BAD",
                    unit_type=UnitType.APPARTEMENT,
                    surface_m2=Decimal("50.00"),
                    price_asked=Decimal("-1.00"),
                )


@pytest.mark.django_db
class TestStockUnitClean:
    def test_clean_requires_label(self):
        user = UserFactory()
        project = ProjectFactory(owner=user)
        unit = StockUnit(
            owner=user,
            project=project,
            label="   ",
            unit_type=UnitType.APPARTEMENT,
            surface_m2=Decimal("50.00"),
            price_asked=Decimal("400000.00"),
        )
        with pytest.raises(ValidationError) as excinfo:
            unit.clean()
        assert "label" in excinfo.value.message_dict

    def test_clean_rejects_project_from_other_owner(self):
        u1 = UserFactory()
        u2 = UserFactory()
        project = ProjectFactory(owner=u2)
        unit = StockUnit(
            owner=u1,
            project=project,
            label="X",
            unit_type=UnitType.APPARTEMENT,
            surface_m2=Decimal("50.00"),
            price_asked=Decimal("400000.00"),
        )
        with pytest.raises(ValidationError) as excinfo:
            unit.clean()
        assert "project" in excinfo.value.message_dict

    def test_clean_rejects_acquisition_from_other_project(self):
        user = UserFactory()
        p1 = ProjectFactory(owner=user)
        p2 = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=p2)
        unit = StockUnit(
            owner=user,
            project=p1,
            acquisition=acq,
            label="X",
            unit_type=UnitType.APPARTEMENT,
            surface_m2=Decimal("50.00"),
            price_asked=Decimal("400000.00"),
        )
        with pytest.raises(ValidationError) as excinfo:
            unit.clean()
        assert "acquisition" in excinfo.value.message_dict
