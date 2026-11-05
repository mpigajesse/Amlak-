"""Serializers Cheque — montants en string, number masqué en list view."""
from __future__ import annotations

from decimal import Decimal

from django.conf import settings
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
    # Le frontend (types.ts, ChequeForm) lit et écrit `cash_date` et
    # `account_holder` ; le modèle stocke `due_date` et `party_name`. Les deux
    # noms sont acceptés : sans ces alias, le prévisionnel du tableau de bord
    # échouait, les échéances affichaient « J-NaN » et le titulaire restait vide.
    cash_date = serializers.DateField(source="due_date", required=False)
    account_holder = serializers.CharField(source="party_name", required=False)

    class Meta:
        model = Cheque
        fields = [
            "id",
            "cash_date",
            "account_holder",
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
        extra_kwargs = {"due_date": {"required": False}, "party_name": {"required": False}}

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
        # À la création, l'un des deux noms (alias ou champ du modèle) est requis.
        if self.instance is None:
            if not attrs.get("due_date"):
                raise serializers.ValidationError({"due_date": "Date d'encaissement requise."})
            if not attrs.get("party_name"):
                raise serializers.ValidationError({"party_name": "Titulaire requis."})
        blanc = attrs.get("amount_blanc", Decimal("0")) or Decimal("0")
        noir = attrs.get("amount_noir", Decimal("0")) or Decimal("0")
        amount = attrs.get("amount", Decimal("0")) or Decimal("0")
        if blanc < 0 or noir < 0:
            raise serializers.ValidationError(
                f"Les montants {settings.LIBELLE_BLANC} et {settings.LIBELLE_NOIR} ne peuvent pas être négatifs."
            )
        if (blanc + noir) != amount:
            raise serializers.ValidationError(
                f"La somme {settings.LIBELLE_BLANC} + {settings.LIBELLE_NOIR} doit égaler le montant total du chèque."
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
    # Alias lus par le frontend (voir ChequeSerializer).
    cash_date = serializers.DateField(source="due_date", read_only=True)
    account_holder = serializers.CharField(source="party_name", read_only=True)
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
            "project", "supplier", "cash_date", "account_holder",
        ]

    def get_number(self, obj):
        return obj.masked_number

    def get_status_display(self, obj):
        return obj.status_display_smart
