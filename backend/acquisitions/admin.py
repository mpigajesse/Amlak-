"""Admin Django pour `Acquisition`."""
from django.contrib import admin

from acquisitions.models import Acquisition


@admin.register(Acquisition)
class AcquisitionAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "project",
        "stage",
        "asking_price",
        "negotiated_price",
        "option_deadline",
        "owner",
        "updated_at",
    )
    list_filter = ("stage",)
    search_fields = ("title", "seller_name", "address")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
