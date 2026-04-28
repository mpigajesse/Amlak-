"""Exception handler DRF — format canonique `{detail, errors?, code}`.

Source : `01-backend/api/conventions.md` section "Format des erreurs".
"""
from __future__ import annotations

from typing import Any

from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_default_handler


def _code_for(exc: Exception, default: str) -> str:
    """Extrait un code slug machine-readable depuis l'exception DRF."""
    detail = getattr(exc, "detail", None)
    code = getattr(detail, "code", None)
    if isinstance(code, str) and code:
        return code
    return default


def _default_detail_fr(status_code: int) -> str:
    mapping = {
        status.HTTP_400_BAD_REQUEST: "Requête invalide.",
        status.HTTP_401_UNAUTHORIZED: "Authentification requise.",
        status.HTTP_403_FORBIDDEN: "Action non autorisée.",
        status.HTTP_404_NOT_FOUND: "Ressource introuvable.",
        status.HTTP_405_METHOD_NOT_ALLOWED: "Méthode non autorisée.",
        status.HTTP_409_CONFLICT: "Conflit avec l'état courant.",
        status.HTTP_422_UNPROCESSABLE_ENTITY: "Entité non traitable.",
        status.HTTP_429_TOO_MANY_REQUESTS: "Trop de tentatives. Réessayez plus tard.",
        status.HTTP_500_INTERNAL_SERVER_ERROR: "Erreur serveur.",
    }
    return mapping.get(status_code, "Erreur.")


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """Normalise toutes les erreurs DRF au format `{detail, errors?, code}`.

    - `detail` : message lisible utilisateur (FR).
    - `errors` : dict par champ (optionnel, présent pour les ValidationError).
    - `code` : slug machine-readable (ex: `invalid_credentials`, `throttled`).
    """
    response = drf_default_handler(exc, context)
    if response is None:
        return None

    status_code = response.status_code

    # Cas 1 : ValidationError (400) — `response.data` est un dict par champ.
    if isinstance(exc, exceptions.ValidationError):
        data = response.data
        errors: dict[str, Any]
        detail: str
        if isinstance(data, dict):
            non_field = data.pop("non_field_errors", None) or data.pop("detail", None)
            errors = {k: (v if isinstance(v, list) else [v]) for k, v in data.items()}
            if non_field:
                detail = non_field[0] if isinstance(non_field, list) else str(non_field)
            elif errors:
                first_key = next(iter(errors))
                detail = errors[first_key][0]
            else:
                detail = _default_detail_fr(status_code)
        elif isinstance(data, list):
            detail = data[0] if data else _default_detail_fr(status_code)
            errors = {}
        else:
            detail = str(data)
            errors = {}
        response.data = {
            "detail": detail,
            "errors": errors,
            "code": _code_for(exc, "validation_error"),
        }
        return response

    # Cas 2 : Throttled (429)
    if isinstance(exc, exceptions.Throttled):
        response.data = {
            "detail": "Trop de tentatives. Réessayez plus tard.",
            "code": "throttled",
        }
        return response

    # Cas 3 : NotAuthenticated / AuthenticationFailed (401)
    if isinstance(exc, exceptions.NotAuthenticated):
        response.data = {
            "detail": "Authentification requise.",
            "code": "not_authenticated",
        }
        return response

    if isinstance(exc, exceptions.AuthenticationFailed):
        # Les vues auth préfèrent mapper elles-mêmes (ex: "Identifiants invalides.").
        # Ce fallback reste générique.
        detail_val = getattr(exc, "detail", None)
        detail_str = str(detail_val) if detail_val else "Authentification invalide."
        code = _code_for(exc, "authentication_failed")
        response.data = {"detail": detail_str, "code": code}
        return response

    # Cas général : normalise vers `{detail, code}`.
    data = response.data
    if isinstance(data, dict) and "detail" in data:
        detail = str(data.get("detail", _default_detail_fr(status_code)))
    elif isinstance(data, str):
        detail = data
    else:
        detail = _default_detail_fr(status_code)

    code_map = {
        status.HTTP_401_UNAUTHORIZED: "not_authenticated",
        status.HTTP_403_FORBIDDEN: "forbidden",
        status.HTTP_404_NOT_FOUND: "not_found",
        status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
        status.HTTP_409_CONFLICT: "conflict",
    }
    default_code = code_map.get(status_code, "error")
    response.data = {"detail": detail, "code": _code_for(exc, default_code)}
    return response
