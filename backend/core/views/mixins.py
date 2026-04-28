"""Mixins de vue — filtrage par owner (multi-tenant ready)."""

from __future__ import annotations

from rest_framework import viewsets


class OwnerScopedViewSet(viewsets.ModelViewSet):
    """ViewSet scoped par `owner=request.user`.

    Les sous-classes définissent un `queryset` de base (pas `get_queryset`) et
    optionnellement un `serializer_class`.

    Contrat :
      - list/retrieve : filtre par `owner`.
      - create : injecte `owner=request.user` via `perform_create`.
      - Un user ne voit jamais les données d'un autre (404, pas 403, cf security.md).
    """

    def get_queryset(self):
        qs = super().get_queryset()
        user = getattr(self.request, "user", None)
        if user is None or not user.is_authenticated:
            return qs.none()
        return qs.filter(owner=user)

    def perform_create(self, serializer) -> None:
        serializer.save(owner=self.request.user)
