"""ViewSet DRF pour `StockUnit`.

Scoping : `OwnerScopedViewSet` → filtre par `owner=request.user`, 404 sur
ressources d'un autre user (jamais 403).

Filtres : `?project=<id>&acquisition=<id>&stage=<slug>&unit_type=<slug>&search=<str>`.

Actions custom (toutes atomiques) :
  - `POST /units/{id}/reserve/`         : stock → reservation
  - `POST /units/{id}/sign-compromis/`  : reservation → compromis
  - `POST /units/{id}/cash/`            : compromis → encaisse
  - `POST /units/generate-from-acquisition/` : création en masse
"""
from __future__ import annotations

from datetime import date

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django_filters import rest_framework as django_filters
from rest_framework import filters, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response

from core.views.mixins import OwnerScopedViewSet
from units.models import StockUnit, UnitStage, UnitType
from units.serializers import (
    CashUnitSerializer,
    GenerateUnitsFromAcquisitionSerializer,
    ReserveUnitSerializer,
    SignCompromisSerializer,
    StockUnitSerializer,
)


# --- Messages d'erreur FR ---
ERROR_INVALID_TRANSITION = "Transition invalide pour cette unité."
ERROR_MUST_BE_STOCK = (
    "L'unité doit être au stade « Stock disponible » pour être réservée."
)
ERROR_MUST_BE_RESERVATION = (
    "L'unité doit être en « Réservation » pour signer un compromis."
)
ERROR_MUST_BE_COMPROMIS = (
    "L'unité doit être en « Compromis » pour être encaissée."
)


class StockUnitFilter(django_filters.FilterSet):
    """Filtres pour `/units/`."""

    search = django_filters.CharFilter(method="filter_search")
    stage = django_filters.ChoiceFilter(choices=UnitStage.choices)
    unit_type = django_filters.ChoiceFilter(choices=UnitType.choices)

    class Meta:
        model = StockUnit
        fields = ("project", "acquisition", "stage", "unit_type")

    def filter_search(self, queryset, name, value):  # noqa: ARG002
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(label__icontains=value)
            | Q(buyer_name__icontains=value)
            | Q(notes__icontains=value)
        )


class StockUnitViewSet(OwnerScopedViewSet):
    """CRUD + actions de transition sur les unités de stock du user courant."""

    queryset = StockUnit.objects.select_related("project", "acquisition").all()
    serializer_class = StockUnitSerializer
    filter_backends = (
        django_filters.DjangoFilterBackend,
        filters.OrderingFilter,
    )
    filterset_class = StockUnitFilter
    ordering_fields = ("created_at", "updated_at", "label", "stage", "price_asked")
    ordering = ("-created_at",)

    # --- Transitions ---

    @action(detail=True, methods=["post"], url_path="reserve")
    @transaction.atomic
    def reserve(self, request, pk=None):  # noqa: ARG002
        """stock → reservation.

        Body (optionnel) : `{buyer_name, buyer_phone, reserved_at}`.
        - 200 : transition effectuée
        - 422 : pas au stade `stock`
        """
        unit = self.get_object()
        if unit.stage != UnitStage.STOCK:
            return Response(
                {"detail": ERROR_MUST_BE_STOCK, "code": "invalid_transition"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        payload = ReserveUnitSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        unit.buyer_name = data["buyer_name"]
        unit.buyer_phone = data.get("buyer_phone") or ""
        unit.reserved_at = data.get("reserved_at") or date.today()
        unit.stage = UnitStage.RESERVATION
        unit.save(
            update_fields=[
                "buyer_name",
                "buyer_phone",
                "reserved_at",
                "stage",
                "updated_at",
            ]
        )

        return Response(self.get_serializer(unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="sign-compromis")
    @transaction.atomic
    def sign_compromis(self, request, pk=None):  # noqa: ARG002
        """reservation → compromis.

        Body (optionnel) : `{compromis_at, price_negotiated}`.
        """
        unit = self.get_object()
        if unit.stage != UnitStage.RESERVATION:
            return Response(
                {"detail": ERROR_MUST_BE_RESERVATION, "code": "invalid_transition"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        payload = SignCompromisSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        unit.compromis_at = data.get("compromis_at") or date.today()
        if "price_negotiated" in data and data["price_negotiated"] is not None:
            unit.price_negotiated = data["price_negotiated"]
        unit.stage = UnitStage.COMPROMIS

        update_fields = ["compromis_at", "stage", "updated_at"]
        if "price_negotiated" in data and data["price_negotiated"] is not None:
            update_fields.append("price_negotiated")
        unit.save(update_fields=update_fields)

        return Response(self.get_serializer(unit).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="cash")
    @transaction.atomic
    def cash(self, request, pk=None):  # noqa: ARG002
        """compromis → encaisse.

        Body (optionnel) : `{encaisse_at}`.
        """
        unit = self.get_object()
        if unit.stage != UnitStage.COMPROMIS:
            return Response(
                {"detail": ERROR_MUST_BE_COMPROMIS, "code": "invalid_transition"},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        payload = CashUnitSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        unit.encaisse_at = data.get("encaisse_at") or date.today()
        unit.stage = UnitStage.ENCAISSE
        unit.save(update_fields=["encaisse_at", "stage", "updated_at"])

        return Response(self.get_serializer(unit).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="generate-from-acquisition")
    @transaction.atomic
    def generate_from_acquisition(self, request):
        """Création en masse d'unités rattachées à une acquisition.

        Body :
        ```json
        {
          "acquisition": 42,
          "units": [
            {"label": "A1-01", "unit_type": "appartement", "surface_m2": "78.00",
             "price_asked": "780000.00"}
          ]
        }
        ```
        - 201 : units créées, renvoie la liste sérialisée.
        - 400 : payload invalide.
        - 404 : acquisition d'un autre owner (gérée par validate_acquisition → 400).
        """
        payload = GenerateUnitsFromAcquisitionSerializer(
            data=request.data, context={"request": request}
        )
        payload.is_valid(raise_exception=True)
        validated = payload.validated_data

        acquisition = validated["acquisition"]
        user = request.user
        project = acquisition.project

        created: list[StockUnit] = []
        for idx, item in enumerate(validated["units"]):
            unit = StockUnit(
                owner=user,
                project=project,
                acquisition=acquisition,
                label=item["label"],
                unit_type=item.get("unit_type", UnitType.APPARTEMENT),
                surface_m2=item["surface_m2"],
                price_asked=item["price_asked"],
                price_negotiated=item.get("price_negotiated"),
                allocated_cost=item.get("allocated_cost") or 0,
                notes=item.get("notes") or "",
            )
            try:
                unit.full_clean()
            except DjangoValidationError as exc:
                # Remonte en 400 DRF pour garder l'atomicité lisible côté client.
                raise serializers.ValidationError(
                    {"units": [f"Unité #{idx + 1} ({item['label']}) : {exc.messages[0]}"]}
                ) from exc
            unit.save()
            created.append(unit)

        serializer = StockUnitSerializer(created, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
