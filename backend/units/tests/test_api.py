"""Tests d'API pour `StockUnitViewSet`.

Couverture :
- Auth obligatoire
- Scoping par owner (404 sur ressources d'un autre)
- `perform_create` injecte l'owner
- Transitions `reserve`, `sign-compromis`, `cash` (valides + invalides)
- `generate-from-acquisition`
- Filtres (project, acquisition, stage, unit_type, search)
- Montants sérialisés en string
- `margin_previsionnelle` calculée
"""
from __future__ import annotations

from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from acquisitions.tests.factories import AcquisitionFactory
from core.tests.factories import UserFactory
from projects.tests.factories import ProjectFactory
from units.models import StockUnit, UnitStage, UnitType
from units.tests.factories import StockUnitFactory

LIST_URL = "/api/v1/units/"
GENERATE_URL = "/api/v1/units/generate-from-acquisition/"


def _detail_url(pk: int) -> str:
    return f"/api/v1/units/{pk}/"


def _reserve_url(pk: int) -> str:
    return f"/api/v1/units/{pk}/reserve/"


def _sign_url(pk: int) -> str:
    return f"/api/v1/units/{pk}/sign-compromis/"


def _cash_url(pk: int) -> str:
    return f"/api/v1/units/{pk}/cash/"


def _results(response):
    data = response.json()
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


# ---------------------------------------------------------------------------
# Auth & ownership
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUnitsAuth:
    def test_list_requires_auth(self):
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == 401

    def test_create_requires_auth(self):
        client = APIClient()
        response = client.post(LIST_URL, {"label": "X"}, format="json")
        assert response.status_code == 401

    def test_reserve_requires_auth(self):
        client = APIClient()
        # Même avec un id inexistant, on attend 401 avant autre chose
        response = client.post(_reserve_url(1), {}, format="json")
        assert response.status_code == 401


@pytest.mark.django_db
class TestUnitsScoping:
    def test_list_scoped_by_owner(self, authed_client):
        client, user = authed_client
        other = UserFactory()

        my_project = ProjectFactory(owner=user, name="Mien")
        other_project = ProjectFactory(owner=other, name="Autre")

        StockUnitFactory(owner=user, project=my_project, label="A-1")
        StockUnitFactory(owner=user, project=my_project, label="A-2")
        StockUnitFactory(owner=other, project=other_project, label="Z-1")

        response = client.get(LIST_URL)

        assert response.status_code == 200
        labels = sorted(u["label"] for u in _results(response))
        assert labels == ["A-1", "A-2"]

    def test_create_sets_owner(self, authed_client):
        """POST ignore owner fourni et injecte request.user."""
        client, user = authed_client
        other = UserFactory()
        project = ProjectFactory(owner=user)

        payload = {
            "label": "A1-10",
            "project": project.id,
            "unit_type": UnitType.APPARTEMENT.value,
            "surface_m2": "75.00",
            "price_asked": "600000.00",
            "owner": other.id,  # doit être ignoré
        }
        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == 201, response.content
        unit = StockUnit.objects.get(label="A1-10")
        assert unit.owner_id == user.id
        assert unit.project_id == project.id
        assert unit.stage == UnitStage.STOCK

    def test_404_foreign(self, authed_client):
        """Détail/update/delete sur ressource d'un autre owner → 404."""
        client, _user = authed_client
        other = UserFactory()
        foreign_project = ProjectFactory(owner=other)
        foreign = StockUnitFactory(
            owner=other, project=foreign_project, label="Pas à moi"
        )

        assert client.get(_detail_url(foreign.pk)).status_code == 404
        assert (
            client.patch(
                _detail_url(foreign.pk), {"label": "Hack"}, format="json"
            ).status_code
            == 404
        )
        assert client.delete(_detail_url(foreign.pk)).status_code == 404
        assert (
            client.post(_reserve_url(foreign.pk), {"buyer_name": "X"}, format="json").status_code
            == 404
        )

    def test_create_with_foreign_project_rejected(self, authed_client):
        client, _user = authed_client
        other = UserFactory()
        foreign_project = ProjectFactory(owner=other)

        payload = {
            "label": "X",
            "project": foreign_project.id,
            "unit_type": UnitType.APPARTEMENT.value,
            "surface_m2": "75.00",
            "price_asked": "600000.00",
        }
        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == 400
        assert "project" in response.json().get("errors", {})


