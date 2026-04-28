"""
Tests for seed_demo management command (Sprint 1).

Tests that the command correctly creates the demo user and is idempotent.
"""

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from core.models.user_settings import UserSettings

User = get_user_model()


@pytest.mark.django_db
class TestSeedDemo:
    """Tests for the seed_demo management command."""

    def test_seed_demo_creates_admin_user(self):
        """
        Test that running seed_demo creates the admin@amlak.ma user
        with password 'admin'.
        """
        # Run the seed_demo command
        call_command("seed_demo")

        # Verify admin user exists
        assert User.objects.filter(email="admin@amlak.ma").exists()

        admin_user = User.objects.get(email="admin@amlak.ma")

        # Verify basic user details
        assert admin_user.first_name == "Admin"
        assert admin_user.last_name == "Amlak"
        assert admin_user.is_staff is True
        assert admin_user.is_superuser is True
        assert admin_user.locale == "fr-MA"

        # Verify password is set correctly
        assert admin_user.check_password("admin")

        # Verify UserSettings are created
        assert hasattr(admin_user, "settings")
        assert UserSettings.objects.filter(user=admin_user).exists()

    def test_seed_demo_is_idempotent(self):
        """
        Test that running seed_demo twice doesn't create duplicate users.
        The command should use get_or_create to be idempotent.
        """
        # Run seed_demo first time
        call_command("seed_demo")

        # Count users
        user_count_first = User.objects.filter(email="admin@amlak.ma").count()
        assert user_count_first == 1

        # Run seed_demo second time
        call_command("seed_demo")

        # Count users again — should still be 1
        user_count_second = User.objects.filter(email="admin@amlak.ma").count()
        assert user_count_second == 1

        # Verify UserSettings also remains 1
        admin_user = User.objects.get(email="admin@amlak.ma")
        settings_count = UserSettings.objects.filter(user=admin_user).count()
        assert settings_count == 1

    def test_seed_demo_updates_existing_user(self):
        """
        Test that if the admin user already exists, seed_demo
        doesn't break and the user remains unchanged
        (or is updated if needed).
        """
        # Create the user manually first
        admin_user = User.objects.create_user(
            email="admin@amlak.ma",
            password="old_password",
            first_name="Old",
            last_name="Admin",
        )
        initial_id = admin_user.id

        # Run seed_demo
        call_command("seed_demo")

        # Verify the user still exists with the same ID
        admin_user.refresh_from_db()
        assert admin_user.id == initial_id
        assert admin_user.email == "admin@amlak.ma"

        # Verify UserSettings were created if not already present
        if not hasattr(admin_user, "settings"):
            pytest.fail("UserSettings should be created by signal")

    def test_seed_demo_user_can_login(self):
        """
        Test that the admin user created by seed_demo can successfully log in
        with the correct credentials.
        """
        call_command("seed_demo")

        admin_user = User.objects.get(email="admin@amlak.ma")

        # Verify password is correct
        assert admin_user.check_password("admin")

        # Verify incorrect password fails
        assert not admin_user.check_password("wrong_password")
