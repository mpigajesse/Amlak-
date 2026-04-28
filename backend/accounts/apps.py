"""AppConfig pour `accounts`.

Connecte explicitement les signaux au ready() pour éviter les imports cachés.
"""
from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    verbose_name = "Comptes utilisateurs"

    def ready(self) -> None:
        # Import local pour connecter le signal post_save → create UserSettings.
        from accounts import signals  # noqa: F401
