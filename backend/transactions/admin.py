from django.contrib import admin

from .models import Transaction


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "date", "direction", "category", "payment_mode", "project")
    list_filter = ("direction", "category", "payment_mode")
    search_fields = ("label", "subcategory", "notes")
    date_hierarchy = "date"
    autocomplete_fields = ("project", "supplier", "stock_unit", "acquisition")
