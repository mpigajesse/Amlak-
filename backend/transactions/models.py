"""Modèle Transaction — cœur financier de l'app.

Règles non négociables :
- amount_blanc + amount_noir > 0 (CheckConstraint DB + clean())
- Aucun log de montants ni numéros de chèques
- Tous les montants en Decimal(14,2), JAMAIS float
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import CheckConstraint, Q


class Transaction(models.Model):
    class Direction(models.TextChoices):
        IN = "in", "Entrée"
        OUT = "out", "Sortie"

    class PaymentMode(models.TextChoices):
        ESPECE = "espece", "Espèces"
        CHEQUE = "cheque", "Chèque"
        VIREMENT = "virement", "Virement"
        AUTRE = "autre", "Autre"

    class Category(models.TextChoices):
        ACQUISITION = "acquisition", "Acquisition"
        TRAVAUX = "travaux", "Travaux"
        ADMIN = "admin", "Administratif"
        COMMERCIALISATION = "commercialisation", "Commercialisation"
        VENTE = "vente", "Vente"
        AUTRE = "autre", "Autre"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )

    date = models.DateField()
    direction = models.CharField(max_length=5, choices=Direction.choices)
    payment_mode = models.CharField(max_length=20, choices=PaymentMode.choices)

    amount_blanc = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    amount_noir = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="transactions",
    )
    category = models.CharField(max_length=30, choices=Category.choices)
    subcategory = models.CharField(max_length=100, blank=True)

    supplier = models.ForeignKey(
        "suppliers.Supplier",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    stock_unit = models.ForeignKey(
        "units.StockUnit",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    acquisition = models.ForeignKey(
        "acquisitions.Acquisition",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    buyer_name_override = models.CharField(max_length=200, blank=True)

    cheque = models.OneToOneField(
        "cheques.Cheque",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction",
    )

    label = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["owner", "-date"]),
            models.Index(fields=["project", "-date"]),
            models.Index(fields=["supplier", "-date"]),
            models.Index(fields=["stock_unit"]),
            models.Index(fields=["direction", "category"]),
        ]
        constraints = [
            CheckConstraint(
                condition=Q(amount_blanc__gte=0) & Q(amount_noir__gte=0),
                name="transactions_amounts_non_negative",
            ),
            CheckConstraint(
                condition=~(Q(amount_blanc=0) & Q(amount_noir=0)),
                name="transactions_amount_total_positive",
            ),
        ]

    def __str__(self) -> str:
        return f"Tx #{self.pk} {self.direction} {self.date}"

    @property
    def amount_total(self) -> Decimal:
        return (self.amount_blanc or Decimal("0")) + (self.amount_noir or Decimal("0"))

    def clean(self) -> None:
        if self.amount_blanc is not None and self.amount_blanc < 0:
            raise ValidationError(
                {"amount_blanc": "Le montant Blanc ne peut pas être négatif."}
            )
        if self.amount_noir is not None and self.amount_noir < 0:
            raise ValidationError(
                {"amount_noir": "Le montant Noir ne peut pas être négatif."}
            )
        if self.amount_total <= Decimal("0"):
            raise ValidationError(
                f"Le montant total ({settings.LIBELLE_BLANC} + {settings.LIBELLE_NOIR}) doit être strictement positif."
            )
