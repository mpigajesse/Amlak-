"""Modèle `UserSettings` — préférences par utilisateur.

Version Sprint 1 minimale. Les champs riches (custom_unit_types, dashboard_widgets, etc.)
viendront aux sprints correspondants via migrations additives.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models


class UserSettings(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="settings",
        verbose_name="utilisateur",
    )
    notifications_enabled = models.BooleanField("notifications activées", default=True)
    alert_thresholds = models.JSONField(
        "seuils d'alertes",
        default=dict,
        blank=True,
        help_text="Ex: {'cheque_days': [7, 3, 1]}.",
    )
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        verbose_name = "paramètres utilisateur"
        verbose_name_plural = "paramètres utilisateur"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"Settings({self.user_id})"
