"""ViewSet DRF pour `Supplier`.

Scoping : `OwnerScopedViewSet` filtre sur `owner=request.user` et injecte
l'owner à la création. Un supplier d'un autre user renvoie 404 (pas 403).

Filtres exposés :
- `?category=<slug>`
- `?is_active=true|false`
- `?search=<str>` — cherche sur name, phone, ice (icontains)

Actions nested :
- `GET /suppliers/{id}/transactions/` — liste paginée des transactions
  liées au fournisseur (scopées par owner).
- `GET /suppliers/{id}/cheques/` — liste paginée des chèques liés au
  fournisseur (scopées par owner).
"""
from __future__ import annotations

from django.db.models import Q
from django_filters import rest_framework as django_filters
from rest_framework import filters
from rest_framework.decorators import action
from rest_framework.response import Response

from core.views.mixins import OwnerScopedViewSet
from suppliers.models import Supplier
from suppliers.serializers import SupplierSerializer


class SupplierFilter(django_filters.FilterSet):
    """Filtres pour la liste `/suppliers/`."""

    search = django_filters.CharFilter(method="filter_search")

    class Meta:
        model = Supplier
        fields = ("category", "is_active")

    def filter_search(self, queryset, name, value):  # noqa: ARG002
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(name__icontains=value)
            | Q(phone__icontains=value)
            | Q(ice__icontains=value)
        )


class SupplierViewSet(OwnerScopedViewSet):
    """CRUD sur les fournisseurs du user courant."""

    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = (
        django_filters.DjangoFilterBackend,
        filters.OrderingFilter,
    )
    filterset_class = SupplierFilter
    ordering_fields = ("name", "created_at", "updated_at")
    ordering = ("name",)

    @action(detail=True, methods=["get"], url_path="transactions")
    def transactions(self, request, pk=None):
        """Liste paginée des transactions liées à ce fournisseur.

        Le fournisseur doit appartenir au user courant (sinon 404).
        Les transactions retournées sont également scopées par owner pour
        empêcher toute fuite inter-tenants.
        """
        supplier = self.get_object()

        from transactions.models import Transaction
        from transactions.serializers import TransactionSerializer

        qs = (
            Transaction.objects.select_related(
                "project", "supplier", "stock_unit", "acquisition", "cheque"
            )
            .filter(owner=request.user, supplier_id=supplier.pk)
            .order_by("-date", "-created_at")
        )

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = TransactionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TransactionSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="cheques")
    def cheques(self, request, pk=None):
        """Liste paginée des chèques liés à ce fournisseur.

        Le fournisseur doit appartenir au user courant (sinon 404).
        Les chèques retournés sont également scopés par owner.
        Utilise `ChequeListSerializer` (numéro masqué) — cohérent avec la
        list view de l'app cheques.
        """
        supplier = self.get_object()

        from cheques.models import Cheque
        from cheques.serializers import ChequeListSerializer

        qs = (
            Cheque.objects.select_related("project", "supplier")
            .filter(owner=request.user, supplier_id=supplier.pk)
            .order_by("due_date")
        )

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = ChequeListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ChequeListSerializer(qs, many=True)
        return Response(serializer.data)
