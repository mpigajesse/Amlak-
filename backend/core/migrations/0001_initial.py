"""Migration initiale core — UserSettings OneToOne(User)."""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserSettings",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "notifications_enabled",
                    models.BooleanField(
                        default=True, verbose_name="notifications activées"
                    ),
                ),
                (
                    "alert_thresholds",
                    models.JSONField(
                        blank=True,
                        default=dict,
                        help_text="Ex: {'cheque_days': [7, 3, 1]}.",
                        verbose_name="seuils d'alertes",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="créé le")),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="mis à jour le"),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="settings",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="utilisateur",
                    ),
                ),
            ],
            options={
                "verbose_name": "paramètres utilisateur",
                "verbose_name_plural": "paramètres utilisateur",
            },
        ),
    ]
