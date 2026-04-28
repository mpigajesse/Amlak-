"""Tests du modèle `Project` — validation + propriétés."""

from __future__ import annotations

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction

from core.tests.factories import UserFactory
from projects.models import Project
from projects.tests.factories import ProjectFactory


@pytest.mark.django_db
class TestProjectModel:
    def test_create_minimal_project(self):
        project = ProjectFactory()
        assert project.pk is not None
        assert project.stage == Project.STAGE_OPPORTUNITE
        assert project.budget_total == Decimal("0.00")

    def test_budget_total_sums_all_categories(self):
        project = ProjectFactory(
            budget_acquisition=Decimal("100000.00"),
            budget_travaux=Decimal("50000.50"),
            budget_admin=Decimal("10000.00"),
            budget_commercialisation=Decimal("20000.25"),
        )
        assert project.budget_total == Decimal("180000.75")

    def test_budget_total_is_not_a_stored_field(self):
        """budget_total est calculé, jamais stocké (CLAUDE.md)."""
        field_names = {f.name for f in Project._meta.get_fields()}
        assert "budget_total" not in field_names

    def test_clean_rejects_empty_name(self):
        user = UserFactory()
        project = Project(owner=user, name="   ")
        with pytest.raises(ValidationError) as exc:
            project.full_clean()
        assert "name" in exc.value.error_dict

    def test_clean_rejects_negative_budget(self):
        user = UserFactory()
        project = Project(
            owner=user,
            name="Test",
            budget_travaux=Decimal("-1.00"),
        )
        with pytest.raises(ValidationError) as exc:
            project.full_clean()
        assert "budget_travaux" in exc.value.error_dict

    def test_unique_name_per_owner(self):
        user = UserFactory()
        ProjectFactory(owner=user, name="Résidence Unique")
        with pytest.raises(IntegrityError), transaction.atomic():
            ProjectFactory(owner=user, name="Résidence Unique")

    def test_same_name_allowed_for_different_owners(self):
        u1 = UserFactory(email="owner1@amlak.ma")
        u2 = UserFactory(email="owner2@amlak.ma")
        ProjectFactory(owner=u1, name="Commun")
        # Ne doit pas lever
        ProjectFactory(owner=u2, name="Commun")

    def test_str_returns_name(self):
        project = ProjectFactory(name="Résidence Atlas")
        assert str(project) == "Résidence Atlas"

    def test_ordering_is_recent_first(self):
        ProjectFactory(name="A")
        ProjectFactory(name="B")
        ProjectFactory(name="C")
        names = list(Project.objects.values_list("name", flat=True))
        assert names == ["C", "B", "A"]

    def test_decimal_fields_keep_precision(self):
        project = ProjectFactory(budget_acquisition=Decimal("12345.67"))
        project.refresh_from_db()
        assert project.budget_acquisition == Decimal("12345.67")
        assert isinstance(project.budget_acquisition, Decimal)

    def test_stage_choices(self):
        stages = {v for v, _ in Project.STAGE_CHOICES}
        assert stages == {"opportunite", "actif", "cloture"}

    def test_cost_allocation_choices(self):
        methods = {v for v, _ in Project.COST_ALLOCATION_CHOICES}
        assert methods == {"surface", "egal", "ponderation"}
