"""Tests d'API pour `AcquisitionViewSet`.

Couverture :
- Auth obligatoire
- Scoping par owner (404 sur ressources d'un autre)
- `perform_create` injecte l'owner
- Action `advance-stage` : transitions valides + 422 sur terminal
- Filtres par project / stage
- Montants sérialisés en string
"""
from __future__ import annotations

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from acquisitions.models import Acquisition, AcquisitionStage
from acquisitions.tests.factories import AcquisitionFactory
from core.tests.factories import UserFactory
from projects.tests.factories import ProjectFactory

LIST_URL = "/api/v1/acquisitions/"


def _detail_url(pk: int) -> str:
    return f"/api/v1/acquisitions/{pk}/"


def _advance_url(pk: int) -> str:
    return f"/api/v1/acquisitions/{pk}/advance-stage/"


def _results(response):
    """Retourne la liste des résultats (paginé ou non)."""
    data = response.json()
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


@pytest.mark.django_db
class TestAcquisitionsAuth:
    def test_list_requires_auth(self):
        """GET /api/v1/acquisitions/ sans token → 401."""
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == 401

    def test_create_requires_auth(self):
        client = APIClient()
        response = client.post(LIST_URL, {"title": "X"}, format="json")
        assert response.status_code == 401


@pytest.mark.django_db
class TestAcquisitionsScoping:
    def test_list_scoped_by_owner(self, authed_client):
        client, user = authed_client
        other = UserFactory()

        my_project = ProjectFactory(owner=user, name="Mien")
        other_project = ProjectFactory(owner=other, name="Autre")

        AcquisitionFactory(owner=user, project=my_project, title="Mien A")
        AcquisitionFactory(owner=user, project=my_project, title="Mien B")
        AcquisitionFactory(owner=other, project=other_project, title="Autre X")

        response = client.get(LIST_URL)

        assert response.status_code == 200
        titles = sorted(a["title"] for a in _results(response))
        assert titles == ["Mien A", "Mien B"]

    def test_create_sets_owner(self, authed_client):
        """Le POST ignore un owner fourni et injecte request.user."""
        client, user = authed_client
        other = UserFactory()
        project = ProjectFactory(owner=user)

        payload = {
            "title": "Nouveau terrain",
            "project": project.id,
            "asking_price": "500000.00",
            "owner": other.id,  # doit être ignoré
        }
        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == 201, response.content
        acq = Acquisition.objects.get(title="Nouveau terrain")
        assert acq.owner_id == user.id
        assert acq.project_id == project.id
        assert acq.stage == AcquisitionStage.OPPORTUNITE

    def test_404_foreign(self, authed_client):
        """Détail/update/delete sur ressource d'un autre owner → 404."""
        client, _user = authed_client
        other = UserFactory()
        foreign_project = ProjectFactory(owner=other)
        foreign = AcquisitionFactory(
            owner=other, project=foreign_project, title="Pas à moi"
        )

        assert client.get(_detail_url(foreign.pk)).status_code == 404
        assert (
            client.patch(
                _detail_url(foreign.pk), {"title": "Hack"}, format="json"
            ).status_code
            == 404
        )
        assert client.delete(_detail_url(foreign.pk)).status_code == 404
        assert client.post(_advance_url(foreign.pk)).status_code == 404

    def test_create_with_foreign_project_rejected(self, authed_client):
        """Un POST référant un project d'un autre owner → 400."""
        client, _user = authed_client
        other = UserFactory()
        foreign_project = ProjectFactory(owner=other)

        payload = {"title": "Cross", "project": foreign_project.id}
        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == 400
        assert "project" in response.json().get("errors", {})


@pytest.mark.django_db
class TestAdvanceStage:
    def test_advance_stage_valid(self, authed_client):
        """opportunite → negociation via POST /advance-stage/."""
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(
            owner=user, project=project, stage=AcquisitionStage.OPPORTUNITE
        )

        response = client.post(_advance_url(acq.pk))

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["stage"] == AcquisitionStage.NEGOCIATION.value
        assert data["stage_display"] == "Négociation"
        acq.refresh_from_db()
        assert acq.stage == AcquisitionStage.NEGOCIATION

    def test_advance_stage_full_cycle(self, authed_client):
        """Enchaîne toutes les étapes jusqu'au terminal."""
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(
            owner=user, project=project, stage=AcquisitionStage.OPPORTUNITE
        )

        expected = [
            AcquisitionStage.NEGOCIATION.value,
            AcquisitionStage.PROMIS.value,
            AcquisitionStage.COMPROMIS.value,
            AcquisitionStage.RESERVE.value,
            AcquisitionStage.ACHETE.value,
        ]
        for expected_stage in expected:
            response = client.post(_advance_url(acq.pk))
            assert response.status_code == 200, response.content
            assert response.json()["stage"] == expected_stage

    def test_advance_stage_invalid_transition_422(self, authed_client):
        """Déjà à `achete` → 422."""
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(
            owner=user, project=project, stage=AcquisitionStage.ACHETE
        )

        response = client.post(_advance_url(acq.pk))

        assert response.status_code == 422
        body = response.json()
        assert body.get("code") == "invalid_transition"
        assert "Acheté" in body.get("detail", "")


