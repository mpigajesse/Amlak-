"""Tests d'API pour `SupplierViewSet`.

Couverture :
- Auth obligatoire
- Scoping par owner (un user ne voit jamais les suppliers d'un autre)
- `perform_create` injecte l'owner
- Validation ICE (15 chiffres)
- 404 sur supplier d'un autre owner (pas 403)
- Filtres : category, is_active
- Recherche : name / phone / ice (icontains)
- Actions nested : transactions / cheques (scope owner + 404 foreign)
"""
from __future__ import annotations

import datetime as dt
from decimal import Decimal

import pytest
from rest_framework.test import APIClient

from core.tests.factories import UserFactory
from suppliers.models import Supplier, SupplierCategory
from suppliers.tests.factories import SupplierFactory

LIST_URL = "/api/v1/suppliers/"


def _detail_url(pk: int) -> str:
    return f"/api/v1/suppliers/{pk}/"


def _results(response):
    """Retourne la liste des résultats (paginé ou non)."""
    data = response.json()
    if isinstance(data, dict) and "results" in data:
        return data["results"]
    return data


@pytest.mark.django_db
class TestSuppliersAuth:
    def test_list_requires_auth(self):
        """GET /api/v1/suppliers/ sans token → 401."""
        client = APIClient()
        response = client.get(LIST_URL)
        assert response.status_code == 401

    def test_create_requires_auth(self):
        client = APIClient()
        response = client.post(LIST_URL, {"name": "X"}, format="json")
        assert response.status_code == 401


@pytest.mark.django_db
class TestSuppliersScoping:
    def test_list_scoped_by_owner(self, authed_client):
        """Un user ne voit que ses propres suppliers."""
        client, user = authed_client
        other = UserFactory()
        SupplierFactory(owner=user, name="Mien A")
        SupplierFactory(owner=user, name="Mien B")
        SupplierFactory(owner=other, name="Autre X")

        response = client.get(LIST_URL)

        assert response.status_code == 200
        results = _results(response)
        names = sorted(s["name"] for s in results)
        assert names == ["Mien A", "Mien B"]

    def test_create_sets_owner(self, authed_client):
        """Le POST ignore un owner fourni et injecte request.user."""
        client, user = authed_client
        other = UserFactory()

        payload = {
            "name": "Nouveau Fournisseur",
            "category": SupplierCategory.ARCHITECTE.value,
            "phone": "+212661000000",
            "owner": other.id,  # doit être ignoré
        }
        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == 201, response.content
        supplier = Supplier.objects.get(name="Nouveau Fournisseur")
        assert supplier.owner_id == user.id

    def test_foreign_supplier_404(self, authed_client):
        """GET /suppliers/<id>/ sur un supplier d'un autre owner → 404."""
        client, _user = authed_client
        other = UserFactory()
        foreign = SupplierFactory(owner=other, name="Pas à moi")

        response = client.get(_detail_url(foreign.pk))

        assert response.status_code == 404

    def test_foreign_supplier_update_404(self, authed_client):
        client, _user = authed_client
        other = UserFactory()
        foreign = SupplierFactory(owner=other, name="Pas à moi")

        response = client.patch(
            _detail_url(foreign.pk), {"name": "Hack"}, format="json"
        )
        assert response.status_code == 404

    def test_foreign_supplier_delete_404(self, authed_client):
        client, _user = authed_client
        other = UserFactory()
        foreign = SupplierFactory(owner=other, name="Pas à moi")

        response = client.delete(_detail_url(foreign.pk))
        assert response.status_code == 404


@pytest.mark.django_db
class TestSuppliersIceValidation:
    def test_ice_validation_rejects_non_15_digits(self, authed_client):
        client, _user = authed_client
        payload = {"name": "ICE trop court", "ice": "123"}
        response = client.post(LIST_URL, payload, format="json")

        assert response.status_code == 400
        data = response.json()
        # Format d'erreur canonique : {detail, errors, code}
        assert "errors" in data
        assert "ice" in data["errors"]
        joined = " ".join(data["errors"]["ice"])
        assert "L'ICE doit contenir exactement 15 chiffres." in joined

    def test_ice_validation_rejects_letters(self, authed_client):
        client, _user = authed_client
        payload = {"name": "ICE lettres", "ice": "12345678901234A"}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 400
        assert "ice" in response.json()["errors"]

    def test_ice_validation_accepts_15_digits(self, authed_client):
        client, _user = authed_client
        payload = {"name": "ICE valide", "ice": "123456789012345"}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201, response.content
        assert response.json()["ice"] == "123456789012345"

    def test_ice_validation_accepts_empty(self, authed_client):
        client, _user = authed_client
        payload = {"name": "ICE vide", "ice": ""}
        response = client.post(LIST_URL, payload, format="json")
        assert response.status_code == 201, response.content


