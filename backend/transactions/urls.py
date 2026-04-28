from rest_framework.routers import DefaultRouter

from .views import TransactionViewSet

router = DefaultRouter()
router.register(r"", TransactionViewSet, basename="transaction")

urlpatterns = router.urls
