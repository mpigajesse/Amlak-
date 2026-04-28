"""Serializers Transaction — montants toujours en string (coerce_to_string=True)."""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from .models import Transaction


class ProjectLightField(serializers.RelatedField):
    def to_representation(self, value):
        return {"id": value.id, "name": getattr(value, "name", str(value))}

    def to_internal_value(self, data):
        raise NotImplementedError


class SupplierLightField(serializers.RelatedField):
    def to_representation(self, value):
        return {"id": value.id, "name": getattr(value, "name", str(value))}

    def to_internal_value(self, data):
        raise NotImplementedError


class TransactionSerializer(serializers.ModelSerializer):
    direction_display = serializers.CharField(source="get_direction_display", read_only=True)
    payment_mode_display = serializers.CharField(
        source="get_payment_mode_display", read_only=True
    )
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    amount_blanc = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )
    amount_noir = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True
    )
    amount_total = serializers.SerializerMethodField()

    project_detail = serializers.SerializerMethodField(read_only=True)
    supplier_detail = serializers.SerializerMethodField(read_only=True)
    stock_unit_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Transaction
        fields = [
            "id",
            "date",
            "direction",
            "direction_display",
            "payment_mode",
            "payment_mode_display",
            "amount_blanc",
            "amount_noir",
            "amount_total",
            "project",
            "project_detail",
            "category",
            "category_display",
            "subcategory",
            "supplier",
            "supplier_detail",
            "stock_unit",
            "stock_unit_detail",
            "acquisition",
            "buyer_name_override",
            "cheque",
            "label",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_amount_total(self, obj: Transaction) -> str:
        total = (obj.amount_blanc or Decimal("0")) + (obj.amount_noir or Decimal("0"))
        return f"{total:.2f}"

    def get_project_detail(self, obj):
        if obj.project_id is None:
            return None
        return {"id": obj.project.id, "name": getattr(obj.project, "name", "")}

    def get_supplier_detail(self, obj):
        if obj.supplier_id is None:
            return None
        return {"id": obj.supplier.id, "name": getattr(obj.supplier, "name", "")}

    def get_stock_unit_detail(self, obj):
        if obj.stock_unit_id is None:
            return None
        u = obj.stock_unit
        return {
            "id": u.id,
            "reference": getattr(u, "reference", ""),
            "unit_type": getattr(u, "unit_type", ""),
        }

    def validate(self, attrs):
        blanc = attrs.get("amount_blanc", Decimal("0")) or Decimal("0")
        noir = attrs.get("amount_noir", Decimal("0")) or Decimal("0")
        if blanc < 0:
            raise serializers.ValidationError(
                {"amount_blanc": "Le montant Blanc ne peut pas être négatif."}
            )
        if noir < 0:
            raise serializers.ValidationError(
                {"amount_noir": "Le montant Noir ne peut pas être négatif."}
            )
        if (blanc + noir) <= Decimal("0"):
            raise serializers.ValidationError(
                "Le montant total (Blanc + Noir) doit être strictement positif."
            )

        direction = attrs.get("direction") or getattr(self.instance, "direction", None)
        category = attrs.get("category") or getattr(self.instance, "category", None)
        out_cats = {"acquisition", "travaux", "admin", "commercialisation", "autre"}
        in_cats = {"vente", "autre"}
        if direction == "out" and category and category not in out_cats:
            raise serializers.ValidationError(
                {"category": "Catégorie incompatible avec une sortie."}
            )
        if direction == "in" and category and category not in in_cats:
            raise serializers.ValidationError(
                {"category": "Catégorie incompatible avec une entrée."}
            )
        return attrs


class QuickTransactionSerializer(serializers.Serializer):
    """Payload minimaliste pour saisie rapide (<30s mobile)."""

    date = serializers.DateField()
    direction = serializers.ChoiceField(choices=Transaction.Direction.choices)
    amount_blanc = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True, default=Decimal("0")
    )
    amount_noir = serializers.DecimalField(
        max_digits=14, decimal_places=2, coerce_to_string=True, default=Decimal("0")
    )
    category = serializers.ChoiceField(choices=Transaction.Category.choices)
    payment_mode = serializers.ChoiceField(
        choices=Transaction.PaymentMode.choices,
        default=Transaction.PaymentMode.ESPECE,
    )
    project = serializers.IntegerField(required=False, allow_null=True)
    supplier = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, attrs):
        blanc = attrs.get("amount_blanc", Decimal("0")) or Decimal("0")
        noir = attrs.get("amount_noir", Decimal("0")) or Decimal("0")
        if (blanc + noir) <= Decimal("0"):
            raise serializers.ValidationError(
                "Le montant total (Blanc + Noir) doit être strictement positif."
            )
        return attrs
