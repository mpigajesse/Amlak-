"""AppConfig pour l'app `acquisitions`."""
from django.apps import AppConfig


class AcquisitionsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "acquisitions"
    verbose_name = "Acquisitions"
