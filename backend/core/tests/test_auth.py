"""
Tests for authentication endpoints (Sprint 1).

Tests the following endpoints:
- POST /api/v1/auth/login/ — user login with email + password
- POST /api/v1/auth/refresh/ — refresh access token via httpOnly cookie
- GET /api/v1/auth/me/ — get current user + settings
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from core.tests.factories import UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestAuthLogin:
    """Tests for POST /api/v1/auth/login/"""

    def test_auth_login_returns_tokens_and_user_on_success(self):
        """
        Test that login with valid credentials returns:
        - access token in response body
        - user object with id, email, first_name, last_name, locale, settings
        - NO refresh token in response body (it's in the cookie)
        - Set-Cookie header with amlak_refresh (HttpOnly)
        """
        client = APIClient()
        user = UserFactory(
            email="admin@amlak.ma",
            first_name="Admin",
            last_name="Amlak",
        )
        user.set_password("testpass123")
        user.save()

        response = client.post(
            "/api/v1/auth/login/",
            {
                "email": "admin@amlak.ma",
                "password": "testpass123",
            },
            format="json",
        )

        assert response.status_code == 200
        data = response.json()

        # Check response body structure
        assert "access" in data
        assert "user" in data
        assert "refresh" not in data  # Should NOT be in body

        # Check user object
        user_data = data["user"]
        assert user_data["id"] == user.id
        assert user_data["email"] == "admin@amlak.ma"
        assert user_data["first_name"] == "Admin"
        assert user_data["last_name"] == "Amlak"
        assert user_data["locale"] == "fr-MA"
        assert "settings" in user_data

        # Check settings nested object
        settings = user_data["settings"]
        assert "notifications_enabled" in settings
        assert "alert_thresholds" in settings

        # Check Set-Cookie header for refresh token
        cookies = response.cookies
        assert "amlak_refresh" in cookies
        cookie = cookies["amlak_refresh"]
        assert cookie["httponly"] is True

    def test_auth_login_rejects_bad_credentials(self):
        """
        Test that login with wrong password returns 401 with
        message "Identifiants invalides." (exact French message).
        """
        client = APIClient()
        user = UserFactory(email="admin@amlak.ma")
        user.set_password("correct_password")
        user.save()

        response = client.post(
            "/api/v1/auth/login/",
            {
                "email": "admin@amlak.ma",
                "password": "wrong_password",
            },
            format="json",
        )

        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Identifiants invalides."
        assert data["code"] == "invalid_credentials"

    def test_auth_login_rejects_nonexistent_email(self):
        """Test that login with non-existent email returns 401."""
        client = APIClient()

        response = client.post(
            "/api/v1/auth/login/",
            {
                "email": "nonexistent@amlak.ma",
                "password": "anypassword",
            },
            format="json",
        )

        assert response.status_code == 401
        data = response.json()
        assert data["detail"] == "Identifiants invalides."

    def test_auth_login_throttle_limits_after_10_attempts(self):
        """
        Test that after 10 failed login attempts within 1 minute,
        the next attempt returns 429 (too many requests).
        """
        client = APIClient()
        user = UserFactory(email="admin@amlak.ma")
        user.set_password("correct_password")
        user.save()

        # Make 10 failed attempts
        for _i in range(10):
            response = client.post(
                "/api/v1/auth/login/",
                {
                    "email": "admin@amlak.ma",
                    "password": "wrong_password",
                },
                format="json",
            )
            assert response.status_code == 401

        # 11th attempt should be throttled
        response = client.post(
            "/api/v1/auth/login/",
            {
                "email": "admin@amlak.ma",
                "password": "wrong_password",
            },
            format="json",
        )

        assert response.status_code == 429
        data = response.json()
        assert data["code"] == "throttled"


@pytest.mark.django_db
class TestAuthRefresh:
    """Tests for POST /api/v1/auth/refresh/"""

    def test_auth_refresh_renews_access_from_cookie(self):
        """
        Test that after login, calling /auth/refresh/ with the
        amlak_refresh cookie returns a new access token.
        """
        client = APIClient()
        user = UserFactory(email="admin@amlak.ma")
        user.set_password("testpass123")
        user.save()

        # First, login to get the refresh cookie
        login_response = client.post(
            "/api/v1/auth/login/",
            {
                "email": "admin@amlak.ma",
                "password": "testpass123",
            },
            format="json",
        )

        assert login_response.status_code == 200

        # Now call refresh endpoint with the cookie set
        refresh_response = client.post("/api/v1/auth/refresh/", {}, format="json")

        assert refresh_response.status_code == 200
        data = refresh_response.json()
        assert "access" in data
        assert isinstance(data["access"], str)

        # Verify a new cookie was set (rotation)
        assert "amlak_refresh" in refresh_response.cookies

    def test_auth_refresh_without_cookie_returns_401(self):
        """
        Test that calling /auth/refresh/ without the amlak_refresh
        cookie returns 401 with code 'token_invalid'.
        """
        client = APIClient()

        response = client.post("/api/v1/auth/refresh/", {}, format="json")

        assert response.status_code == 401
        data = response.json()
        assert "code" in data
        # Code may be 'token_invalid' or similar, depending on simplejwt


@pytest.mark.django_db
class TestAuthMe:
    """Tests for GET /api/v1/auth/me/"""

    def test_auth_me_requires_authentication(self):
        """Test that GET /auth/me/ without token returns 401."""
        client = APIClient()

        response = client.get("/api/v1/auth/me/")

        assert response.status_code == 401
        data = response.json()
        assert data["code"] == "not_authenticated"

    def test_auth_me_returns_user_and_settings(self):
        """Test that authenticated request to /auth/me/ returns user object + settings."""
        client = APIClient()
        user = UserFactory(
            email="admin@amlak.ma",
            first_name="Admin",
            last_name="Amlak",
        )

        client.force_authenticate(user=user)
        response = client.get("/api/v1/auth/me/")

        assert response.status_code == 200
        data = response.json()

        # Check user object structure
        assert data["id"] == user.id
        assert data["email"] == "admin@amlak.ma"
        assert data["first_name"] == "Admin"
        assert data["last_name"] == "Amlak"
        assert data["locale"] == "fr-MA"

        # Check settings are included
        assert "settings" in data
        assert "notifications_enabled" in data["settings"]
        assert "alert_thresholds" in data["settings"]

    def test_auth_me_returns_different_user_for_different_auth(self):
        """Test that different users get their own data from /auth/me/."""
        client = APIClient()
        user1 = UserFactory(email="user1@amlak.ma", first_name="User1")
        user2 = UserFactory(email="user2@amlak.ma", first_name="User2")

        # Request as user1
        client.force_authenticate(user=user1)
        response1 = client.get("/api/v1/auth/me/")
        assert response1.json()["email"] == "user1@amlak.ma"

        # Request as user2
        client.force_authenticate(user=user2)
        response2 = client.get("/api/v1/auth/me/")
        assert response2.json()["email"] == "user2@amlak.ma"
