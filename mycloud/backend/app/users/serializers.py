from django.contrib.auth import get_user_model
from rest_framework import serializers
import re

User = get_user_model()

USERNAME_RE = re.compile(r'^[A-Za-z][A-Za-z0-9]{3,19}$')

class UserSerializer(serializers.ModelSerializer):
    files_count = serializers.SerializerMethodField(read_only=True)
    files_total_size = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "is_active",
            "is_staff",
            "date_joined",
            "files_count",
            "files_total_size",
        )

    def get_files_count(self, obj):
        val = getattr(obj, "files_count", 0)
        return int(val or 0)

    def get_files_total_size(self, obj):
        val = getattr(obj, "files_total_size", 0)
        return int(val or 0)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    full_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ("username", "email", "password", "full_name")

    def validate_username(self, v: str):
        v = (v or "").strip()
        if not USERNAME_RE.fullmatch(v):
            raise serializers.ValidationError(
                "Логин: латиница и цифры, первая — буква, длина 4–20 символов."
            )
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError("Пользователь с таким логином уже существует.")
        return v

    def validate_email(self, v: str):
        email = serializers.EmailField().to_internal_value((v or "").strip().lower())
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return email

    def _validate_password_policy(self, pwd: str):
        if len(pwd) < 6:
            raise serializers.ValidationError("Пароль должен быть не короче 6 символов.")
        if not re.search(r"[A-Z]", pwd):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 заглавную букву.")
        if not re.search(r"\d", pwd):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 цифру.")
        if not re.search(r"[^\w\s]", pwd):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 спецсимвол.")

    def validate_password(self, v: str):
        self._validate_password_policy(v or "")
        return v

    def create(self, validated_data):
        password = validated_data.pop("password")
        full_name = (validated_data.pop("full_name", "") or "").strip()
        user = User(**validated_data)
        if hasattr(user, "full_name"):
            user.full_name = full_name
        elif full_name:
            parts = full_name.split(" ", 1)
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ""
        user.is_active = True
        user.set_password(password)
        user.save()
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, v: str):
        if len(v) < 6:
            raise serializers.ValidationError("Пароль должен быть не короче 6 символов.")
        if not re.search(r"[A-Z]", v):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 заглавную букву.")
        if not re.search(r"\d", v):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 цифру.")
        if not re.search(r"[^\w\s]", v):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 спецсимвол.")
        return v


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, v: str):
        if len(v) < 6:
            raise serializers.ValidationError("Пароль должен быть не короче 6 символов.")
        if not re.search(r"[A-Z]", v):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 заглавную букву.")
        if not re.search(r"\d", v):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 цифру.")
        if not re.search(r"[^\w\s]", v):
            raise serializers.ValidationError("Пароль должен содержать ≥ 1 спецсимвол.")
        return v
