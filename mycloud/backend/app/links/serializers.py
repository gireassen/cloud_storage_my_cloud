from rest_framework import serializers
from .models import Link
from app.files.serializers import FileSerializer

class LinkSerializer(serializers.ModelSerializer):
    file = FileSerializer(read_only=True)
    class Meta:
        model = Link
        fields = ("id", "url", "file", "created_at", "expires_at")
        read_only_fields = ("id", "url", "created_at")


    def get_url(self, obj):
        # относительный путь публичного скачивания
        return f"/api/public/{obj.token}/"


class LinkCreateSerializer(serializers.Serializer):
    """Тело запроса при создании ссылки."""
    file_id = serializers.IntegerField()
    # ISO datetime, опционально; можно прислать null, тогда бессрочная
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
