"""Serializers Cheque — montants en string, number masqué en list view."""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .models import Cheque


class ChequeSerializer(serializers.ModelSerializer):
    """Détail complet — pour retrieve/create/update."""

    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    bank_display = serializers.CharField(source="get_bank_display", read_only=True)
    status_display = serializers.SerializerMethodField(read_only=True)
    amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )
    amount_blanc = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )
    amount_noir = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )
    amount_total = serializers.SerializerMethodField(read_only=True)
    photo_front_url = serializers.SerializerMethodField(read_only=True)
    photo_back_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Cheque
        fields = [
            "id",
            "direction",
            "direction_display",
            "kind",
            "kind_display",
            "number",
            "bank",
            "bank_display",
            "amount",
            "amount_blanc",
            "amount_noir",
            "amount_total",
            "party_name",
            "issue_date",
            "due_date",
            "status",
            "status_display",
            "project",
            "supplier",
            "alert_days",
            "photo_front",
            "photo_front_url",
            "photo_back",
            "photo_back_url",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "photo_front", "photo_back"]

    def get_status_display(self, obj):
        return obj.status_display_smart

    def get_amount_total(self, obj):
        return f"{obj.amount_total:.2f}"

    def get_photo_front_url(self, obj):
        if not obj.photo_front:
            return None
        # TODO prod: URL signée 15 min (S3/R2). Local = URL directe MEDIA.
        return obj.photo_front.url

    def get_photo_back_url(self, obj):
        if not obj.photo_back:
            return None
        return obj.photo_back.url

    def validate(self, attrs):
        blanc = attrs.get("amount_blanc", Decimal("0")) or Decimal("0")
        noir = attrs.get("amount_noir", Decimal("0")) or Decimal("0")
        amount = attrs.get("amount", Decimal("0")) or Decimal("0")
        if blanc < 0 or noir < 0:
            raise serializers.ValidationError(
                "Les montants Blanc et Noir ne peuvent pas être négatifs."
            )
        if (blanc + noir) != amount:
            raise serializers.ValidationError(
                "La somme Blanc + Noir doit égaler le montant total du chèque."
            )
        return attrs


class ChequeListSerializer(serializers.ModelSerializer):
    """List view — number masqué à ****XXXX."""

    direction_display = serializers.CharField(
        source="get_direction_display", read_only=True
    )
    status_display = serializers.SerializerMethodField(read_only=True)
    bank_display = serializers.CharField(source="get_bank_display", read_only=True)
    number = serializers.SerializerMethodField()
    amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )
    amount_blanc = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )
    amount_noir = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )

    class Meta:
        model = Cheque
        fields = [
            "id", "direction", "direction_display", "kind",
            "number", "bank", "bank_display",
            "amount", "amount_blanc", "amount_noir",
            "party_name", "due_date", "status", "status_display",
            "project", "supplier",
        ]

    def get_number(self, obj):
        return obj.masked_number

    def get_status_display(self, obj):
        return obj.status_display_smart
