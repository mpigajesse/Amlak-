"""Modèle Cheque — registre des chèques émis et reçus, avec B/N, OCR, alertes.

Règles :
- amount_blanc + amount_noir = amount (validé en clean())
- Numéro masqué dans logs (seulement les 4 derniers chiffres)
- Photos stockées en MEDIA privé, URL signée 15 min (TODO prod)
"""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


BANK_CHOICES = [
    ("attijariwafa", "Attijariwafa Bank"),
    ("bcp", "Banque Populaire (BCP)"),
    ("bmce", "BMCE Bank (Bank of Africa)"),
    ("cih", "CIH Bank"),
    ("cdm", "Crédit du Maroc"),
    ("sgma", "Société Générale Maroc (SGMA)"),
    ("bmci", "BMCI"),
    ("al_barid", "Al Barid Bank"),
    ("cam", "Crédit Agricole du Maroc"),
    ("cfg", "CFG Bank"),
    ("umnia", "Umnia Bank"),
    ("al_yousr", "Bank Al-Yousr"),
    ("dar_al_amane", "Dar Al Amane"),
    ("autre", "Autre"),
]


class Cheque(models.Model):
    class Direction(models.TextChoices):
        IN = "in", "Reçu"
        OUT = "out", "Émis"

    class Kind(models.TextChoices):
        NORMAL = "normal", "Normal"
        GARANTIE = "garantie", "Garantie"
        CAUTION = "caution", "Caution"
        POSTDATE = "postdate", "Postdaté"

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        CASHED = "cashed", "Encaissé"
        DEBITED = "debited", "Débité"
        REJECTED = "rejected", "Rejeté"
        CANCELLED = "cancelled", "Annulé"
        BLOCKED = "blocked", "Bloqué"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cheques",
    )

    direction = models.CharField(max_length=5, choices=Direction.choices)
    kind = models.CharField(max_length=15, choices=Kind.choices, default=Kind.NORMAL)

    number = models.CharField(max_length=50)
    bank = models.CharField(max_length=30, choices=BANK_CHOICES, default="autre")
    amount = models.DecimalField(
        max_digits=14, decimal_places=2, validators=[MinValueValidator(Decimal("0"))]
    )
    amount_blanc = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )
    amount_noir = models.DecimalField(
        max_digits=14, decimal_places=2, default=Decimal("0")
    )

    party_name = models.CharField(max_length=200)
    issue_date = models.DateField(null=True, blank=True)
    due_date = models.DateField()

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.PENDING
    )

    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="cheques",
    )
    supplier = models.ForeignKey(
        "suppliers.Supplier",
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name="cheques",
    )

    alert_days = models.JSONField(default=list, blank=True)

    photo_front = models.ImageField(upload_to="cheques/", null=True, blank=True)
    photo_back = models.ImageField(upload_to="cheques/", null=True, blank=True)
    ocr_raw = models.JSONField(null=True, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date"]
        indexes = [
            models.Index(fields=["owner", "due_date"]),
            models.Index(fields=["owner", "status"]),
            models.Index(fields=["supplier"]),
        ]

    def __str__(self) -> str:
        return f"Cheque #{self.pk} ****{self.number[-4:] if self.number else '----'}"

    @property
    def amount_total(self) -> Decimal:
        return (self.amount_blanc or Decimal("0")) + (self.amount_noir or Decimal("0"))

    @property
    def masked_number(self) -> str:
        if not self.number:
            return "****"
        return f"****{self.number[-4:]}"

    @property
    def status_display_smart(self) -> str:
        """Libellé contextuel : 'pending' devient 'À encaisser' ou 'À présenter'."""
        if self.status == self.Status.PENDING:
            return "À encaisser" if self.direction == self.Direction.IN else "À présenter"
        return dict(self.Status.choices).get(self.status, self.status)

    def clean(self) -> None:
        if self.amount_blanc is not None and self.amount_blanc < 0:
            raise ValidationError(
                {"amount_blanc": "Le montant Blanc ne peut pas être négatif."}
            )
        if self.amount_noir is not None and self.amount_noir < 0:
            raise ValidationError(
                {"amount_noir": "Le montant Noir ne peut pas être négatif."}
            )
        if self.amount_total != (self.amount or Decimal("0")):
            raise ValidationError(
                f"La somme {settings.LIBELLE_BLANC} + {settings.LIBELLE_NOIR} doit égaler le montant total du chèque."
            )
        # Statuts cohérents par direction
        in_statuses = {self.Status.PENDING, self.Status.CASHED, self.Status.REJECTED, self.Status.CANCELLED}
        out_statuses = {self.Status.PENDING, self.Status.DEBITED, self.Status.BLOCKED, self.Status.CANCELLED}
        if self.direction == self.Direction.IN and self.status not in in_statuses:
            raise ValidationError(
                {"status": f"Statut invalide pour un chèque reçu : {self.status}."}
            )
        if self.direction == self.Direction.OUT and self.status not in out_statuses:
            raise ValidationError(
                {"status": f"Statut invalide pour un chèque émis : {self.status}."}
            )
