"""Tests API Cheque — auth, scope, validation, cash/reject/ocr, masquage."""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from io import BytesIO

import pytest
from PIL import Image
from django.core.files.uploadedfile import SimpleUploadedFile

from cheques.tests.factories import ChequeFactory
from core.tests.factories import UserFactory


pytestmark = pytest.mark.django_db


def _dummy_image():
    buf = BytesIO()
    Image.new("RGB", (10, 10), color=(200, 200, 200)).save(buf, format="JPEG")
    buf.seek(0)
    return SimpleUploadedFile("cheque.jpg", buf.read(), content_type="image/jpeg")


class TestAuth:
    def test_list_requires_auth(self, api_client):
        r = api_client.get("/api/v1/cheques/")
        assert r.status_code == 401


class TestOwnerScope:
    def test_list_scoped(self, authed_client):
        client, user = authed_client
        ChequeFactory(owner=user)
        ChequeFactory(owner=UserFactory())
        r = client.get("/api/v1/cheques/")
        assert r.data["count"] == 1

    def test_foreign_404(self, authed_client):
        client, _ = authed_client
        c = ChequeFactory(owner=UserFactory())
        r = client.get(f"/api/v1/cheques/{c.id}/")
        assert r.status_code == 404


class TestCreate:
    def test_create_ok(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/cheques/",
            {
                "direction": "out",
                "kind": "normal",
                "number": "1234567",
                "bank": "bmce",
                "amount": "1000.00",
                "amount_blanc": "1000.00",
                "amount_noir": "0.00",
                "party_name": "Fournisseur X",
                "due_date": (date.today() + timedelta(days=30)).isoformat(),
            },
            format="json",
        )
        assert r.status_code == 201, r.data

    def test_create_avec_noms_du_frontend(self, authed_client):
        """Le frontend envoie cash_date / account_holder (alias de due_date / party_name)."""
        client, _ = authed_client
        echeance = (date.today() + timedelta(days=12)).isoformat()
        r = client.post(
            "/api/v1/cheques/",
            {
                "direction": "in", "kind": "normal", "number": "7654321", "bank": "cih",
                "amount": "500.00", "amount_blanc": "500.00", "amount_noir": "0.00",
                "account_holder": "Acquéreur Y", "cash_date": echeance,
            },
            format="json",
        )
        assert r.status_code == 201, r.data
        assert r.data["cash_date"] == echeance and r.data["due_date"] == echeance
        assert r.data["account_holder"] == "Acquéreur Y"
        liste = client.get("/api/v1/cheques/").data["results"]
        assert {"cash_date", "account_holder"} <= set(liste[0])

    def test_create_sans_echeance_refuse(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/cheques/",
            {"direction": "in", "kind": "normal", "number": "1", "bank": "cih", "amount": "1.00",
             "amount_blanc": "1.00", "amount_noir": "0.00", "party_name": "Z"},
            format="json",
        )
        assert r.status_code == 400

    def test_rejects_blanc_plus_noir_mismatch(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/cheques/",
            {
                "direction": "out",
                "number": "1234567",
                "bank": "bmce",
                "amount": "1000.00",
                "amount_blanc": "500.00",
                "amount_noir": "300.00",
                "party_name": "X",
                "due_date": date.today().isoformat(),
            },
            format="json",
        )
        assert r.status_code == 400


class TestMasking:
    def test_list_masks_number_to_last4(self, authed_client):
        client, user = authed_client
        ChequeFactory(owner=user, number="1234567890")
        r = client.get("/api/v1/cheques/")
        assert r.data["results"][0]["number"] == "****7890"

    def test_retrieve_returns_full_number(self, authed_client):
        client, user = authed_client
        c = ChequeFactory(owner=user, number="1234567890")
        r = client.get(f"/api/v1/cheques/{c.id}/")
        assert r.data["number"] == "1234567890"


class TestCash:
    def test_cash_creates_transaction(self, authed_client):
        client, user = authed_client
        c = ChequeFactory(
            owner=user,
            direction="in",
            amount=Decimal("500.00"),
            amount_blanc=Decimal("500.00"),
            amount_noir=Decimal("0.00"),
        )
        r = client.post(f"/api/v1/cheques/{c.id}/cash/")
        assert r.status_code == 200, r.data
        c.refresh_from_db()
        assert c.status == "cashed"
        from transactions.models import Transaction
        assert Transaction.objects.filter(cheque=c).exists()

    def test_cash_invalid_if_not_pending(self, authed_client):
        client, user = authed_client
        c = ChequeFactory(owner=user, status="cashed")
        r = client.post(f"/api/v1/cheques/{c.id}/cash/")
        assert r.status_code == 422


class TestReject:
    def test_reject_ok(self, authed_client):
        client, user = authed_client
        c = ChequeFactory(owner=user, status="pending")
        r = client.post(f"/api/v1/cheques/{c.id}/reject/")
        assert r.status_code == 200
        c.refresh_from_db()
        assert c.status == "rejected"


class TestOcr:
    def test_ocr_requires_photo(self, authed_client):
        client, _ = authed_client
        r = client.post("/api/v1/cheques/ocr/", {}, format="multipart")
        assert r.status_code == 400

    def test_ocr_returns_stub(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/cheques/ocr/",
            {"photo": _dummy_image()},
            format="multipart",
        )
        assert r.status_code == 200
        assert "number" in r.data
        assert r.data.get("stub") is True


class TestUploadPhoto:
    def test_upload_photo_front(self, authed_client):
        client, user = authed_client
        c = ChequeFactory(owner=user)
        r = client.post(
            f"/api/v1/cheques/{c.id}/upload-photo/",
            {"photo_front": _dummy_image()},
            format="multipart",
        )
        assert r.status_code == 200
        c.refresh_from_db()
        assert c.photo_front is not None


class TestFilters:
    def test_filter_by_status(self, authed_client):
        client, user = authed_client
        ChequeFactory(owner=user, status="pending")
        ChequeFactory(owner=user, status="cashed")
        r = client.get("/api/v1/cheques/?status=pending")
        assert r.data["count"] == 1

    def test_filter_by_due_date_range(self, authed_client):
        client, user = authed_client
        ChequeFactory(owner=user, due_date=date.today())
        ChequeFactory(owner=user, due_date=date.today() + timedelta(days=60))
        r = client.get(
            f"/api/v1/cheques/?cash_date_from={date.today().isoformat()}"
            f"&cash_date_to={(date.today() + timedelta(days=30)).isoformat()}"
        )
        assert r.data["count"] == 1
