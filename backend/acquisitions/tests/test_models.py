"""Tests unitaires du modèle `Acquisition`."""
from __future__ import annotations

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from acquisitions.models import (
    STAGE_ORDER,
    Acquisition,
    AcquisitionStage,
    next_stage,
)
from acquisitions.tests.factories import AcquisitionFactory
from core.tests.factories import UserFactory
from projects.tests.factories import ProjectFactory


class TestNextStage:
    """Tests isolés de la fonction utilitaire `next_stage`."""

    def test_returns_next_in_order(self):
        assert next_stage("opportunite") == "negociation"
        assert next_stage("negociation") == "promis"
        assert next_stage("promis") == "compromis"
        assert next_stage("compromis") == "reserve"
        assert next_stage("reserve") == "achete"

    def test_returns_none_on_terminal(self):
        assert next_stage("achete") is None

    def test_returns_none_on_unknown(self):
        assert next_stage("inconnu") is None

    def test_stage_order_exhaustive(self):
        """Garantit qu'on couvre bien toutes les étapes déclarées."""
        values = {choice.value for choice in AcquisitionStage}
        assert set(STAGE_ORDER) == values
        assert len(STAGE_ORDER) == 6


@pytest.mark.django_db
class TestAcquisitionModel:
    def test_str_contains_title_and_stage(self):
        acq = AcquisitionFactory(title="Terrain Test", stage=AcquisitionStage.PROMIS)
        assert "Terrain Test" in str(acq)
        assert "Promis" in str(acq)

    def test_default_stage_is_opportunite(self):
        user = UserFactory()
        project = ProjectFactory(owner=user)
        acq = Acquisition.objects.create(
            owner=user, project=project, title="Nouveau bien"
        )
        assert acq.stage == AcquisitionStage.OPPORTUNITE

    def test_is_stage_active_true_when_not_achete(self):
        acq = AcquisitionFactory(stage=AcquisitionStage.NEGOCIATION)
        assert acq.is_stage_active is True

    def test_is_stage_active_false_when_achete(self):
        acq = AcquisitionFactory(stage=AcquisitionStage.ACHETE)
        assert acq.is_stage_active is False

    def test_clean_rejects_negative_amount(self):
        user = UserFactory()
        project = ProjectFactory(owner=user)
        acq = Acquisition(
            owner=user,
            project=project,
            title="Négatif",
            asking_price=Decimal("-1.00"),
        )
        with pytest.raises(ValidationError):
            acq.full_clean()

    def test_clean_rejects_project_with_different_owner(self):
        u1 = UserFactory()
        u2 = UserFactory()
        project = ProjectFactory(owner=u2)  # project d'un autre owner
        acq = Acquisition(owner=u1, project=project, title="Cross-owner")
        with pytest.raises(ValidationError) as exc:
            acq.full_clean()
        assert "project" in exc.value.message_dict

    def test_default_ordering_most_recent_first(self):
        user = UserFactory()
        project = ProjectFactory(owner=user)
        a = AcquisitionFactory(owner=user, project=project, title="Premier")
        b = AcquisitionFactory(owner=user, project=project, title="Deuxième")
        c = AcquisitionFactory(owner=user, project=project, title="Troisième")

        titles = list(
            Acquisition.objects.filter(owner=user).values_list("title", flat=True)
        )
        assert titles == [c.title, b.title, a.title]
