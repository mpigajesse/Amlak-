"""URLs de l'app `acquisitions` — monté sous `/api/v1/acquisitions/`."""
from rest_framework.routers import DefaultRouter

from acquisitions.views import AcquisitionViewSet

router = DefaultRouter()
router.register(r"", AcquisitionViewSet, basename="acquisition")

urlpatterns = router.urls
