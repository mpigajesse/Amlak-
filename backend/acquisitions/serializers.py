"""Serializers DRF pour l'app `acquisitions`.

Conventions (`01-backend/api/conventions.md`) :
  - Tous les montants `Decimal` exposés en **string** (coerce_to_string=True).
  - Champs `*_display` pour les choix.
  - Light serializer pour nested dans d'autres apps.
"""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from acquisitions.models import Acquisition
from projects.models import Project


# --- Messages d'erreur FR ---
ERROR_TITLE_REQUIRED = "L'intitulé est requis."
ERROR_AMOUNT_NEGATIVE = "Le montant doit être positif ou nul."
ERROR_AMOUNT_INVALID = "Montant invalide."
ERROR_PROJECT_FOREIGN = "Ce projet n'existe pas."


def _money_field(**extra) -> serializers.DecimalField:
    """Champ DecimalField argent standard : 14,2, serialisé en string."""
    return serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0"),
        error_messages={
            "min_value": ERROR_AMOUNT_NEGATIVE,
            "invalid": ERROR_AMOUNT_INVALID,
        },
        **extra,
    )


class AcquisitionSerializer(serializers.ModelSerializer):
    """Sérialisation complète (CRUD)."""

    surface_m2 = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0"),
        required=False,
        allow_null=True,
        error_messages={
            "min_value": ERROR_AMOUNT_NEGATIVE,
            "invalid": ERROR_AMOUNT_INVALID,
        },
    )
    asking_price = _money_field(required=False, allow_null=True)
    negotiated_price = _money_field(required=False, allow_null=True)
    arrhes_amount = _money_field(required=False, allow_null=True)

    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    is_stage_active = serializers.BooleanField(read_only=True)

    class Meta:
        model = Acquisition
        fields = (
            "id",
            "project",
            "title",
            "stage",
            "stage_display",
            "is_stage_active",
            "surface_m2",
            "asking_price",
            "negotiated_price",
            "arrhes_amount",
            "option_deadline",
            "seller_name",
            "seller_phone",
            "address",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "stage_display",
            "is_stage_active",
            "created_at",
            "updated_at",
        )

    def validate_title(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(ERROR_TITLE_REQUIRED)
        return value

    def validate_project(self, value: Project) -> Project:
        """Refuse un project qui n'appartient pas au user courant (404-like via 400)."""
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user is not None and user.is_authenticated and value.owner_id != user.id:
            raise serializers.ValidationError(ERROR_PROJECT_FOREIGN)
        return value


class AcquisitionLightSerializer(serializers.ModelSerializer):
    """Version allégée pour nested dans d'autres serializers / listings kanban."""

    stage_display = serializers.CharField(source="get_stage_display", read_only=True)

    class Meta:
        model = Acquisition
        fields = ("id", "title", "stage", "stage_display", "project")
        read_only_fields = fields
