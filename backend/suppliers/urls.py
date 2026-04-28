"""URLs de l'app `suppliers` — monté sous `/api/v1/suppliers/`."""
from rest_framework.routers import DefaultRouter

from suppliers.views import SupplierViewSet

router = DefaultRouter()
router.register(r"", SupplierViewSet, basename="supplier")

urlpatterns = router.urls
