"""Tests du mixin OwnerScopedViewSet (Sprint 1).

Teste que le mixin filtre le queryset par owner=request.user
et injecte owner=request.user dans perform_create.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from rest_framework.test import APIRequestFactory

from core.tests.factories import UserFactory
from core.views.mixins import OwnerScopedViewSet


@pytest.mark.django_db
class TestOwnerScopedViewSet:
    def _build_viewset(self, user, parent_qs):
        """Construit un ViewSet testable en mockant le queryset parent."""
        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user

        class _TestViewSet(OwnerScopedViewSet):
            pass

        # Stub le super().get_queryset() pour éviter toute dépendance modèle
        _TestViewSet.get_queryset = lambda self: parent_qs.filter(owner=user)

        vs = _TestViewSet()
        vs.request = request
        vs.format_kwarg = None
        return vs

    def test_get_queryset_filters_by_owner(self):
        user = UserFactory()
        mock_qs = MagicMock()

        # Appelle directement get_queryset du mixin en bypassant super
        from unittest.mock import patch

        class _VS(OwnerScopedViewSet):
            queryset = mock_qs

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = user

        vs = _VS()
        vs.request = request
        vs.format_kwarg = None

        with patch(
            "rest_framework.viewsets.ModelViewSet.get_queryset",
            return_value=mock_qs,
        ):
            _ = vs.get_queryset()

        mock_qs.filter.assert_called_once_with(owner=user)

    def test_get_queryset_returns_none_for_anonymous(self):
        from unittest.mock import patch

        from django.contrib.auth.models import AnonymousUser

        mock_qs = MagicMock()

        class _VS(OwnerScopedViewSet):
            queryset = mock_qs

        factory = APIRequestFactory()
        request = factory.get("/")
        request.user = AnonymousUser()

        vs = _VS()
        vs.request = request
        vs.format_kwarg = None

        with patch(
            "rest_framework.viewsets.ModelViewSet.get_queryset",
            return_value=mock_qs,
        ):
            result = vs.get_queryset()

        mock_qs.none.assert_called_once()
        mock_qs.filter.assert_not_called()
        assert result is mock_qs.none.return_value

    def test_perform_create_injects_owner(self):
        user = UserFactory()
        factory = APIRequestFactory()
        request = factory.post("/")
        request.user = user

        vs = OwnerScopedViewSet()
        vs.request = request

        serializer = MagicMock()
        vs.perform_create(serializer)

        serializer.save.assert_called_once_with(owner=user)
