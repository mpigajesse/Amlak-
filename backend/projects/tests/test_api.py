"""Tests API `/api/v1/projects/` — CRUD scopé par owner.

Conventions :
  - Un user ne voit jamais les données d'un autre → 404 (pas 403) cf security.md.
  - Montants sérialisés en string (cf conventions.md).
"""

from __future__ import annotations

from decimal import Decimal

import pytest

from core.tests.factories import UserFactory
from projects.models import Project
from projects.tests.factories import ProjectFactory

LIST_URL = "/api/v1/projects/"


def _detail_url(pk: int) -> str:
    return f"/api/v1/projects/{pk}/"


@pytest.mark.django_db
class TestProjectListAuth:
    def test_list_requires_auth(self, api_client):
        response = api_client.get(LIST_URL)
        assert response.status_code == 401

    def test_create_requires_auth(self, api_client):
        response = api_client.post(LIST_URL, {"name": "X"}, format="json")
        assert response.status_code == 401


@pytest.mark.django_db
class TestProjectListScope:
    def test_list_filters_by_owner(self, authed_client):
        client, user = authed_client
        other = UserFactory(email="other@amlak.ma")

        ProjectFactory(owner=user, name="Mine A")
        ProjectFactory(owner=user, name="Mine B")
        ProjectFactory(owner=other, name="Theirs")

        response = client.get(LIST_URL)
        assert response.status_code == 200
        results = response.data["results"]
        names = {r["name"] for r in results}
        assert names == {"Mine A", "Mine B"}

    def test_list_returns_pagination_envelope(self, authed_client):
        client, user = authed_client
        ProjectFactory(owner=user)
        response = client.get(LIST_URL)
        assert response.status_code == 200
        assert set(response.data.keys()) >= {"count", "next", "previous", "results"}


