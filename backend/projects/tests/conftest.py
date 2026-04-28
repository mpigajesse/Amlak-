"""Conftest projects — réutilise les fixtures partagées (api_client, user, authed_client)."""

from __future__ import annotations

# Importe les fixtures partagées depuis core.tests.conftest afin que les tests
# de `projects/tests` aient accès à `api_client`, `user`, `authed_client`,
# et au clear de cache throttling (autouse).
from core.tests.conftest import (  # noqa: F401
    _clear_throttle_cache,
    api_client,
    authed_client,
    user,
)
