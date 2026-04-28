"""Configuration Celery. Aucune tâche concrète au Sprint 1."""
from __future__ import annotations

import os

from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "amlak.settings")

app = Celery("amlak")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self) -> None:  # pragma: no cover - utilitaire de debug uniquement
    print(f"Request: {self.request!r}")
