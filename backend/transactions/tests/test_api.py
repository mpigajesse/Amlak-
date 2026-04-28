"""Tests API Transaction — auth, scope, validation Blanc/Noir, quick, cash-position."""
from __future__ import annotations

import json
from datetime import date
from decimal import Decimal

import pytest
from rest_framework import status

from core.tests.factories import UserFactory
from transactions.models import Transaction
from transactions.tests.factories import TransactionFactory


pytestmark = pytest.mark.django_db


class TestAuth:
    def test_list_requires_auth(self, api_client):
        r = api_client.get("/api/v1/transactions/")
        assert r.status_code == status.HTTP_401_UNAUTHORIZED


class TestOwnerScope:
    def test_list_scoped_by_owner(self, authed_client):
        client, user = authed_client
        TransactionFactory(owner=user)
        other = UserFactory()
        TransactionFactory(owner=other)
        r = client.get("/api/v1/transactions/")
        assert r.status_code == 200
        assert r.data["count"] == 1

    def test_foreign_detail_404(self, authed_client):
        client, _ = authed_client
        other = UserFactory()
        tx = TransactionFactory(owner=other)
        r = client.get(f"/api/v1/transactions/{tx.id}/")
        assert r.status_code == status.HTTP_404_NOT_FOUND


class TestValidation:
    def test_create_requires_positive_total(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/transactions/",
            {
                "date": date.today().isoformat(),
                "direction": "out",
                "payment_mode": "espece",
                "amount_blanc": "0",
                "amount_noir": "0",
                "category": "travaux",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_create_rejects_negative_amount(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/transactions/",
            {
                "date": date.today().isoformat(),
                "direction": "out",
                "payment_mode": "espece",
                "amount_blanc": "-100",
                "amount_noir": "200",
                "category": "travaux",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_create_out_with_vente_category_rejected(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/transactions/",
            {
                "date": date.today().isoformat(),
                "direction": "out",
                "payment_mode": "espece",
                "amount_blanc": "100",
                "amount_noir": "0",
                "category": "vente",
            },
            format="json",
        )
        assert r.status_code == 400


class TestCreate:
    def test_create_ok(self, authed_client):
        client, _ = authed_client
        r = client.post(
            "/api/v1/transactions/",
            {
                "date": date.today().isoformat(),
                "direction": "out",
                "payment_mode": "espece",
                "amount_blanc": "1500.50",
                "amount_noir": "500.50",
                "category": "travaux",
            },
            format="json",
        )
        assert r.status_code == 201, r.data
        assert r.data["amount_blanc"] == "1500.50"
        assert r.data["amount_noir"] == "500.50"
        assert r.data["amount_total"] == "2001.00"

    def test_amounts_are_strings_in_json(self, authed_client):
        client, user = authed_client
        TransactionFactory(owner=user, amount_blanc=Decimal("12345.67"), amount_noir=Decimal("89.12"))
        r = client.get("/api/v1/transactions/")
        raw = json.loads(r.content)
        first = raw["results"][0]
        assert isinstance(first["amount_blanc"], str)
        assert isinstance(first["amount_noir"], str)
        assert isinstance(first["amount_total"], str)


class TestQuick:
    def test_quick_creates_transaction(self, authed_client):
        client, user = authed_client
        r = client.post(
            "/api/v1/transactions/quick/",
            {
                "date": date.today().isoformat(),
                "direction": "out",
                "amount_blanc": "800",
                "amount_noir": "200",
                "category": "travaux",
            },
            format="json",
        )
        assert r.status_code == 201, r.data
        assert Transaction.objects.filter(owner=user).count() == 1


class TestCashPosition:
    def test_cash_position_aggregates(self, authed_client):
        client, user = authed_client
        TransactionFactory(
            owner=user, direction="in", category="vente",
            amount_blanc=Decimal("1000"), amount_noir=Decimal("500"),
        )
        TransactionFactory(
            owner=user, direction="out", category="travaux",
            amount_blanc=Decimal("300"), amount_noir=Decimal("100"),
        )
        r = client.get("/api/v1/transactions/cash-position/")
        assert r.status_code == 200
        assert r.data["blanc"] == "700.00"
        assert r.data["noir"] == "400.00"
        assert r.data["total"] == "1100.00"


class TestFilters:
    def test_filter_by_direction(self, authed_client):
        client, user = authed_client
        TransactionFactory(owner=user, direction="in", category="vente")
        TransactionFactory(owner=user, direction="out", category="travaux")
        r = client.get("/api/v1/transactions/?direction=in")
        assert r.data["count"] == 1

    def test_filter_by_min_total(self, authed_client):
        client, user = authed_client
        TransactionFactory(owner=user, amount_blanc=Decimal("100"), amount_noir=Decimal("0"))
        TransactionFactory(owner=user, amount_blanc=Decimal("5000"), amount_noir=Decimal("0"))
        r = client.get("/api/v1/transactions/?min=1000")
        assert r.data["count"] == 1
