"""Admin Django pour `StockUnit`."""
from django.contrib import admin

from units.models import StockUnit


@admin.register(StockUnit)
class StockUnitAdmin(admin.ModelAdmin):
    list_display = (
        "label",
        "unit_type",
        "project",
        "stage",
        "price_asked",
        "price_negotiated",
        "allocated_cost",
        "owner",
        "updated_at",
    )
    list_filter = ("stage", "unit_type")
    search_fields = ("label", "buyer_name", "notes")
    ordering = ("-created_at",)
    readonly_fields = ("created_at", "updated_at")
