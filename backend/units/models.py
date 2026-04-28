"""Modèle `StockUnit` — bien vendable issu (souvent) d'une Acquisition.

Spec : `01-backend/models/stock-unit.md` + mission Sprint 2 "units".

Cycle Vente (stage) :
    stock → reservation → compromis → encaisse

Règles métier :
- `owner` FK User — multi-tenant.
- `project` FK Project (related_name='stock_units').
- `acquisition` FK Acquisition nullable (related_name='generated_units').
- `label` est unique par (project, owner) — référence lisible ("A3-12").
- Montants : DecimalField(14, 2) — JAMAIS de float.
- `margin_previsionnelle` = (price_negotiated or price_asked) - allocated_cost.
- Transitions linéaires via les actions `reserve`, `sign-compromis`, `cash` (cf views).
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models


class UnitType(models.TextChoices):
    """Types d'unités — dérivés du glossaire produit."""

    APPARTEMENT = "appartement", "Appartement"
    MAGASIN = "magasin", "Magasin"
    VILLA = "villa", "Villa"
    LOT = "lot", "Lot"
    AUTRE = "autre", "Autre"


class UnitStage(models.TextChoices):
    """Étapes du cycle Vente (ordre = ordre métier)."""

    STOCK = "stock", "Stock disponible"
    RESERVATION = "reservation", "Réservation"
    COMPROMIS = "compromis", "Compromis"
    ENCAISSE = "encaisse", "Encaissé"


# Ordre canonique — utilisé pour comprendre les transitions autorisées.
STAGE_ORDER: tuple[str, ...] = (
    UnitStage.STOCK.value,
    UnitStage.RESERVATION.value,
    UnitStage.COMPROMIS.value,
    UnitStage.ENCAISSE.value,
)


class StockUnit(models.Model):
    """Bien vendable individuel — traverse le cycle Vente."""

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="stock_units",
        verbose_name="propriétaire",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="stock_units",
        verbose_name="projet",
    )
    acquisition = models.ForeignKey(
        "acquisitions.Acquisition",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="generated_units",
        verbose_name="acquisition source",
    )

    label = models.CharField(
        "référence",
        max_length=100,
        help_text='Référence lisible (ex: "A3-12", "Lot 7", "Mag RDC-2").',
    )
    unit_type = models.CharField(
        "type d'unité",
        max_length=20,
        choices=UnitType.choices,
        default=UnitType.APPARTEMENT,
    )

    surface_m2 = models.DecimalField(
        "surface (m²)",
        max_digits=14,
        decimal_places=2,
    )

    price_asked = models.DecimalField(
        "prix demandé",
        max_digits=14,
        decimal_places=2,
    )
    price_negotiated = models.DecimalField(
        "prix négocié",
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )

    stage = models.CharField(
        "étape",
        max_length=20,
        choices=UnitStage.choices,
        default=UnitStage.STOCK,
    )

    # Acheteur simple (cf glossaire : pas de fiche acheteur dédiée).
    buyer_name = models.CharField("nom acheteur", max_length=200, blank=True, default="")
    buyer_phone = models.CharField(
        "téléphone acheteur", max_length=50, blank=True, default=""
    )

    # Coût imputé à l'unité (calculé/réparti depuis le projet).
    allocated_cost = models.DecimalField(
        "coût imputé",
        max_digits=14,
        decimal_places=2,
        default=Decimal("0"),
    )

    reserved_at = models.DateField("date de réservation", null=True, blank=True)
    compromis_at = models.DateField("date de compromis", null=True, blank=True)
    encaisse_at = models.DateField("date d'encaissement", null=True, blank=True)

    notes = models.TextField("notes", blank=True, default="")

    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("mis à jour le", auto_now=True)

    class Meta:
        ordering = ["project", "label"]
        verbose_name = "unité de stock"
        verbose_name_plural = "unités de stock"
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "project", "label"],
                name="unique_unit_label_per_owner_project",
            ),
            models.CheckConstraint(
                condition=models.Q(surface_m2__gte=0),
                name="stockunit_surface_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(price_asked__gte=0),
                name="stockunit_price_asked_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(price_negotiated__isnull=True)
                | models.Q(price_negotiated__gte=0),
                name="stockunit_price_negotiated_non_negative",
            ),
            models.CheckConstraint(
                condition=models.Q(allocated_cost__gte=0),
                name="stockunit_allocated_cost_non_negative",
            ),
        ]
        indexes = [
            models.Index(fields=["owner", "stage"]),
            models.Index(fields=["project", "stage"]),
            models.Index(fields=["acquisition"]),
        ]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"{self.get_unit_type_display()} {self.label}"

    # --- Propriétés dérivées ---

    @property
    def effective_price(self) -> Decimal:
        """Prix retenu : négocié s'il existe, sinon demandé."""
        return self.price_negotiated if self.price_negotiated is not None else self.price_asked

    @property
    def margin_previsionnelle(self) -> Decimal:
        """Marge prévisionnelle = prix effectif - coût imputé."""
        return self.effective_price - self.allocated_cost

    # --- Validation cross-fields ---

    def clean(self) -> None:
        """Validation croisée : cohérence owner / project / acquisition et montants."""
        super().clean()
        errors: dict[str, str] = {}

        if not self.label or not self.label.strip():
            errors["label"] = "La référence est requise."

        # Project doit appartenir au même owner.
        if self.project_id and self.owner_id:
            if self.project.owner_id != self.owner_id:
                errors["project"] = "Ce projet n'appartient pas au propriétaire."

        # Acquisition (si fournie) doit appartenir au même owner et au même project.
        if self.acquisition_id and self.owner_id:
            if self.acquisition.owner_id != self.owner_id:
                errors["acquisition"] = "Cette acquisition n'appartient pas au propriétaire."
            elif self.project_id and self.acquisition.project_id != self.project_id:
                errors["acquisition"] = (
                    "Cette acquisition appartient à un autre projet."
                )

        # Montants positifs.
        for field_name, label in (
            ("surface_m2", "surface"),
            ("price_asked", "prix demandé"),
            ("allocated_cost", "coût imputé"),
        ):
            value = getattr(self, field_name, None)
            if value is not None and value < Decimal("0"):
                errors[field_name] = f"Le champ {label} doit être positif ou nul."

        if self.price_negotiated is not None and self.price_negotiated < Decimal("0"):
            errors["price_negotiated"] = "Le prix négocié doit être positif ou nul."

        if errors:
            raise ValidationError(errors)
