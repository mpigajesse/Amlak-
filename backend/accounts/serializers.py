"""Serializers de l'app `accounts` — auth + profil utilisateur."""
from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.models.user_settings import UserSettings

User = get_user_model()


class UserSettingsSerializer(serializers.ModelSerializer):
    """Sous-serializer read-only pour les paramètres utilisateur."""

    class Meta:
        model = UserSettings
        fields = ["notifications_enabled", "alert_thresholds"]
        read_only_fields = fields


class UserMeSerializer(serializers.ModelSerializer):
    """Serializer principal pour `/auth/me/` et sous-bloc `user` de `/auth/login/`."""

    settings = UserSettingsSerializer(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "locale", "settings"]
        read_only_fields = fields


class LoginSerializer(TokenObtainPairSerializer):
    """Login basé sur email/password. Retourne `access` + `user` (refresh → cookie).

    `TokenObtainPairSerializer` utilise déjà `USERNAME_FIELD` = `email` grâce à notre User.
    """

    # Messages FR explicites en cas d'échec.
    default_error_messages = {
        "no_active_account": "Identifiants invalides.",
    }

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        data = super().validate(attrs)
        # `data` contient `access` et `refresh`. On ajoute le user complet.
        data["user"] = UserMeSerializer(self.user).data
        return data
