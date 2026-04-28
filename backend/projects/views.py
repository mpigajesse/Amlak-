"""ViewSet DRF pour Project — CRUD scopé par owner."""

from __future__ import annotations

import django_filters
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from core.views.mixins import OwnerScopedViewSet
from projects.models import Project
from projects.serializers import (
    ProjectDetailSerializer,
    ProjectListSerializer,
    ProjectSerializer,
)


class ProjectFilter(django_filters.FilterSet):
    """Filtres exposés en query params : `?stage=&search=`."""

    stage = django_filters.ChoiceFilter(choices=Project.STAGE_CHOICES)

    class Meta:
        model = Project
        fields = ["stage"]


class ProjectViewSet(OwnerScopedViewSet):
    """CRUD `Project` — un user ne voit que ses projets (404 sur les autres).

    Endpoints exposés par le router :
      - GET    /api/v1/projects/        — liste
      - POST   /api/v1/projects/        — création
      - GET    /api/v1/projects/{id}/   — détail
      - PATCH  /api/v1/projects/{id}/   — update partiel
      - PUT    /api/v1/projects/{id}/   — update complet
      - DELETE /api/v1/projects/{id}/   — suppression
    """

    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        filters.OrderingFilter,
    ]
    filterset_class = ProjectFilter
    search_fields = ["name", "location"]
    ordering_fields = ["created_at", "name", "stage"]
    ordering = ["-created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return ProjectListSerializer
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectSerializer
