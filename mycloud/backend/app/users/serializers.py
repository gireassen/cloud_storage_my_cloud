import re
from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password as dj_validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

User = get_user_model()
USERNAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9]{3,19}$")

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
        v = getattr(obj, "files_count", 0)
        return int(v or 0)

    def get_files_total_size(self, obj):
        v = getattr(obj, "files_total_size", 0)
        return int(v or 0)

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def validate_username(self, v: str):
        v = (v or "").strip()
        if not USERNAME_RE.fullmatch(v):
            raise serializers.ValidationError("Логин: латиница и цифры, первая — буква, длина 4–20 символов.")
        if User.objects.filter(username__iexact=v).exists():
            raise serializers.ValidationError("Пользователь с таким логином уже существует.")
        return v

    def validate_email(self, v: str):
        email = serializers.EmailField().to_internal_value((v or "").strip().lower())
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("Пользователь с таким email уже существует.")
        return email

    def validate(self, attrs):
        pwd = attrs.get("password") or ""
        tmp_user = User(username=attrs.get("username"), email=attrs.get("email"))
        try:
            dj_validate_password(pwd, user=tmp_user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.is_active = True
        user.set_password(password)
        user.save()
        return user

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, v: str):
        user = self.context.get("user")
        try:
            dj_validate_password(v, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return v

class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()

class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_new_password(self, v: str):
        try:
            dj_validate_password(v)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return v
