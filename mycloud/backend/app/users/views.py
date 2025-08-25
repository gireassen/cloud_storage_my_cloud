from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from drf_spectacular.utils import extend_schema, OpenApiResponse

from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
    SessionLoginSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """
    Публичная регистрация пользователя.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class UserViewSet(viewsets.ModelViewSet):
    """
    Админ‑интерфейс управления пользователями.
    """
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAdminUser])
    @extend_schema(
        responses={200: OpenApiResponse(description="Пользователь деактивирован")},
        description="Деактивация пользователя (is_active = False).",
    )
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save(update_fields=["is_active"])
        return Response({"status": "deactivated"})


@extend_schema(
    request=SessionLoginSerializer,
    responses={200: OpenApiResponse(description="Вход выполнен"), 400: OpenApiResponse(description="Ошибка")},
    description="Логин на сессиях Django. Принимает username и password.",
)
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def session_login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(request, username=username, password=password)
    if user:
        login(request, user)
        return Response({"detail": "logged_in"})
    return Response({"detail": "invalid_credentials"}, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    responses={200: OpenApiResponse(description="Выход выполнен")},
    description="Логаут из сессии Django.",
)
@api_view(["POST"])
def session_logout(request):
    logout(request)
    return Response({"detail": "logged_out"})


class MeView(generics.RetrieveAPIView):
    """
    Данные текущего пользователя (по токену или сессии).
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: UserSerializer})
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_object(self):
        return self.request.user


@extend_schema(
    request=PasswordResetRequestSerializer,
    responses={200: OpenApiResponse(description="Если email зарегистрирован, письмо отправлено")},
    description=(
        "Запрос на сброс пароля. Принимает email, генерирует UID и токен. "
        "Отправляет ссылку либо на фронтенд (FRONTEND_RESET_URL?uid=..&token=..), "
        "либо на API /api/auth/password/reset-confirm/?uid=..&token=.."
    ),
)
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"]

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        # Не раскрываем, существует ли email — всегда 200
        return Response(
            {"detail": "Если email зарегистрирован, письмо отправлено"},
            status=status.HTTP_200_OK,
        )

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    if getattr(settings, "FRONTEND_RESET_URL", ""):
        link = f"{settings.FRONTEND_RESET_URL}?uid={uid}&token={token}"
    else:
        link = request.build_absolute_uri(f"/api/auth/password/reset-confirm/?uid={uid}&token={token}")

    send_mail(
        subject="Сброс пароля — MyCloud",
        message=f"Для сброса пароля перейдите по ссылке: {link}",
        from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
        recipient_list=[email],
        fail_silently=True,
    )
    return Response({"detail": "Если email зарегистрирован, письмо отправлено"}, status=status.HTTP_200_OK)


@extend_schema(
    request=PasswordResetConfirmSerializer,
    responses={200: OpenApiResponse(description="Пароль обновлён"), 400: OpenApiResponse(description="Ошибка")},  # noqa: E501
    description="Подтверждение сброса пароля по uid/token и установка нового пароля.",
)
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset_confirm(request):
    serializer = PasswordResetConfirmSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    uid = serializer.validated_data["uid"]
    token = serializer.validated_data["token"]
    new_password = serializer.validated_data["new_password"]

    try:
        uid_int = int(urlsafe_base64_decode(uid).decode())
        user = User.objects.get(pk=uid_int)
    except Exception:
        return Response({"detail": "Неверная ссылка"}, status=status.HTTP_400_BAD_REQUEST)

    if not default_token_generator.check_token(user, token):
        return Response({"detail": "Неверный или истёкший токен"}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return Response({"detail": "Пароль обновлён"}, status=status.HTTP_200_OK)
