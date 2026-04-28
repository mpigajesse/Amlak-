#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Charge le .env racine (un niveau au-dessus de backend/)
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")


def main() -> None:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "amlak.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "Django n'est pas installé. Lance `uv sync` dans backend/."
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
