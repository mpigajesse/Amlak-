"""Modèle `Project` — opération immobilière.

Spec : `01-backend/models/project.md`.
"""

from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class Project(models.Model):
    """Conteneur analytique d'une opération immobilière."""

    STAGE_OPPORTUNITE = "opportunite"
    STAGE_ACTIF = "actif"
    STAGE_CLOTURE = "cloture"

    STAGE_CHOICES = [
        (STAGE_OPPORTUNITE, "Opportunité"),
        (STAGE_ACTIF, "Actif"),
        (STAGE_CLOTURE, "Clôturé"),
    ]

    COST_ALLOC_SURFACE = "surface"
    COST_ALLOC_EGAL = "egal"
    COST_ALLOC_PONDERATION = "ponderation"

    COST_ALLOCATION_CHOICES = [
        (COST_ALLOC_SURFACE, "Au m²"),
        (COST_ALLOC_EGAL, "Égale"),
        (COST_ALLOC_PONDERATION, "Pondérée"),
    ]

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
        verbose_name="propriétaire",
    )

    name = models.CharField("nom", max_length=200)
    location = models.CharField("localisation", max_length=200, blank=True)
    description = models.TextField("description", blank=True)
    stage = models.CharField(
        "phase",
        max_length=20,
        choices=STAGE_CHOICES,
        default=STAGE_OPPORTUNITE,
    )

    # Budget prévisionnel par catégorie (DH, totaux B+N).
    budget_acquisition = models.DecimalField(
        "budget acquisition",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
    )
    budget_travaux = models.DecimalField(
        "budget travaux",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
    )
    budget_admin = models.DecimalField(
        "budget administratif",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
    )
    budget_commercialisation = models.DecimalField(
        "budget commercialisation",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
    )

    cost_allocation_method = models.CharField(
        "méthode de répartition des coûts",
        max_length=20,
        choices=COST_ALLOCATION_CHOICES,
        default=COST_ALLOC_SURFACE,
    )

    expected_delivery_date = models.DateField(
        "date de livraison prévue",
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)
    closed_at = models.DateTimeField("clôturé le", null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "projet"
        verbose_name_plural = "projets"
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "name"],
                name="unique_project_name_per_owner",
            ),
            models.CheckConstraint(
                condition=models.Q(budget_acquisition__gte=0),
                name="project_budget_acquisition_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(budget_travaux__gte=0),
                name="project_budget_travaux_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(budget_admin__gte=0),
                name="project_budget_admin_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(budget_commercialisation__gte=0),
                name="project_budget_commercialisation_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "stage"]),
            models.Index(fields=["owner", "-created_at"]),
        ]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name

    @property
    def budget_total(self) -> Decimal:
        """Total des budgets par catégorie (toujours calculé, jamais stocké)."""
        return (
            self.budget_acquisition
            + self.budget_travaux
            + self.budget_admin
            + self.budget_commercialisation
        )

    def clean(self) -> None:
        """Validation cross-fields : budgets non négatifs + nom non vide."""
        super().clean()
        errors: dict[str, str] = {}

        if not self.name or not self.name.strip():
            errors["name"] = "Le nom est requis."

        for field_name, label in (
            ("budget_acquisition", "acquisition"),
            ("budget_travaux", "travaux"),
            ("budget_admin", "administratif"),
            ("budget_commercialisation", "commercialisation"),
        ):
            value = getattr(self, field_name)
            if value is not None and value < 0:
                errors[field_name] = f"Le budget {label} doit être positif ou nul."

        if errors:
            raise ValidationError(errors)
