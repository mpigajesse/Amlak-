"""Modèle `Supplier` — répertoire des fournisseurs scopé par owner.

Spec : `01-backend/models/supplier.md`.

Règles :
- `owner` FK User — tous les suppliers sont multi-tenant.
- `name` unique par owner.
- `ice` (Identifiant Commun de l'Entreprise marocain) : 15 chiffres exactement
  quand fourni, vide sinon.
- `category` : liste de types de fournisseurs du BTP marocain.
"""
from __future__ import annotations

import re

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

ICE_LENGTH = 15


def validate_ice(value: str) -> None:
    """Valide qu'un ICE contient exactement 15 chiffres.

    Vide/None est accepté : la validation n'est pas bloquante si l'ICE n'est
    pas fourni. Utilisé aussi bien côté modèle (clean/full_clean) que côté
    sérializer.
    """
    if not value:
        return
    if not re.fullmatch(rf"\d{{{ICE_LENGTH}}}", value):
        raise ValidationError(
            "L'ICE doit contenir exactement 15 chiffres.",
            code="invalid_ice",
        )


class SupplierCategory(models.TextChoices):
    """Catégories de fournisseurs du BTP / promotion immobilière."""

    GROS_OEUVRE = "gros_oeuvre", "Gros œuvre"
    SECOND_OEUVRE = "second_oeuvre", "Second œuvre"
    ARCHITECTE = "architecte", "Architecte"
    BUREAU_ETUDES = "bureau_etudes", "Bureau d'études"
    NOTAIRE = "notaire", "Notaire"
    COURTIER = "courtier", "Courtier"
    MATERIAUX = "materiaux", "Fournisseur de matériaux"
    ARTISAN = "artisan", "Artisan"
    SERVICES = "services", "Services"
    AUTRE = "autre", "Autre"


class Supplier(models.Model):
    """Fournisseur (entrepreneur, artisan, architecte, notaire, courtier…).

    Tous les champs sensibles (téléphone, email, ICE, adresse) sont optionnels
    sauf `name`. `owner` est injecté automatiquement par `OwnerScopedViewSet`.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="suppliers",
        verbose_name="propriétaire",
    )
    name = models.CharField("nom", max_length=200)
    category = models.CharField(
        "catégorie",
        max_length=32,
        choices=SupplierCategory.choices,
        blank=True,
        default="",
    )
    phone = models.CharField("téléphone", max_length=50, blank=True, default="")
    email = models.EmailField("email", blank=True, default="")
    ice = models.CharField(
        "ICE",
        max_length=15,
        blank=True,
        default="",
        validators=[validate_ice],
        help_text="Identifiant Commun de l'Entreprise (15 chiffres).",
    )
    address = models.TextField("adresse", blank=True, default="")
    notes = models.TextField("notes", blank=True, default="")
    is_active = models.BooleanField("actif", default=True)

    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "fournisseur"
        verbose_name_plural = "fournisseurs"
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="unique_supplier_name_per_owner",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "category"]),
            models.Index(fields=["owner", "is_active"]),
        ]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name

    def clean(self) -> None:
        """Validation cross-fields — délègue à `validate_ice` pour l'ICE."""
        super().clean()
        validate_ice(self.ice)