@pytest.mark.django_db
class TestProjectCreate:
    def test_create_sets_owner_from_request(self, authed_client):
        client, user = authed_client
        payload = {
            "name": "Nouveau projet",
            "location": "Rabat",
            "budget_acquisition": "100000.00",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201, response.content
        project = Project.objects.get(pk=response.data["id"])
        assert project.owner == user
        assert project.name == "Nouveau projet"

    def test_create_ignores_owner_from_payload(self, authed_client):
        """Même si le client injecte `owner`, c'est request.user qui gagne."""
        client, user = authed_client
        other = UserFactory(email="hack@amlak.ma")
        payload = {"name": "Tentative", "owner": other.pk}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201
        project = Project.objects.get(pk=response.data["id"])
        assert project.owner == user

    def test_create_rejects_empty_name(self, authed_client):
        client, _ = authed_client
        response = client.post(LIST_URL, {"name": "   "}, format="json")
        assert response.status_code == 400
        assert "errors" in response.data
        assert "name" in response.data["errors"]

    def test_create_rejects_negative_budget(self, authed_client):
        client, _ = authed_client
        payload = {"name": "Projet", "budget_travaux": "-100.00"}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "budget_travaux" in response.data["errors"]

    def test_create_rejects_duplicate_name_for_same_owner(self, authed_client):
        client, user = authed_client
        ProjectFactory(owner=user, name="Existe")
        response = client.post(LIST_URL, {"name": "Existe"}, format="json")
        assert response.status_code == 400
        assert "name" in response.data["errors"]


@pytest.mark.django_db
class TestProjectRetrieve:
    def test_retrieve_own_project(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        response = client.get(_detail_url(project.pk))
        assert response.status_code == 200
        assert response.data["id"] == project.pk

    def test_retrieve_foreign_project_returns_404(self, authed_client):
        client, _ = authed_client
        other = UserFactory(email="other@amlak.ma")
        project = ProjectFactory(owner=other)
        response = client.get(_detail_url(project.pk))
        assert response.status_code == 404


@pytest.mark.django_db
class TestProjectUpdate:
    def test_patch_own_project(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user, name="Avant")
        response = client.patch(
            _detail_url(project.pk),
            {"name": "Après"},
            format="json",
        )
        assert response.status_code == 200
        project.refresh_from_db()
        assert project.name == "Après"

    def test_update_foreign_project_returns_404(self, authed_client):
        """Masque l'existence : 404 et pas 403 (cf security.md)."""
        client, _ = authed_client
        other = UserFactory(email="other@amlak.ma")
        project = ProjectFactory(owner=other, name="Leur")
        response = client.patch(
            _detail_url(project.pk),
            {"name": "Hacked"},
            format="json",
        )
        assert response.status_code == 404
        project.refresh_from_db()
        assert project.name == "Leur"


@pytest.mark.django_db
class TestProjectDelete:
    def test_delete_own_project(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        response = client.delete(_detail_url(project.pk))
        assert response.status_code == 204
        assert not Project.objects.filter(pk=project.pk).exists()

    def test_delete_foreign_project_returns_404(self, authed_client):
        client, _ = authed_client
        other = UserFactory(email="other@amlak.ma")
        project = ProjectFactory(owner=other)
        response = client.delete(_detail_url(project.pk))
        assert response.status_code == 404
        assert Project.objects.filter(pk=project.pk).exists()


@pytest.mark.django_db
class TestProjectFilters:
    def test_filter_by_stage(self, authed_client):
        client, user = authed_client
        ProjectFactory(owner=user, name="A", stage=Project.STAGE_ACTIF)
        ProjectFactory(owner=user, name="B", stage=Project.STAGE_OPPORTUNITE)
        ProjectFactory(owner=user, name="C", stage=Project.STAGE_ACTIF)

        response = client.get(LIST_URL, {"stage": "actif"})
        assert response.status_code == 200
        names = {r["name"] for r in response.data["results"]}
        assert names == {"A", "C"}

    def test_search_by_name(self, authed_client):
        client, user = authed_client
        ProjectFactory(owner=user, name="Résidence Atlas")
        ProjectFactory(owner=user, name="Immeuble Centre")
        ProjectFactory(owner=user, name="Lotissement Sud")

        response = client.get(LIST_URL, {"search": "atlas"})
        assert response.status_code == 200
        names = [r["name"] for r in response.data["results"]]
        assert names == ["Résidence Atlas"]

    def test_search_by_location(self, authed_client):
        client, user = authed_client
        ProjectFactory(owner=user, name="Un", location="Casablanca")
        ProjectFactory(owner=user, name="Deux", location="Marrakech")

        response = client.get(LIST_URL, {"search": "marrakech"})
        assert response.status_code == 200
        names = [r["name"] for r in response.data["results"]]
        assert names == ["Deux"]


@pytest.mark.django_db
class TestProjectSerialization:
    def test_amounts_serialized_as_string(self, authed_client):
        """CLAUDE.md : montants en string dans JSON, pas en number."""
        client, user = authed_client
        ProjectFactory(
            owner=user,
            name="Test",
            budget_acquisition=Decimal("100000.00"),
            budget_travaux=Decimal("50000.50"),
            budget_admin=Decimal("0"),
            budget_commercialisation=Decimal("0"),
        )

        # Via la liste (serializer light)
        response = client.get(LIST_URL)
        assert response.status_code == 200
        item = response.data["results"][0]
        assert isinstance(item["budget_total"], str)
        assert item["budget_total"] == "150000.50"

    def test_detail_amounts_serialized_as_string(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(
            owner=user,
            budget_acquisition=Decimal("123.45"),
            budget_travaux=Decimal("67.89"),
        )
        response = client.get(_detail_url(project.pk))
        assert response.status_code == 200
        for field in (
            "budget_acquisition",
            "budget_travaux",
            "budget_admin",
            "budget_commercialisation",
            "budget_total",
        ):
            assert isinstance(response.data[field], str), f"{field} n'est pas sérialisé en string"

    def test_stage_display_present(self, authed_client):
        client, user = authed_client
        ProjectFactory(owner=user, stage=Project.STAGE_ACTIF)
        response = client.get(LIST_URL)
        item = response.data["results"][0]
        assert item["stage"] == "actif"
        assert item["stage_display"] == "Actif"
