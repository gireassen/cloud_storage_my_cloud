from rest_framework import serializers
from django.conf import settings
from .models import File

class FileSerializer(serializers.ModelSerializer):
    class Meta:
        model = File
        fields = ("id", "original_name", "size", "uploaded_at", "description")

class FileUploadSerializer(serializers.Serializer):
    file = serializers.FileField()
    description = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_file(self, f):
        max_size = getattr(settings, "MAX_UPLOAD_SIZE", 100*1024*1024)
        if f.size > max_size:
            raise serializers.ValidationError(f"Размер файла превышает лимит {max_size} байт")
        return f


class FileAdminSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()

    class Meta:
        model = File
        fields = ("id", "original_name", "size", "uploaded_at", "description", "user")

    def get_user(self, obj):
        u = obj.user
        return {"id": u.id, "username": u.username, "email": u.email}