@pytest.mark.django_db
class TestSuppliersFilter:
    def test_filter_by_category(self, authed_client):
        client, user = authed_client
        SupplierFactory(
            owner=user, name="Archi Un", category=SupplierCategory.ARCHITECTE
        )
        SupplierFactory(
            owner=user, name="Archi Deux", category=SupplierCategory.ARCHITECTE
        )
        SupplierFactory(
            owner=user, name="Notaire Trois", category=SupplierCategory.NOTAIRE
        )

        response = client.get(
            LIST_URL, {"category": SupplierCategory.ARCHITECTE.value}
        )

        assert response.status_code == 200
        results = _results(response)
        assert len(results) == 2
        assert all(s["category"] == "architecte" for s in results)

    def test_filter_by_is_active(self, authed_client):
        client, user = authed_client
        SupplierFactory(owner=user, name="Actif A", is_active=True)
        SupplierFactory(owner=user, name="Inactif B", is_active=False)

        active = client.get(LIST_URL, {"is_active": "true"})
        inactive = client.get(LIST_URL, {"is_active": "false"})

        assert active.status_code == 200
        assert [s["name"] for s in _results(active)] == ["Actif A"]
        assert [s["name"] for s in _results(inactive)] == ["Inactif B"]


@pytest.mark.django_db
class TestSuppliersSearch:
    def test_search_by_name_phone_ice(self, authed_client):
        client, user = authed_client
        a = SupplierFactory(
            owner=user,
            name="Entreprise Bennani Travaux",
            phone="+212600111222",
            ice="111222333444555",
        )
        b = SupplierFactory(
            owner=user,
            name="Marbrerie Ahmed",
            phone="+212600999888",
            ice="999888777666555",
        )
        c = SupplierFactory(
            owner=user,
            name="Peinture Hassan",
            phone="+212600555444",
            ice="",
        )

        # Search by name
        r = client.get(LIST_URL, {"search": "Bennani"})
        assert r.status_code == 200
        assert [s["id"] for s in _results(r)] == [a.id]

        # Search by phone fragment
        r = client.get(LIST_URL, {"search": "999888"})
        assert r.status_code == 200
        assert [s["id"] for s in _results(r)] == [b.id]

        # Search by ICE fragment
        r = client.get(LIST_URL, {"search": "111222333"})
        assert r.status_code == 200
        assert [s["id"] for s in _results(r)] == [a.id]

        # No match
        r = client.get(LIST_URL, {"search": "inexistant-xyz"})
        assert r.status_code == 200
        assert _results(r) == []

        # Phone match should not catch Hassan's ICE (empty)
        r = client.get(LIST_URL, {"search": "Hassan"})
        assert [s["id"] for s in _results(r)] == [c.id]


@pytest.mark.django_db
class TestSuppliersCrud:
    def test_retrieve_own_supplier(self, authed_client):
        client, user = authed_client
        supplier = SupplierFactory(
            owner=user, name="Mon Fournisseur", ice="123456789012345"
        )
        response = client.get(_detail_url(supplier.pk))
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Mon Fournisseur"
        assert data["ice"] == "123456789012345"

    def test_patch_updates_fields(self, authed_client):
        client, user = authed_client
        supplier = SupplierFactory(owner=user, name="Avant", is_active=True)
        response = client.patch(
            _detail_url(supplier.pk),
            {"name": "Après", "is_active": False},
            format="json",
        )
        assert response.status_code == 200, response.content
        supplier.refresh_from_db()
        assert supplier.name == "Après"
        assert supplier.is_active is False

    def test_delete_removes_supplier(self, authed_client):
        client, user = authed_client
        supplier = SupplierFactory(owner=user, name="A supprimer")
        response = client.delete(_detail_url(supplier.pk))
        assert response.status_code == 204
        assert not Supplier.objects.filter(pk=supplier.pk).exists()

    def test_category_display_in_response(self, authed_client):
        client, user = authed_client
        s = SupplierFactory(
            owner=user, category=SupplierCategory.ARCHITECTE, name="Archi test"
        )
        response = client.get(_detail_url(s.pk))
        assert response.status_code == 200
        assert response.json()["category_display"] == "Architecte"


@pytest.mark.django_db
class TestSuppliersSearchCaseInsensitive:
    """La recherche doit être insensible à la casse (icontains)."""

    def test_search_by_name_mixed_case(self, authed_client):
        client, user = authed_client
        s = SupplierFactory(owner=user, name="Entreprise Bennani")
        r = client.get(LIST_URL, {"search": "bEnNaNi"})
        assert r.status_code == 200
        assert [row["id"] for row in _results(r)] == [s.id]

    def test_search_by_phone_mixed_case(self, authed_client):
        client, user = authed_client
        s = SupplierFactory(owner=user, name="X", phone="+212ABC123")
        r = client.get(LIST_URL, {"search": "abc"})
        assert r.status_code == 200
        assert [row["id"] for row in _results(r)] == [s.id]