@pytest.mark.django_db
class TestAcquisitionsFilters:
    def test_filter_by_project_and_stage(self, authed_client):
        client, user = authed_client
        p1 = ProjectFactory(owner=user, name="Projet Un")
        p2 = ProjectFactory(owner=user, name="Projet Deux")

        AcquisitionFactory(
            owner=user, project=p1, title="A1", stage=AcquisitionStage.OPPORTUNITE
        )
        AcquisitionFactory(
            owner=user, project=p1, title="A2", stage=AcquisitionStage.PROMIS
        )
        AcquisitionFactory(
            owner=user, project=p2, title="B1", stage=AcquisitionStage.PROMIS
        )

        # Filter by project
        r = client.get(LIST_URL, {"project": p1.id})
        assert r.status_code == 200
        titles = sorted(a["title"] for a in _results(r))
        assert titles == ["A1", "A2"]

        # Filter by stage
        r = client.get(LIST_URL, {"stage": AcquisitionStage.PROMIS.value})
        assert r.status_code == 200
        titles = sorted(a["title"] for a in _results(r))
        assert titles == ["A2", "B1"]

        # Combined
        r = client.get(
            LIST_URL,
            {"project": p1.id, "stage": AcquisitionStage.PROMIS.value},
        )
        assert r.status_code == 200
        titles = [a["title"] for a in _results(r)]
        assert titles == ["A2"]

    def test_search_by_title(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        # Override l'adresse par défaut de la factory ("Bouskoura, Casablanca")
        # pour que seul le title matche le search "bouskoura" (le filtre scanne
        # title + address + seller_name). Tri explicite par title pour éviter
        # tout ordering non-déterministe (-created_at peut être égal sur Windows).
        AcquisitionFactory(
            owner=user,
            project=project,
            title="Terrain Bouskoura 1200m²",
            address="Rue A, Casablanca",
        )
        AcquisitionFactory(
            owner=user,
            project=project,
            title="Villa Californie",
            address="Rue B, Casablanca",
        )

        r = client.get(LIST_URL, {"search": "bouskoura", "ordering": "title"})
        assert r.status_code == 200
        titles = [a["title"] for a in _results(r)]
        assert titles == ["Terrain Bouskoura 1200m²"]


@pytest.mark.django_db
class TestAcquisitionsAmounts:
    def test_amounts_string(self, authed_client):
        """Les montants DecimalField doivent être sérialisés en string."""
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(
            owner=user,
            project=project,
            title="Check amounts",
            surface_m2=Decimal("2500.50"),
            asking_price=Decimal("1200000.00"),
            negotiated_price=Decimal("1150000.00"),
            arrhes_amount=Decimal("50000.00"),
        )

        response = client.get(_detail_url(acq.pk))

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["surface_m2"], str)
        assert isinstance(data["asking_price"], str)
        assert isinstance(data["negotiated_price"], str)
        assert isinstance(data["arrhes_amount"], str)
        assert data["asking_price"] == "1200000.00"
        assert data["negotiated_price"] == "1150000.00"
        assert data["arrhes_amount"] == "50000.00"
        assert data["surface_m2"] == "2500.50"

    def test_create_rejects_negative_price(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        payload = {
            "title": "Prix négatif",
            "project": project.id,
            "asking_price": "-10.00",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "asking_price" in response.json().get("errors", {})


@pytest.mark.django_db
class TestAcquisitionsCrud:
    def test_retrieve_own(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project, title="Mon bien")
        response = client.get(_detail_url(acq.pk))
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Mon bien"
        assert data["is_stage_active"] is True

    def test_patch_updates_fields(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project, title="Avant")
        response = client.patch(
            _detail_url(acq.pk),
            {"title": "Après", "negotiated_price": "999000.00"},
            format="json",
        )
        assert response.status_code == 200, response.content
        acq.refresh_from_db()
        assert acq.title == "Après"
        assert acq.negotiated_price == Decimal("999000.00")

    def test_delete(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project)
        response = client.delete(_detail_url(acq.pk))
        assert response.status_code == 204
        assert not Acquisition.objects.filter(pk=acq.pk).exists()
