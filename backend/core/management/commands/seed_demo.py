"""Commande `seed_demo` — version minimale Sprint 1, idempotente.

Crée le superuser `admin@amlak.ma` / `admin` s'il n'existe pas.
Le UserSettings est créé automatiquement via le signal post_save (accounts.signals).
"""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from core.models.user_settings import UserSettings

User = get_user_model()

DEMO_EMAIL = "admin@amlak.ma"
DEMO_PASSWORD = "admin"  # noqa: S105 - seed dev uniquement, doc l'indique


class Command(BaseCommand):
    help = "Seed minimal — crée le superuser admin@amlak.ma / admin (idempotent)."

    @transaction.atomic
    def handle(self, *args: Any, **options: Any) -> None:
        user, created = User.objects.get_or_create(
            email=DEMO_EMAIL,
            defaults={
                "first_name": "Admin",
                "last_name": "Amlak",
                "is_staff": True,
                "is_superuser": True,
                "is_active": True,
                "locale": "fr-MA",
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()

        # Sécurité : si le signal n'a pas tourné (ex: fixture, migration data), on complète.
        UserSettings.objects.get_or_create(user=user)

        self.stdout.write(
            self.style.SUCCESS(f"Seed OK - user={'créé' if created else 'existant'} ({DEMO_EMAIL})")
        )
