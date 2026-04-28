"""ViewSet DRF pour `Acquisition`.

Scoping : `OwnerScopedViewSet` → filtre par `owner=request.user`, 404 sur
ressources d'un autre user (jamais 403).

Filtres : `?project=<id>&stage=<slug>&search=<str>` (search sur title + address).

Action custom :
  - `POST /acquisitions/{id}/advance-stage/` : passe à l'étape immédiatement
    suivante du cycle. Refuse (422) si déjà terminal.
"""
from __future__ import annotations

from django.db.models import Q
from django_filters import rest_framework as django_filters
from rest_framework import filters, status
from rest_framework.decorators import action
from rest_framework.response import Response

from acquisitions.models import Acquisition, AcquisitionStage, next_stage
from acquisitions.serializers import AcquisitionSerializer
from core.views.mixins import OwnerScopedViewSet


ERROR_STAGE_TERMINAL = "L'acquisition est déjà au stade final « Acheté »."


class AcquisitionFilter(django_filters.FilterSet):
    """Filtres pour `/acquisitions/`."""

    search = django_filters.CharFilter(method="filter_search")
    stage = django_filters.ChoiceFilter(choices=AcquisitionStage.choices)

    class Meta:
        model = Acquisition
        fields = ("project", "stage")

    def filter_search(self, queryset, name, value):  # noqa: ARG002
        value = (value or "").strip()
        if not value:
            return queryset
        return queryset.filter(
            Q(title__icontains=value)
            | Q(address__icontains=value)
            | Q(seller_name__icontains=value)
        )


class AcquisitionViewSet(OwnerScopedViewSet):
    """CRUD sur les acquisitions du user courant + action `advance-stage`."""

    queryset = Acquisition.objects.select_related("project").all()
    serializer_class = AcquisitionSerializer
    filter_backends = (
        django_filters.DjangoFilterBackend,
        filters.OrderingFilter,
    )
    filterset_class = AcquisitionFilter
    ordering_fields = ("created_at", "updated_at", "title", "stage")
    ordering = ("-created_at",)

    @action(detail=True, methods=["post"], url_path="advance-stage")
    def advance_stage(self, request, pk=None):  # noqa: ARG002
        """Fait passer l'acquisition à l'étape suivante.

        - 200 : transition effectuée, renvoie l'objet sérialisé.
        - 422 : déjà au stade terminal `achete` (pas de suivante).
        - 404 : ressource d'un autre owner ou inexistante.
        """
        acquisition = self.get_object()

        target = next_stage(acquisition.stage)
        if target is None:
            return Response(
                {
                    "detail": ERROR_STAGE_TERMINAL,
                    "code": "invalid_transition",
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        acquisition.stage = target
        acquisition.save(update_fields=["stage", "updated_at"])

        serializer = self.get_serializer(acquisition)
        return Response(serializer.data, status=status.HTTP_200_OK)
