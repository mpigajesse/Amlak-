"""Serializers DRF pour l'app `units`.

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
from units.models import StockUnit, UnitStage, UnitType


# --- Messages d'erreur FR ---
ERROR_LABEL_REQUIRED = "La référence est requise."
ERROR_AMOUNT_NEGATIVE = "Le montant doit être positif ou nul."
ERROR_AMOUNT_INVALID = "Montant invalide."
ERROR_PROJECT_FOREIGN = "Ce projet n'existe pas."
ERROR_ACQUISITION_FOREIGN = "Cette acquisition n'existe pas."
ERROR_ACQUISITION_PROJECT_MISMATCH = (
    "L'acquisition ne correspond pas au projet de l'unité."
)


def _money_field(*, required: bool = True, allow_null: bool = False, **extra):
    """Champ DecimalField argent standard : 14,2, serialisé en string."""
    return serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0"),
        required=required,
        allow_null=allow_null,
        error_messages={
            "min_value": ERROR_AMOUNT_NEGATIVE,
            "invalid": ERROR_AMOUNT_INVALID,
        },
        **extra,
    )


class StockUnitSerializer(serializers.ModelSerializer):
    """Sérialisation complète (CRUD)."""

    surface_m2 = _money_field()
    price_asked = _money_field()
    price_negotiated = _money_field(required=False, allow_null=True)
    allocated_cost = _money_field(required=False)

    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    unit_type_display = serializers.CharField(
        source="get_unit_type_display", read_only=True
    )
    margin_previsionnelle = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        coerce_to_string=True,
        read_only=True,
    )

    class Meta:
        model = StockUnit
        fields = (
            "id",
            "project",
            "acquisition",
            "label",
            "unit_type",
            "unit_type_display",
            "surface_m2",
            "price_asked",
            "price_negotiated",
            "stage",
            "stage_display",
            "buyer_name",
            "buyer_phone",
            "allocated_cost",
            "reserved_at",
            "compromis_at",
            "encaisse_at",
            "notes",
            "margin_previsionnelle",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "stage",
            "stage_display",
            "unit_type_display",
            "margin_previsionnelle",
            "reserved_at",
            "compromis_at",
            "encaisse_at",
            "created_at",
            "updated_at",
        )

    def validate_label(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(ERROR_LABEL_REQUIRED)
        return value

    def validate_project(self, value: Project) -> Project:
        """Refuse un project qui n'appartient pas au user courant."""
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user is not None and user.is_authenticated and value.owner_id != user.id:
            raise serializers.ValidationError(ERROR_PROJECT_FOREIGN)
        return value

    def validate_acquisition(self, value: Acquisition | None) -> Acquisition | None:
        """Refuse une acquisition qui n'appartient pas au user courant."""
        if value is None:
            return value
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user is not None and user.is_authenticated and value.owner_id != user.id:
            raise serializers.ValidationError(ERROR_ACQUISITION_FOREIGN)
        return value

    def validate(self, attrs: dict) -> dict:
        """Cross-field : acquisition doit appartenir au même project."""
        acquisition = attrs.get("acquisition") or getattr(self.instance, "acquisition", None)
        project = attrs.get("project") or getattr(self.instance, "project", None)
        if acquisition and project and acquisition.project_id != project.id:
            raise serializers.ValidationError(
                {"acquisition": ERROR_ACQUISITION_PROJECT_MISMATCH}
            )
        return attrs


class StockUnitLightSerializer(serializers.ModelSerializer):
    """Version allégée pour nested dans d'autres serializers / listings kanban."""

    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    unit_type_display = serializers.CharField(
        source="get_unit_type_display", read_only=True
    )
    price_asked = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True, read_only=True
    )
    price_negotiated = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True, read_only=True
    )

    class Meta:
        model = StockUnit
        fields = (
            "id",
            "label",
            "unit_type",
            "unit_type_display",
            "stage",
            "stage_display",
            "price_asked",
            "price_negotiated",
            "project",
        )
        read_only_fields = fields


# --- Action payloads ---


class ReserveUnitSerializer(serializers.Serializer):
    """Payload pour `POST /units/{id}/reserve/`."""

    buyer_name = serializers.CharField(max_length=200)
    buyer_phone = serializers.CharField(
        max_length=50, required=False, allow_blank=True, default=""
    )
    reserved_at = serializers.DateField(required=False)

    def validate_buyer_name(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Le nom de l'acheteur est requis.")
        return value


class SignCompromisSerializer(serializers.Serializer):
    """Payload pour `POST /units/{id}/sign-compromis/`."""

    compromis_at = serializers.DateField(required=False)
    price_negotiated = _money_field(required=False, allow_null=True)


class CashUnitSerializer(serializers.Serializer):
    """Payload pour `POST /units/{id}/cash/`."""

    encaisse_at = serializers.DateField(required=False)


class GenerateUnitItemSerializer(serializers.Serializer):
    """Une unité à créer via `POST /units/generate-from-acquisition/`."""

    label = serializers.CharField(max_length=100)
    unit_type = serializers.ChoiceField(
        choices=UnitType.choices, default=UnitType.APPARTEMENT
    )
    surface_m2 = _money_field()
    price_asked = _money_field()
    price_negotiated = _money_field(required=False, allow_null=True)
    allocated_cost = _money_field(required=False, default=Decimal("0"))
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def validate_label(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(ERROR_LABEL_REQUIRED)
        return value


class GenerateUnitsFromAcquisitionSerializer(serializers.Serializer):
    """Payload pour `POST /units/generate-from-acquisition/`.

    Crée en masse des `StockUnit` liées à une même acquisition.
    """

    acquisition = serializers.PrimaryKeyRelatedField(
        queryset=Acquisition.objects.all()
    )
    units = GenerateUnitItemSerializer(many=True)

    def validate_acquisition(self, value: Acquisition) -> Acquisition:
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user is not None and user.is_authenticated and value.owner_id != user.id:
            raise serializers.ValidationError(ERROR_ACQUISITION_FOREIGN)
        return value

    def validate_units(self, value: list[dict]) -> list[dict]:
        if not value:
            raise serializers.ValidationError("Au moins une unité est requise.")
        labels = [u["label"] for u in value]
        if len(labels) != len(set(labels)):
            raise serializers.ValidationError(
                "Les références doivent être uniques dans le lot."
            )
        return value
