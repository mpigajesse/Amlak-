"""Routes de l'app `projects` — préfixées par `/api/v1/projects/` dans urls racine."""

from __future__ import annotations

from rest_framework.routers import DefaultRouter

from projects.views import ProjectViewSet

app_name = "projects"

router = DefaultRouter()
router.register(r"", ProjectViewSet, basename="project")

urlpatterns = router.urls
