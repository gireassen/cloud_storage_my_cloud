from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiResponse
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView,
    session_login,
    session_logout,
    MeView,
    password_reset_request,
    password_reset_confirm,
    change_password,
    AdminUserViewSet,
)

@extend_schema_view(
    post=extend_schema(
        request=TokenObtainPairSerializer,
        responses={200: OpenApiResponse(description="JWT токены (access, refresh)")},
        description="Получить пару токенов по username/password.",
    )
)
class JWTObtainPairView(TokenObtainPairView):
    pass

@extend_schema_view(
    post=extend_schema(
        request=TokenRefreshSerializer,
        responses={200: OpenApiResponse(description="Новый access токен")},
        description="Обновить access по refresh токену.",
    )
)
class JWTRefreshView(TokenRefreshView):
    pass

router = DefaultRouter()
router.register(r"admin/users", AdminUserViewSet, basename="admin-users")

urlpatterns = [
    path("auth/password/reset-request/", password_reset_request, name="password-reset-request"),
    path("auth/password/reset-confirm/", password_reset_confirm, name="password-reset-confirm"),
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/session/login/", session_login, name="session-login"),
    path("auth/session/logout/", session_logout, name="session-logout"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("token/", JWTObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", JWTRefreshView.as_view(), name="token_refresh"),
    path("auth/password/change/", change_password),
    path("", include(router.urls)),
]
