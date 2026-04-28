"""Serializers pour l'app `suppliers`.

Deux serializers exposés :
- `SupplierSerializer` : CRUD complet pour l'API REST.
- `SupplierLightSerializer` : nested dans d'autres apps (Transaction, Cheque…).
"""
from __future__ import annotations

from rest_framework import serializers

from suppliers.models import Supplier, validate_ice


class SupplierSerializer(serializers.ModelSerializer):
    """Sérialisation complète d'un fournisseur (CRUD)."""

    category_display = serializers.CharField(
        source="get_category_display", read_only=True
    )

    class Meta:
        model = Supplier
        fields = (
            "id",
            "name",
            "category",
            "category_display",
            "phone",
            "email",
            "ice",
            "address",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "category_display")

    def validate_ice(self, value: str) -> str:
        """Valide le format ICE : 15 chiffres exactement (ou vide).

        Message : "L'ICE doit contenir exactement 15 chiffres."
        """
        try:
            validate_ice(value)
        except Exception as exc:  # django.core.exceptions.ValidationError
            message = getattr(exc, "message", None) or str(exc)
            raise serializers.ValidationError(message) from exc
        return value

    def validate_name(self, value: str) -> str:
        value = (value or "").strip()
        if not value:
            raise serializers.ValidationError("Le nom est requis.")
        return value


class SupplierLightSerializer(serializers.ModelSerializer):
    """Version allégée pour nested dans d'autres apps (Transaction, Cheque)."""

    class Meta:
        model = Supplier
        fields = ("id", "name", "category", "phone")
        read_only_fields = fields
