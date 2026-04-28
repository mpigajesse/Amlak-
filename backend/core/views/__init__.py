"""Views core — le mixin est exporté ici pour import propre depuis les sprints suivants."""

from core.views.mixins import OwnerScopedViewSet

__all__ = ["OwnerScopedViewSet"]
