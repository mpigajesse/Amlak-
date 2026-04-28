"""ViewSet Cheque — CRUD owner-scoped + cash/reject/ocr/upload-photo."""
from __future__ import annotations

import logging

from django.db import transaction as db_transaction
from django_filters import rest_framework as df
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from core.views.mixins import OwnerScopedViewSet

from .models import Cheque
from .serializers import ChequeListSerializer, ChequeSerializer

log = logging.getLogger("cheques")


class ChequeFilter(df.FilterSet):
    cash_date_from = df.DateFilter(field_name="due_date", lookup_expr="gte")
    cash_date_to = df.DateFilter(field_name="due_date", lookup_expr="lte")
    direction = df.CharFilter(field_name="direction")
    status = df.CharFilter(field_name="status")
    kind = df.CharFilter(field_name="kind")
    project = df.NumberFilter(field_name="project_id")
    supplier = df.NumberFilter(field_name="supplier_id")

    class Meta:
        model = Cheque
        fields = []


class ChequeViewSet(OwnerScopedViewSet):
    queryset = Cheque.objects.select_related("project", "supplier").all()
    serializer_class = ChequeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [df.DjangoFilterBackend]
    filterset_class = ChequeFilter
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == "list":
            return ChequeListSerializer
        return ChequeSerializer

    def get_throttles(self):
        # Scope OCR (10/min) — doit être défini AVANT check_throttles (cf initial()).
        if getattr(self, "action", None) == "ocr":
            self.throttle_scope = "ocr"
        return super().get_throttles()

    def perform_create(self, serializer):
        obj = serializer.save(owner=self.request.user)
        log.info("Cheque créé id=%s direction=%s status=%s", obj.id, obj.direction, obj.status)

    def perform_destroy(self, instance):
        log.info("Cheque supprimé id=%s", instance.id)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="cash")
    def cash(self, request, pk=None):
        """Passe à encaissé (in) ou débité (out) + crée une Transaction liée."""
        cheque = self.get_object()
        if cheque.status != Cheque.Status.PENDING:
            return Response(
                {"detail": "Seul un chèque en attente peut être encaissé.",
                 "code": "invalid_transition"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        from transactions.models import Transaction

        new_status = (
            Cheque.Status.CASHED
            if cheque.direction == Cheque.Direction.IN
            else Cheque.Status.DEBITED
        )

        with db_transaction.atomic():
            cheque.status = new_status
            cheque.save(update_fields=["status", "updated_at"])
            # Crée la transaction liée si absente
            if not hasattr(cheque, "transaction") or cheque.transaction is None:
                Transaction.objects.create(
                    owner=cheque.owner,
                    date=cheque.due_date,
                    direction=cheque.direction,
                    payment_mode=Transaction.PaymentMode.CHEQUE,
                    amount_blanc=cheque.amount_blanc,
                    amount_noir=cheque.amount_noir,
                    project=cheque.project,
                    supplier=cheque.supplier,
                    cheque=cheque,
                    category=(
                        Transaction.Category.VENTE
                        if cheque.direction == Cheque.Direction.IN
                        else Transaction.Category.AUTRE
                    ),
                    label=f"Chèque {cheque.masked_number}",
                )
        log.info("Cheque encaissé id=%s new_status=%s", cheque.id, new_status)
        return Response(self.get_serializer(cheque).data)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None):
        cheque = self.get_object()
        if cheque.status not in {Cheque.Status.PENDING, Cheque.Status.DEBITED, Cheque.Status.CASHED}:
            return Response(
                {"detail": "Impossible de rejeter ce chèque dans son état actuel.",
                 "code": "invalid_transition"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )
        cheque.status = Cheque.Status.REJECTED
        cheque.save(update_fields=["status", "updated_at"])
        log.info("Cheque rejeté id=%s", cheque.id)
        return Response(self.get_serializer(cheque).data)

    @action(
        detail=False,
        methods=["post"],
        url_path="ocr",
        throttle_classes=[ScopedRateThrottle],
        parser_classes=[MultiPartParser, FormParser],
    )
    def ocr(self, request):
        """OCR stub — renvoie un payload factice. Intégration vraie : Sprint 4."""
        photo = request.FILES.get("photo") or request.FILES.get("file")
        if photo is None:
            return Response(
                {"detail": "Veuillez joindre une photo du chèque.",
                 "code": "photo_missing"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # Stub : renvoie des données factices plausibles.
        return Response({
            "number": "4821035",
            "amount": "120000.00",
            "bank": "bmce",
            "bank_display": "BMCE Bank (Bank of Africa)",
            "due_date": None,
            "party_name": None,
            "confidence": 0.0,
            "stub": True,
        })

    @action(
        detail=True,
        methods=["post"],
        url_path="upload-photo",
        parser_classes=[MultiPartParser, FormParser],
    )
    def upload_photo(self, request, pk=None):
        cheque = self.get_object()
        front = request.FILES.get("photo_front")
        back = request.FILES.get("photo_back")
        if front is None and back is None:
            return Response(
                {"detail": "Veuillez joindre au moins une photo (front ou back).",
                 "code": "photo_missing"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if front:
            cheque.photo_front = front
        if back:
            cheque.photo_back = back
        cheque.save()
        log.info("Cheque photo uploadée id=%s", cheque.id)
        return Response(self.get_serializer(cheque).data)
