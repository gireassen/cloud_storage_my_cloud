from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model, login, logout, authenticate
from .serializers import (
    UserSerializer,
    RegisterSerializer,
    ChangePasswordSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.core.mail import send_mail
from django.conf import settings
from django.db.models import Count, Sum
import string
import secrets
import threading
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class AdminUserViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = UserSerializer
    queryset = (
        User.objects.all()
        .annotate(files_count=Count("files", distinct=True), files_total_size=Sum("files__size"))
        .order_by("-id")
    )
    http_method_names = ["get", "delete", "patch", "post"]

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        is_staff = request.data.get("is_staff", None)
        if is_staff is not None:
            if instance == request.user:
                return Response({"detail": "Нельзя менять свою роль."}, status=400)
            instance.is_staff = bool(is_staff)
            instance.save(update_fields=["is_staff"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def toggle_staff(self, request, pk=None):
        user = self.get_object()
        if user == request.user:
            return Response({"detail": "Нельзя менять свою роль."}, status=400)
        user.is_staff = not user.is_staff
        user.save(update_fields=["is_staff"])
        return Response(self.get_serializer(user).data)

    @action(detail=True, methods=["post"])
    def set_temp_password(self, request, pk=None):
        user = self.get_object()
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
        temp_pwd = "".join(secrets.choice(alphabet) for _ in range(12))
        user.set_password(temp_pwd)
        user.save(update_fields=["password"])
        return Response({"temporary_password": temp_pwd})

    @action(detail=True, methods=["post"])
    def send_reset_link(self, request, pk=None):
        user = self.get_object()
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        if getattr(settings, "FRONTEND_RESET_URL", ""):
            link = f"{settings.FRONTEND_RESET_URL}?uid={uid}&token={token}"
        else:
            link = request.build_absolute_uri(f"/api/auth/password/reset-confirm/?uid={uid}&token={token}")

        subject = "Сброс пароля — MyCloud"
        message = f"Для сброса пароля перейдите по ссылке: {link}"
        from_email = getattr(settings, "DEFAULT_FROM_EMAIL", None)
        recipient_list = [user.email]

        def _send():
            try:
                send_mail(subject, message, from_email, recipient_list, fail_silently=False)
                logger.info("Reset link email sent to %s", user.email)
            except Exception as e:
                logger.error("Failed to send reset email to %s: %s", user.email, e, exc_info=True)

        threading.Thread(target=_send, daemon=True).start()
        return Response({"detail": "Ссылка на сброс отправляется"}, status=status.HTTP_202_ACCEPTED)


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def session_login(request):
    username = request.data.get("username")
    password = request.data.get("password")
    user = authenticate(request, username=username, password=password)
    if user is None:
        return Response({"detail": "invalid_credentials"}, status=status.HTTP_400_BAD_REQUEST)
    if not user.is_active:
        return Response({"detail": "user_inactive"}, status=status.HTTP_400_BAD_REQUEST)
    login(request, user)
    return Response({"detail": "logged_in"})


@api_view(["POST"])
def session_logout(request):
    logout(request)
    return Response({"detail": "logged_out"})


class MeView(generics.RetrieveAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def change_password(request):
    serializer = ChangePasswordSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    user = request.user
    old_password = serializer.validated_data["old_password"]
    new_password = serializer.validated_data["new_password"]
    if not user.check_password(old_password):
        return Response({"old_password": ["Неверный текущий пароль."]}, status=status.HTTP_400_BAD_REQUEST)
    user.set_password(new_password)
    user.save()
    return Response({"detail": "password_changed"})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def password_reset_request(request):
    serializer = PasswordResetRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data["email"]
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response({"detail": "Если email зарегистрирован, письмо отправлено"}, status=status.HTTP_200_OK)

    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    if getattr(settings, "FRONTEND_RESET_URL", ""):
        link = f"{settings.FRONTEND_RESET_URL}?uid={uid}&token={token}"
    else:
        link = request.build_absolute_uri(f"/api/auth/password/reset-confirm/?uid={uid}&token={token}")

    try:
        send_mail(
            subject="Сброс пароля — MyCloud",
            message=f"Для сброса пароля перейдите по ссылке: {link}",
            from_email=getattr(settings, "DEFAULT_FROM_EMAIL", None),
            recipient_list=[email],
            fail_silently=False,
        )
        logger.info("Self-service reset email sent to %s", email)
    except Exception as e:
        logger.error("Self-service reset email failed for %s: %s", email, e, exc_info=True)
    return Response({"detail": "Если email зарегистрирован, письмо отправлено"}, status=status.HTTP_200_OK)


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
    user.save()
    return Response({"detail": "Пароль обновлён"}, status=status.HTTP_200_OK)
