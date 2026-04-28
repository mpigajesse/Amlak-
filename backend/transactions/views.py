"""ViewSet Transaction — CRUD owner-scoped + actions quick/ et cash-position/."""
from __future__ import annotations

import logging
from decimal import Decimal

from django.db.models import DecimalField, ExpressionWrapper, F, Sum
from django_filters import rest_framework as df
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.views.mixins import OwnerScopedViewSet

from .models import Transaction
from .serializers import QuickTransactionSerializer, TransactionSerializer

log = logging.getLogger("transactions")


class TransactionFilter(df.FilterSet):
    from_ = df.DateFilter(field_name="date", lookup_expr="gte")
    to = df.DateFilter(field_name="date", lookup_expr="lte")
    min = df.NumberFilter(method="filter_min_total")
    max = df.NumberFilter(method="filter_max_total")
    project = df.NumberFilter(field_name="project_id")
    supplier = df.NumberFilter(field_name="supplier_id")
    stock_unit = df.NumberFilter(field_name="stock_unit_id")
    acquisition = df.NumberFilter(field_name="acquisition_id")
    direction = df.CharFilter(field_name="direction")
    category = df.CharFilter(field_name="category")
    payment_mode = df.CharFilter(field_name="payment_mode")

    class Meta:
        model = Transaction
        fields = []

    def filter_min_total(self, qs, name, value):
        return qs.annotate(
            _total=ExpressionWrapper(
                F("amount_blanc") + F("amount_noir"),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            )
        ).filter(_total__gte=value)

    def filter_max_total(self, qs, name, value):
        return qs.annotate(
            _total=ExpressionWrapper(
                F("amount_blanc") + F("amount_noir"),
                output_field=DecimalField(max_digits=14, decimal_places=2),
            )
        ).filter(_total__lte=value)


class TransactionViewSet(OwnerScopedViewSet):
    queryset = Transaction.objects.select_related(
        "project", "supplier", "stock_unit", "acquisition", "cheque"
    ).all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [df.DjangoFilterBackend]
    filterset_class = TransactionFilter

    def perform_create(self, serializer):
        obj = serializer.save(owner=self.request.user)
        log.info(
            "Transaction créée id=%s direction=%s category=%s",
            obj.id, obj.direction, obj.category,
        )

    def perform_destroy(self, instance):
        log.info("Transaction supprimée id=%s", instance.id)
        instance.delete()

    @action(detail=False, methods=["post"], url_path="quick")
    def quick(self, request):
        """Saisie rapide (<30s mobile). Retourne la transaction complète."""
        ser = QuickTransactionSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        tx = Transaction.objects.create(
            owner=request.user,
            date=data["date"],
            direction=data["direction"],
            payment_mode=data.get("payment_mode", Transaction.PaymentMode.ESPECE),
            amount_blanc=data.get("amount_blanc") or Decimal("0"),
            amount_noir=data.get("amount_noir") or Decimal("0"),
            category=data["category"],
            project_id=data.get("project"),
            supplier_id=data.get("supplier"),
        )
        log.info("Transaction rapide id=%s direction=%s", tx.id, tx.direction)
        return Response(
            TransactionSerializer(tx).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="cash-position")
    def cash_position(self, request):
        """Agrège entrées/sorties sur la période filtrée."""
        qs = self.filter_queryset(self.get_queryset())
        in_ = qs.filter(direction=Transaction.Direction.IN).aggregate(
            blanc=Sum("amount_blanc"), noir=Sum("amount_noir")
        )
        out = qs.filter(direction=Transaction.Direction.OUT).aggregate(
            blanc=Sum("amount_blanc"), noir=Sum("amount_noir")
        )
        in_blanc = in_["blanc"] or Decimal("0")
        in_noir = in_["noir"] or Decimal("0")
        out_blanc = out["blanc"] or Decimal("0")
        out_noir = out["noir"] or Decimal("0")
        blanc = in_blanc - out_blanc
        noir = in_noir - out_noir
        return Response({
            "blanc": f"{blanc:.2f}",
            "noir": f"{noir:.2f}",
            "total": f"{(blanc + noir):.2f}",
            "in": {
                "blanc": f"{in_blanc:.2f}",
                "noir": f"{in_noir:.2f}",
                "total": f"{(in_blanc + in_noir):.2f}",
            },
            "out": {
                "blanc": f"{out_blanc:.2f}",
                "noir": f"{out_noir:.2f}",
                "total": f"{(out_blanc + out_noir):.2f}",
            },
        })
