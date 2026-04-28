"""URLs de l'app `units` — monté sous `/api/v1/units/`."""
from rest_framework.routers import DefaultRouter

from units.views import StockUnitViewSet

router = DefaultRouter()
router.register(r"", StockUnitViewSet, basename="stockunit")

urlpatterns = router.urls
