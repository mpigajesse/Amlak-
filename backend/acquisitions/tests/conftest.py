"""Conftest local à acquisitions/tests — réexporte les fixtures partagées."""
from __future__ import annotations

# Importe les fixtures partagées depuis core.tests.conftest afin que les tests
# de `acquisitions/tests` aient accès à `api_client`, `user`, `authed_client`,
# et au clear du cache throttling (autouse).
from core.tests.conftest import (  # noqa: F401
    _clear_throttle_cache,
    api_client,
    authed_client,
    user,
)
