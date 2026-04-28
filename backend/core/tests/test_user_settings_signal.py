"""
Tests for UserSettings signal (Sprint 1).

Tests that UserSettings are automatically created when a User is created,
via Django signals in accounts/signals.py.
"""

import pytest
from django.contrib.auth import get_user_model

from core.models.user_settings import UserSettings
from core.tests.factories import UserFactory

User = get_user_model()


@pytest.mark.django_db
class TestUserSettingsSignal:
    """Tests for the post_save signal that creates UserSettings."""

    def test_user_settings_created_on_user_creation(self):
        """
        Test that when a User is created via UserFactory (or directly),
        a UserSettings instance is automatically created via signal.
        """
        user = UserFactory()

        # Verify that user.settings exists and is a UserSettings instance
        assert hasattr(user, "settings")
        assert isinstance(user.settings, UserSettings)

        # Verify default values
        assert user.settings.notifications_enabled is True
        assert user.settings.alert_thresholds == {}

    def test_user_settings_only_created_once(self):
        """
        Test that calling user.save() multiple times doesn't create
        duplicate UserSettings. The OneToOne relation ensures only one
        settings object exists per user.
        """
        user = UserFactory()
        initial_settings_id = user.settings.id

        # Save user again
        user.first_name = "Updated"
        user.save()

        # Refresh from DB to ensure we're checking the real state
        user.refresh_from_db()

        # Settings should still have the same ID (not duplicated)
        assert user.settings.id == initial_settings_id

        # Verify only one UserSettings exists for this user
        settings_count = UserSettings.objects.filter(user=user).count()
        assert settings_count == 1

    def test_user_settings_linked_to_correct_user(self):
        """Test that UserSettings is correctly linked to its User."""
        user = UserFactory(email="test@amlak.ma")

        # Verify settings are linked to the correct user
        assert user.settings.user == user
        assert user.settings.user.email == "test@amlak.ma"

    def test_multiple_users_have_independent_settings(self):
        """Test that multiple users have independent UserSettings."""
        user1 = UserFactory(email="user1@amlak.ma")
        user2 = UserFactory(email="user2@amlak.ma")

        # Modify user1's settings
        user1.settings.notifications_enabled = False
        user1.settings.save()

        # Verify user2's settings are unaffected
        user2.settings.refresh_from_db()
        assert user2.settings.notifications_enabled is True

        # Verify user1's settings are actually changed
        user1.settings.refresh_from_db()
        assert user1.settings.notifications_enabled is False
