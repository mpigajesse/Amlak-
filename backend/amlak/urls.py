"""URL config racine — `/api/v1/` est le préfixe unique pour l'API."""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/", include("accounts.urls")),
    path("api/v1/projects/", include("projects.urls")),
    path("api/v1/suppliers/", include("suppliers.urls")),
    path("api/v1/acquisitions/", include("acquisitions.urls")),
    path("api/v1/units/", include("units.urls")),
    path("api/v1/transactions/", include("transactions.urls")),
    path("api/v1/cheques/", include("cheques.urls")),
]
