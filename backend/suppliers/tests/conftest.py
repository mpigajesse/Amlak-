"""Conftest local à suppliers/tests — expose les fixtures communes.

Réutilise les fixtures `api_client`, `user`, `authed_client` et le clear du
cache de throttle définies dans `core/tests/conftest.py`.
"""
from __future__ import annotations

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from core.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """Reset DRF throttle state between tests."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def authed_client(db, api_client, user):
    api_client.force_authenticate(user=user)
    return api_client, user
