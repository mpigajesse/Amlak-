"""Filtres de logging — masquage des champs sensibles.

Règle métier (CLAUDE.md section Sécurité) :
    « Aucun log de montants ni de numéros de chèques. Seulement IDs et verbes HTTP. »

Ce filtre intercepte chaque `LogRecord` et remplace toute occurrence de clés
sensibles (`password`, `token`, `refresh`, `access`, `amount`, `number`, `ice`)
par `***` dans :
    - le message final rendu (`record.msg` + `record.args` déjà formatés),
    - les `extra` passés au logger.

Il reste volontairement simple : on ne sniffe pas les structures imbriquées,
on se repose sur des regex appliquées au texte rendu. Les devs doivent
toujours logger des IDs et des verbes, pas des objets entiers.
"""
from __future__ import annotations

import logging
import re

SENSITIVE_KEYS: tuple[str, ...] = (
    "password",
    "token",
    "refresh",
    "access",
    "amount",
    "number",
    "ice",
)

_MASK = "***"

# Pattern « clé = valeur » / « clé: valeur » / « "clé": "valeur" » jusqu'au
# prochain séparateur courant (virgule, espace, saut de ligne, accolade).
_KV_PATTERN = re.compile(
    r"(?P<prefix>[\"']?(?P<key>"
    + "|".join(re.escape(k) for k in SENSITIVE_KEYS)
    + r")[\"']?\s*[:=]\s*[\"']?)"
    r"(?P<value>[^\"'},\s]+)",
    flags=re.IGNORECASE,
)


def _mask(text: str) -> str:
    return _KV_PATTERN.sub(lambda m: f"{m.group('prefix')}{_MASK}", text)


class SensitiveDataFilter(logging.Filter):
    """Masque les champs sensibles dans le message rendu et les `extra`."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003 - API stdlib
        try:
            rendered = record.getMessage()
        except Exception:  # noqa: BLE001 - on ne doit jamais casser le logger
            rendered = str(record.msg)
        masked = _mask(rendered)
        if masked != rendered:
            record.msg = masked
            record.args = None

        # Nettoie les `extra` accrochés directement au record.
        for key in list(record.__dict__.keys()):
            if key.lower() in SENSITIVE_KEYS:
                record.__dict__[key] = _MASK
        return True
