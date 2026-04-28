from django.contrib import admin

from .models import Cheque


@admin.register(Cheque)
class ChequeAdmin(admin.ModelAdmin):
    list_display = ("id", "direction", "masked_number", "bank", "party_name", "due_date", "status")
    list_filter = ("direction", "status", "kind", "bank")
    search_fields = ("party_name", "notes")
    date_hierarchy = "due_date"
    autocomplete_fields = ("project", "supplier")

    def masked_number(self, obj):
        return obj.masked_number
    masked_number.short_description = "Numéro"
