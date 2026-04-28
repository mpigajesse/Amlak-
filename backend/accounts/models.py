"""Modèle User custom — email comme USERNAME_FIELD."""
from __future__ import annotations

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UserManager(BaseUserManager):
    """Manager User où l'identifiant primaire est l'email (pas username)."""

    use_in_migrations = True

    def _create(self, email: str, password: str | None, **extra_fields: object) -> "User":
        if not email:
            raise ValueError("L'email est obligatoire.")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(
        self, email: str, password: str | None = None, **extra_fields: object
    ) -> "User":
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create(email, password, **extra_fields)

    def create_superuser(
        self, email: str, password: str | None = None, **extra_fields: object
    ) -> "User":
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser doit avoir is_superuser=True.")
        return self._create(email, password, **extra_fields)


class User(AbstractUser):
    """Utilisateur Amlak. `email` unique remplace `username`."""

    username = None  # on supprime le username legacy
    email = models.EmailField("email", unique=True)
    locale = models.CharField(
        "langue",
        max_length=10,
        default="fr-MA",
        help_text="Locale de l'interface utilisateur (ex: fr-MA).",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []  # first_name/last_name optionnels

    objects = UserManager()

    class Meta(AbstractUser.Meta):
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.email
