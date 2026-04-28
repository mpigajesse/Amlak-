"""Amlak — configuration Django principale."""

# Celery : on importe l'app pour qu'elle soit toujours initialisée quand Django démarre.
from amlak.celery import app as celery_app

__all__ = ("celery_app",)
