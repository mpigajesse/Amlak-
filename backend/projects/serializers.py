"""Serializers DRF pour `Project`.

Conventions (`01-backend/api/conventions.md`) :
  - Tous les montants `Decimal` exposés en **string** (coerce_to_string=True).
  - Champs `*_display` pour les choix.
  - List serializer light / Detail serializer riche.
"""

from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from projects.models import Project

# --- Messages d'erreur FR (centralisés) ---
ERROR_NAME_REQUIRED = "Le nom est requis."
ERROR_NAME_TOO_LONG = "Le nom ne doit pas dépasser 200 caractères."
ERROR_BUDGET_NEGATIVE = "Le montant doit être positif ou nul."
ERROR_BUDGET_INVALID = "Budget invalide."


def _money_field(**extra) -> serializers.DecimalField:
    """Champ DecimalField argent standard : 14,2, serialisé en string."""
    return serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        coerce_to_string=True,
        min_value=Decimal("0"),
        error_messages={
            "min_value": ERROR_BUDGET_NEGATIVE,
            "invalid": ERROR_BUDGET_INVALID,
        },
        **extra,
    )


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer write complet (create / update)."""

    budget_acquisition = _money_field(required=False)
    budget_travaux = _money_field(required=False)
    budget_admin = _money_field(required=False)
    budget_commercialisation = _money_field(required=False)
    budget_total = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        coerce_to_string=True,
        read_only=True,
    )
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)
    cost_allocation_method_display = serializers.CharField(
        source="get_cost_allocation_method_display",
        read_only=True,
    )

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "location",
            "description",
            "stage",
            "stage_display",
            "budget_acquisition",
            "budget_travaux",
            "budget_admin",
            "budget_commercialisation",
            "budget_total",
            "cost_allocation_method",
            "cost_allocation_method_display",
            "expected_delivery_date",
            "created_at",
            "updated_at",
            "closed_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "closed_at",
            "budget_total",
            "stage_display",
            "cost_allocation_method_display",
        ]

    def validate_name(self, value: str) -> str:
        """Exige un nom non vide (strip)."""
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError(ERROR_NAME_REQUIRED)
        if len(value) > 200:
            raise serializers.ValidationError(ERROR_NAME_TOO_LONG)
        return value

    def validate(self, attrs: dict) -> dict:
        """Garantit l'unicité (owner, name) au niveau API — 400 plutôt que 500 DB."""
        request = self.context.get("request")
        owner = getattr(request, "user", None) if request else None
        name = attrs.get("name") or (self.instance.name if self.instance else None)

        if owner is not None and name and owner.is_authenticated:
            qs = Project.objects.filter(owner=owner, name=name)
            if self.instance is not None:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError({"name": "Un projet avec ce nom existe déjà."})
        return attrs


class ProjectListSerializer(serializers.ModelSerializer):
    """Serializer liste (light) — évite de renvoyer toute la description."""

    budget_total = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        coerce_to_string=True,
        read_only=True,
    )
    stage_display = serializers.CharField(source="get_stage_display", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "location",
            "stage",
            "stage_display",
            "budget_total",
            "expected_delivery_date",
            "created_at",
        ]
        read_only_fields = fields


class ProjectDetailSerializer(ProjectSerializer):
    """Serializer detail — identique au write pour le Sprint 2.

    Les KPIs calculés (position cash, budget_status, counts) seront ajoutés
    dans Sprint 4 quand les services de calcul existeront.
    """

    class Meta(ProjectSerializer.Meta):
        pass