# ---------------------------------------------------------------------------
# Transitions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReserve:
    def test_reserve_stock_unit(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project, stage=UnitStage.STOCK)

        response = client.post(
            _reserve_url(unit.pk),
            {
                "buyer_name": "Mehdi Chakir",
                "buyer_phone": "+212 662 223 344",
                "reserved_at": "2026-04-24",
            },
            format="json",
        )

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["stage"] == UnitStage.RESERVATION.value
        assert data["stage_display"] == "Réservation"
        assert data["buyer_name"] == "Mehdi Chakir"
        assert data["reserved_at"] == "2026-04-24"
        unit.refresh_from_db()
        assert unit.stage == UnitStage.RESERVATION

    def test_reserve_default_reserved_at_today(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project, stage=UnitStage.STOCK)

        response = client.post(
            _reserve_url(unit.pk),
            {"buyer_name": "Mehdi"},
            format="json",
        )

        assert response.status_code == 200
        assert response.json()["reserved_at"] is not None

    def test_reserve_requires_buyer_name(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project, stage=UnitStage.STOCK)

        response = client.post(_reserve_url(unit.pk), {}, format="json")
        assert response.status_code == 400
        assert "buyer_name" in response.json().get("errors", {})

    def test_reserve_invalid_when_not_stock(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(
            owner=user, project=project, stage=UnitStage.COMPROMIS
        )

        response = client.post(
            _reserve_url(unit.pk), {"buyer_name": "X"}, format="json"
        )
        assert response.status_code == 422
        assert response.json().get("code") == "invalid_transition"


@pytest.mark.django_db
class TestSignCompromis:
    def test_sign_compromis_from_reservation(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(
            owner=user, project=project, stage=UnitStage.RESERVATION
        )

        response = client.post(
            _sign_url(unit.pk),
            {"compromis_at": "2026-05-01", "price_negotiated": "770000.00"},
            format="json",
        )

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["stage"] == UnitStage.COMPROMIS.value
        assert data["compromis_at"] == "2026-05-01"
        assert data["price_negotiated"] == "770000.00"

    def test_sign_compromis_without_price(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(
            owner=user,
            project=project,
            stage=UnitStage.RESERVATION,
            price_asked=Decimal("780000.00"),
        )

        response = client.post(_sign_url(unit.pk), {}, format="json")
        assert response.status_code == 200
        unit.refresh_from_db()
        assert unit.stage == UnitStage.COMPROMIS
        assert unit.price_negotiated is None

    def test_sign_compromis_invalid_when_stock(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project, stage=UnitStage.STOCK)

        response = client.post(_sign_url(unit.pk), {}, format="json")
        assert response.status_code == 422
        assert response.json().get("code") == "invalid_transition"


@pytest.mark.django_db
class TestCash:
    def test_cash_from_compromis(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(
            owner=user, project=project, stage=UnitStage.COMPROMIS
        )

        response = client.post(
            _cash_url(unit.pk),
            {"encaisse_at": "2026-06-15"},
            format="json",
        )

        assert response.status_code == 200, response.content
        data = response.json()
        assert data["stage"] == UnitStage.ENCAISSE.value
        assert data["encaisse_at"] == "2026-06-15"

    def test_cash_invalid_when_reservation(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(
            owner=user, project=project, stage=UnitStage.RESERVATION
        )

        response = client.post(_cash_url(unit.pk), {}, format="json")
        assert response.status_code == 422
        assert response.json().get("code") == "invalid_transition"

    def test_full_sell_cycle(self, authed_client):
        """Parcours complet stock → reservation → compromis → encaisse."""
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project, stage=UnitStage.STOCK)

        assert (
            client.post(
                _reserve_url(unit.pk), {"buyer_name": "Y"}, format="json"
            ).status_code
            == 200
        )
        assert (
            client.post(_sign_url(unit.pk), {}, format="json").status_code == 200
        )
        assert client.post(_cash_url(unit.pk), {}, format="json").status_code == 200

        unit.refresh_from_db()
        assert unit.stage == UnitStage.ENCAISSE


# ---------------------------------------------------------------------------
# generate-from-acquisition
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestGenerateFromAcquisition:
    def test_generate_success(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project)

        payload = {
            "acquisition": acq.id,
            "units": [
                {
                    "label": "A1-01",
                    "unit_type": UnitType.APPARTEMENT.value,
                    "surface_m2": "78.00",
                    "price_asked": "780000.00",
                },
                {
                    "label": "A1-02",
                    "unit_type": UnitType.MAGASIN.value,
                    "surface_m2": "45.00",
                    "price_asked": "900000.00",
                    "allocated_cost": "400000.00",
                },
            ],
        }
        response = client.post(GENERATE_URL, payload, format="json")

        assert response.status_code == 201, response.content
        data = response.json()
        assert len(data) == 2
        assert {u["label"] for u in data} == {"A1-01", "A1-02"}
        assert StockUnit.objects.filter(acquisition=acq).count() == 2
        for u in StockUnit.objects.filter(acquisition=acq):
            assert u.owner_id == user.id
            assert u.project_id == project.id

    def test_generate_duplicate_labels_in_batch_rejected(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project)
        payload = {
            "acquisition": acq.id,
            "units": [
                {"label": "X", "surface_m2": "10.00", "price_asked": "1.00"},
                {"label": "X", "surface_m2": "10.00", "price_asked": "1.00"},
            ],
        }
        response = client.post(GENERATE_URL, payload, format="json")
        assert response.status_code == 400
        assert "units" in response.json().get("errors", {})

    def test_generate_empty_units_rejected(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project)
        response = client.post(
            GENERATE_URL, {"acquisition": acq.id, "units": []}, format="json"
        )
        assert response.status_code == 400

    def test_generate_foreign_acquisition_rejected(self, authed_client):
        client, _user = authed_client
        other = UserFactory()
        other_project = ProjectFactory(owner=other)
        other_acq = AcquisitionFactory(owner=other, project=other_project)

        payload = {
            "acquisition": other_acq.id,
            "units": [{"label": "X", "surface_m2": "10.00", "price_asked": "1.00"}],
        }
        response = client.post(GENERATE_URL, payload, format="json")
        assert response.status_code == 400
        assert "acquisition" in response.json().get("errors", {})

    def test_generate_atomic_rollback_on_error(self, authed_client):
        """Si une unité échoue (label dupliqué avec existant), aucune n'est créée."""
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project)
        StockUnitFactory(owner=user, project=project, label="EXIST")

        before = StockUnit.objects.filter(owner=user).count()
        payload = {
            "acquisition": acq.id,
            "units": [
                {"label": "NEW-1", "surface_m2": "10.00", "price_asked": "1.00"},
                {"label": "EXIST", "surface_m2": "10.00", "price_asked": "1.00"},
            ],
        }
        response = client.post(GENERATE_URL, payload, format="json")
        # Attendu : 400 via IntegrityError OU 500 si non intercepté ; l'atomicité
        # garantit qu'aucune nouvelle ligne n'est persistée.
        assert response.status_code >= 400
        after = StockUnit.objects.filter(owner=user).count()
        assert after == before


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUnitsFilters:
    def test_filter_by_project_stage_type(self, authed_client):
        client, user = authed_client
        p1 = ProjectFactory(owner=user, name="P1")
        p2 = ProjectFactory(owner=user, name="P2")

        StockUnitFactory(
            owner=user, project=p1, label="A",
            unit_type=UnitType.APPARTEMENT, stage=UnitStage.STOCK,
        )
        StockUnitFactory(
            owner=user, project=p1, label="B",
            unit_type=UnitType.MAGASIN, stage=UnitStage.RESERVATION,
        )
        StockUnitFactory(
            owner=user, project=p2, label="C",
            unit_type=UnitType.APPARTEMENT, stage=UnitStage.STOCK,
        )

        r = client.get(LIST_URL, {"project": p1.id})
        assert sorted(u["label"] for u in _results(r)) == ["A", "B"]

        r = client.get(LIST_URL, {"stage": UnitStage.STOCK.value})
        assert sorted(u["label"] for u in _results(r)) == ["A", "C"]

        r = client.get(LIST_URL, {"unit_type": UnitType.APPARTEMENT.value})
        assert sorted(u["label"] for u in _results(r)) == ["A", "C"]

        r = client.get(
            LIST_URL,
            {"project": p1.id, "unit_type": UnitType.APPARTEMENT.value},
        )
        assert [u["label"] for u in _results(r)] == ["A"]

    def test_filter_by_acquisition(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        acq = AcquisitionFactory(owner=user, project=project)
        StockUnitFactory(
            owner=user, project=project, acquisition=acq, label="AQ-1"
        )
        StockUnitFactory(owner=user, project=project, acquisition=None, label="NO")

        r = client.get(LIST_URL, {"acquisition": acq.id})
        assert [u["label"] for u in _results(r)] == ["AQ-1"]

    def test_search_by_label(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        StockUnitFactory(owner=user, project=project, label="A1-01")
        StockUnitFactory(owner=user, project=project, label="MAG-RDC")

        r = client.get(LIST_URL, {"search": "mag"})
        assert [u["label"] for u in _results(r)] == ["MAG-RDC"]


# ---------------------------------------------------------------------------
# Serialization details
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUnitsSerialization:
    def test_amounts_are_strings(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(
            owner=user,
            project=project,
            surface_m2=Decimal("78.50"),
            price_asked=Decimal("780000.00"),
            price_negotiated=Decimal("760000.00"),
            allocated_cost=Decimal("500000.00"),
        )

        response = client.get(_detail_url(unit.pk))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["surface_m2"], str)
        assert isinstance(data["price_asked"], str)
        assert isinstance(data["price_negotiated"], str)
        assert isinstance(data["allocated_cost"], str)
        assert isinstance(data["margin_previsionnelle"], str)
        assert data["price_asked"] == "780000.00"
        assert data["price_negotiated"] == "760000.00"
        assert data["allocated_cost"] == "500000.00"
        assert data["margin_previsionnelle"] == "260000.00"
        assert data["surface_m2"] == "78.50"

    def test_create_rejects_negative_price(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        payload = {
            "label": "BAD",
            "project": project.id,
            "unit_type": UnitType.APPARTEMENT.value,
            "surface_m2": "50.00",
            "price_asked": "-1.00",
        }
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "price_asked" in response.json().get("errors", {})

    def test_patch_updates_fields(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project, label="Avant")
        response = client.patch(
            _detail_url(unit.pk),
            {"label": "Après", "notes": "Ajusté"},
            format="json",
        )
        assert response.status_code == 200, response.content
        unit.refresh_from_db()
        assert unit.label == "Après"
        assert unit.notes == "Ajusté"
        # Stage reste read-only
        assert unit.stage == UnitStage.STOCK

    def test_stage_is_read_only_via_patch(self, authed_client):
        """On ne peut pas forcer la transition via PATCH — seulement via actions."""
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project, stage=UnitStage.STOCK)
        response = client.patch(
            _detail_url(unit.pk),
            {"stage": UnitStage.ENCAISSE.value},
            format="json",
        )
        assert response.status_code == 200
        unit.refresh_from_db()
        assert unit.stage == UnitStage.STOCK

    def test_delete(self, authed_client):
        client, user = authed_client
        project = ProjectFactory(owner=user)
        unit = StockUnitFactory(owner=user, project=project)
        response = client.delete(_detail_url(unit.pk))
        assert response.status_code == 204
        assert not StockUnit.objects.filter(pk=unit.pk).exists()
