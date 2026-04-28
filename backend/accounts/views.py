"""Vues auth — login, refresh, me, logout.

Le refresh token n'est jamais renvoyé en JSON : il est posé en cookie httpOnly.
Cf sprint-1-plan section 3.6 + section 6 (contrat d'API).
"""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from rest_framework import permissions, status
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework.generics import RetrieveAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.serializers import LoginSerializer, UserMeSerializer

logger = logging.getLogger(__name__)


def _set_refresh_cookie(response: Response, refresh_value: str) -> None:
    """Pose le cookie refresh httpOnly sur la réponse."""
    response.set_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        value=refresh_value,
        max_age=settings.AUTH_REFRESH_COOKIE_MAX_AGE,
        httponly=settings.AUTH_REFRESH_COOKIE_HTTPONLY,
        secure=settings.AUTH_REFRESH_COOKIE_SECURE,
        samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.AUTH_REFRESH_COOKIE_NAME,
        path=settings.AUTH_REFRESH_COOKIE_PATH,
        samesite=settings.AUTH_REFRESH_COOKIE_SAMESITE,
    )


class LoginView(TokenObtainPairView):
    """`POST /api/v1/auth/login/` — retourne `{access, user}` + cookie refresh."""

    serializer_class = LoginSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except AuthenticationFailed:
            return Response(
                {"detail": "Identifiants invalides.", "code": "invalid_credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception as exc:
            # simplejwt peut lever une ValidationError dont le code est no_active_account.
            detail = getattr(exc, "detail", None)
            code = getattr(detail, "code", None) if detail is not None else None
            is_bad_creds = code == "no_active_account" or (
                detail is not None and "no_active_account" in str(detail)
            )
            if is_bad_creds:
                return Response(
                    {"detail": "Identifiants invalides.", "code": "invalid_credentials"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            raise

        validated = serializer.validated_data
        access = validated["access"]
        refresh = validated["refresh"]
        user = validated["user"]

        user_id = getattr(serializer.user, "id", None)
        logger.info("Auth login OK user_id=%s", user_id)

        response = Response(
            {"access": access, "user": user},
            status=status.HTTP_200_OK,
        )
        _set_refresh_cookie(response, refresh)
        return response


class RefreshView(TokenRefreshView):
    """`POST /api/v1/auth/refresh/` — lit le refresh depuis le cookie, renvoie `{access}`."""

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        refresh_cookie = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME)
        if not refresh_cookie:
            return Response(
                {
                    "detail": "Session expirée, veuillez vous reconnecter.",
                    "code": "token_invalid",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = TokenRefreshSerializer(data={"refresh": refresh_cookie})
        try:
            serializer.is_valid(raise_exception=True)
        except (TokenError, InvalidToken, ValidationError, AuthenticationFailed):
            response = Response(
                {
                    "detail": "Session expirée, veuillez vous reconnecter.",
                    "code": "token_invalid",
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )
            _clear_refresh_cookie(response)
            return response

        data = serializer.validated_data
        access = data["access"]

        response = Response({"access": access}, status=status.HTTP_200_OK)
        # Avec ROTATE_REFRESH_TOKENS=True, simplejwt renvoie un nouveau refresh.
        if "refresh" in data:
            _set_refresh_cookie(response, data["refresh"])
        return response


class MeView(RetrieveAPIView):
    """`GET /api/v1/auth/me/` — profil courant."""

    serializer_class = UserMeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self) -> Any:
        return self.request.user


class LogoutView(APIView):
    """`POST /api/v1/auth/logout/` — blacklist le refresh et efface le cookie."""

    permission_classes = [permissions.AllowAny]

    def post(self, request: Request, *args: Any, **kwargs: Any) -> Response:
        refresh_cookie = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE_NAME)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        if refresh_cookie:
            try:
                token = RefreshToken(refresh_cookie)
                token.blacklist()
            except (TokenError, InvalidToken):
                # Token invalide/expiré — on efface quand même le cookie.
                pass
        _clear_refresh_cookie(response)
        return response