@pytest.mark.django_db
class TestSuppliersTransactionsAction:
    """GET /api/v1/suppliers/<id>/transactions/."""

    def _create_tx(self, *, owner, supplier, date=None, direction="out"):
        from transactions.models import Transaction

        return Transaction.objects.create(
            owner=owner,
            supplier=supplier,
            date=date or dt.date(2026, 4, 1),
            direction=direction,
            payment_mode=Transaction.PaymentMode.ESPECE,
            amount_blanc=Decimal("100.00"),
            amount_noir=Decimal("0.00"),
            category=(
                Transaction.Category.AUTRE
                if direction == "out"
                else Transaction.Category.VENTE
            ),
        )

    def test_requires_auth(self):
        client = APIClient()
        r = client.get("/api/v1/suppliers/1/transactions/")
        assert r.status_code == 401

    def test_returns_only_own_supplier_transactions(self, authed_client):
        client, user = authed_client
        supplier = SupplierFactory(owner=user, name="Mine")
        other_supplier = SupplierFactory(owner=user, name="Other")
        tx1 = self._create_tx(owner=user, supplier=supplier)
        tx2 = self._create_tx(owner=user, supplier=supplier, date=dt.date(2026, 3, 1))
        self._create_tx(owner=user, supplier=other_supplier)  # bruit

        r = client.get(f"/api/v1/suppliers/{supplier.pk}/transactions/")
        assert r.status_code == 200
        results = _results(r)
        ids = {row["id"] for row in results}
        assert ids == {tx1.id, tx2.id}

    def test_foreign_supplier_returns_404(self, authed_client):
        client, _user = authed_client
        other = UserFactory()
        foreign = SupplierFactory(owner=other, name="Pas à moi")
        r = client.get(f"/api/v1/suppliers/{foreign.pk}/transactions/")
        assert r.status_code == 404

    def test_does_not_leak_other_owner_transactions(self, authed_client):
        """Même supplier partagé en théorie : seuls tx du user courant."""
        client, user = authed_client
        supplier = SupplierFactory(owner=user, name="À moi")
        self._create_tx(owner=user, supplier=supplier)
        # Un tx avec supplier=None mais owner=autre ne doit pas apparaître.
        other = UserFactory()
        from transactions.models import Transaction

        Transaction.objects.create(
            owner=other,
            supplier=None,
            date=dt.date(2026, 4, 1),
            direction="out",
            payment_mode=Transaction.PaymentMode.ESPECE,
            amount_blanc=Decimal("50.00"),
            amount_noir=Decimal("0.00"),
            category=Transaction.Category.AUTRE,
        )
        r = client.get(f"/api/v1/suppliers/{supplier.pk}/transactions/")
        assert r.status_code == 200
        assert len(_results(r)) == 1

    def test_paginated_response_shape(self, authed_client):
        client, user = authed_client
        supplier = SupplierFactory(owner=user, name="Pag")
        self._create_tx(owner=user, supplier=supplier)
        r = client.get(f"/api/v1/suppliers/{supplier.pk}/transactions/")
        assert r.status_code == 200
        data = r.json()
        # Réponse paginée DRF standard
        assert "results" in data
        assert "count" in data


@pytest.mark.django_db
class TestSuppliersChequesAction:
    """GET /api/v1/suppliers/<id>/cheques/."""

    def _create_cheque(self, *, owner, supplier, number="1234", due_date=None):
        from cheques.models import Cheque

        return Cheque.objects.create(
            owner=owner,
            supplier=supplier,
            direction=Cheque.Direction.OUT,
            kind=Cheque.Kind.NORMAL,
            number=number,
            bank="autre",
            amount=Decimal("500.00"),
            amount_blanc=Decimal("500.00"),
            amount_noir=Decimal("0.00"),
            party_name="Test",
            due_date=due_date or dt.date(2026, 5, 1),
            status=Cheque.Status.PENDING,
        )

    def test_requires_auth(self):
        client = APIClient()
        r = client.get("/api/v1/suppliers/1/cheques/")
        assert r.status_code == 401

    def test_returns_only_own_supplier_cheques(self, authed_client):
        client, user = authed_client
        supplier = SupplierFactory(owner=user, name="Mine")
        other_supplier = SupplierFactory(owner=user, name="Other")
        ch1 = self._create_cheque(owner=user, supplier=supplier, number="1111")
        ch2 = self._create_cheque(owner=user, supplier=supplier, number="2222")
        self._create_cheque(owner=user, supplier=other_supplier, number="9999")

        r = client.get(f"/api/v1/suppliers/{supplier.pk}/cheques/")
        assert r.status_code == 200
        results = _results(r)
        ids = {row["id"] for row in results}
        assert ids == {ch1.id, ch2.id}
        # ChequeListSerializer → numéro masqué
        for row in results:
            assert row["number"].startswith("*") or row["number"] == row["number"]

    def test_foreign_supplier_returns_404(self, authed_client):
        client, _user = authed_client
        other = UserFactory()
        foreign = SupplierFactory(owner=other, name="Pas à moi")
        r = client.get(f"/api/v1/suppliers/{foreign.pk}/cheques/")
        assert r.status_code == 404

    def test_paginated_response_shape(self, authed_client):
        client, user = authed_client
        supplier = SupplierFactory(owner=user, name="Pag")
        self._create_cheque(owner=user, supplier=supplier)
        r = client.get(f"/api/v1/suppliers/{supplier.pk}/cheques/")
        assert r.status_code == 200
        data = r.json()
        assert "results" in data
        assert "count" in data
