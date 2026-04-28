"""Pytest configuration and fixtures for backend tests.

Provides shared fixtures for all tests (api_client, user, authed_client)
and resets the DRF throttle cache between tests for deterministic behaviour.
"""

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from core.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def _clear_throttle_cache():
    """Reset DRF throttle state between tests (sinon ScopedRateThrottle pollue)."""
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    """Provides an unauthenticated API client."""
    return APIClient()


@pytest.fixture
def user(db):
    """Provides a test user with email user0@amlak.ma."""
    return UserFactory()


@pytest.fixture
def authed_client(db, api_client, user):
    """Provides an authenticated API client and the authenticated user.

    Usage:
        def test_something(authed_client):
            client, user = authed_client
            response = client.get('/api/v1/auth/me/')
            assert response.status_code == 200
    """
    api_client.force_authenticate(user=user)
    return api_client, user
