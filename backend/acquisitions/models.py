"""Modèle `Acquisition` — bien/terrain en cours d'acquisition (cycle Achat).

Spec : `01-backend/models/acquisition.md`.

Règles métier :
- `owner` FK User — multi-tenant.
- `project` FK Project (related_name='acquisitions').
- `stage` ∈ {opportunite, negociation, promis, compromis, reserve, achete}.
- Transitions linéaires : seule l'étape suivante immédiate est autorisée via
  l'action `advance-stage` (pas de saut, pas de retour). Un `PATCH` direct sur
  `stage` reste possible pour corriger, mais `advance-stage` valide strictement.
- Montants : DecimalField(14, 2) — JAMAIS de float.
- `option_deadline` : scanné par les alertes (Celery) — avertissement si proche.
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class AcquisitionStage(models.TextChoices):
    """Étapes du cycle Achat (ordre = ordre métier)."""

    OPPORTUNITE = "opportunite", "Opportunité"
    NEGOCIATION = "negociation", "Négociation"
    PROMIS = "promis", "Promis"
    COMPROMIS = "compromis", "Compromis"
    RESERVE = "reserve", "Réservé"
    ACHETE = "achete", "Acheté"


# Ordre canonique des étapes — utilisé pour valider les transitions
# et pour calculer "l'étape suivante" via `advance-stage`.
STAGE_ORDER: tuple[str, ...] = (
    AcquisitionStage.OPPORTUNITE.value,
    AcquisitionStage.NEGOCIATION.value,
    AcquisitionStage.PROMIS.value,
    AcquisitionStage.COMPROMIS.value,
    AcquisitionStage.RESERVE.value,
    AcquisitionStage.ACHETE.value,
)


def next_stage(current: str) -> str | None:
    """Retourne l'étape suivant immédiatement `current`, ou None si terminal."""
    try:
        idx = STAGE_ORDER.index(current)
    except ValueError:
        return None
    if idx + 1 >= len(STAGE_ORDER):
        return None
    return STAGE_ORDER[idx + 1]


class Acquisition(models.Model):
    """Bien/terrain au sein d'une opération (Project) — traverse le cycle Achat."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="acquisitions",
        verbose_name="propriétaire",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="acquisitions",
        verbose_name="projet",
    )

    title = models.CharField("intitulé", max_length=200)
    stage = models.CharField(
        "étape",
        max_length=20,
        choices=AcquisitionStage.choices,
        default=AcquisitionStage.OPPORTUNITE,
    )

    surface_m2 = models.DecimalField(
        "surface (m²)",
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    asking_price = models.DecimalField(
        "prix demandé",
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    negotiated_price = models.DecimalField(
        "prix négocié",
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    arrhes_amount = models.DecimalField(
        "arrhes",
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )

    option_deadline = models.DateField(
        "échéance d'option",
        null=True,
        blank=True,
        help_text="Date limite pour lever l'option — scannée par les alertes.",
    )

    seller_name = models.CharField("nom du vendeur", max_length=200, blank=True, default="")
    seller_phone = models.CharField(
        "téléphone du vendeur", max_length=50, blank=True, default=""
    )
    address = models.TextField("adresse", blank=True, default="")
    notes = models.TextField("notes", blank=True, default="")

    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "acquisition"
        verbose_name_plural = "acquisitions"
        indexes = [
            models.Index(fields=["owner", "stage"]),
            models.Index(fields=["project", "stage"]),
            models.Index(fields=["option_deadline"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(surface_m2__isnull=True)
                | models.Q(surface_m2__gte=0),
                name="acquisition_surface_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(asking_price__isnull=True)
                | models.Q(asking_price__gte=0),
                name="acquisition_asking_price_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(negotiated_price__isnull=True)
                | models.Q(negotiated_price__gte=0),
                name="acquisition_negotiated_price_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(arrhes_amount__isnull=True)
                | models.Q(arrhes_amount__gte=0),
                name="acquisition_arrhes_non_negative",
            ),
        ]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.title} ({self.get_stage_display()})"

    @property
    def is_stage_active(self) -> bool:
        """True tant que l'acquisition n'est pas au stade terminal `achete`."""
        return self.stage != AcquisitionStage.ACHETE.value

    def clean(self) -> None:
        """Validation cross-fields : cohérence du project (même owner) + montants."""
        super().clean()
        errors: dict[str, str] = {}

        # Project doit appartenir au même owner.
        if self.project_id and self.owner_id:
            if self.project.owner_id != self.owner_id:
                errors["project"] = "Ce projet n'appartient pas au propriétaire."

        for field_name, label in (
            ("surface_m2", "surface"),
            ("asking_price", "prix demandé"),
            ("negotiated_price", "prix négocié"),
            ("arrhes_amount", "arrhes"),
        ):
            value = getattr(self, field_name)
            if value is not None and value < Decimal("0"):
                errors[field_name] = f"Le champ {label} doit être positif ou nul."

        if errors:
            raise ValidationError(errors)
