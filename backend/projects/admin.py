"""Admin Django pour `Project`."""

from __future__ import annotations

from django.contrib import admin

from projects.models import Project


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "owner",
        "stage",
        "budget_total",
        "expected_delivery_date",
        "created_at",
    )
    list_filter = ("stage", "cost_allocation_method")
    search_fields = ("name", "location", "owner__email")
    readonly_fields = ("created_at", "updated_at", "closed_at")
    ordering = ("-created_at",)

    @admin.display(description="budget total")
    def budget_total(self, obj: Project):
        return obj.budget_total
