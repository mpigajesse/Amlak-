from rest_framework.routers import DefaultRouter

from .views import ChequeViewSet

router = DefaultRouter()
router.register(r"", ChequeViewSet, basename="cheque")

urlpatterns = router.urls
