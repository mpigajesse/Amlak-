"""Admin Django pour `Supplier`."""
from django.contrib import admin

from suppliers.models import Supplier


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "phone", "is_active", "owner", "updated_at")
    list_filter = ("category", "is_active")
    search_fields = ("name", "phone", "ice", "email")
    ordering = ("name",)
    autocomplete_fields = ()
    readonly_fields = ("created_at", "updated_at")
