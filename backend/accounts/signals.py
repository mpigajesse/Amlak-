"""Signaux `accounts`.

⚠ Un seul signal ici, documenté : à la création d'un User on crée un UserSettings associé.
Pour éviter les imports circulaires, on utilise `settings.AUTH_USER_MODEL` comme sender.
"""
from __future__ import annotations

from typing import Any

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_user_settings(
    sender: type, instance: Any, created: bool, **kwargs: Any
) -> None:
    """Crée le `UserSettings` correspondant à la création du User."""
    if not created:
        return
    # Import tardif pour éviter la circularité au chargement de l'app.
    from core.models.user_settings import UserSettings

    UserSettings.objects.get_or_create(user=instance)
