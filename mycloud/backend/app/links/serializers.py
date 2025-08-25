from rest_framework import serializers
from .models import Link


class LinkSerializer(serializers.ModelSerializer):
    """Ответ: данные о ссылке + удобный относительный URL."""
    url = serializers.SerializerMethodField()

    class Meta:
        model = Link
        fields = ("id", "token", "created_at", "expires_at", "url")

    def get_url(self, obj):
        # относительный путь публичного скачивания
        return f"/api/public/{obj.token}/"


class LinkCreateSerializer(serializers.Serializer):
    """Тело запроса при создании ссылки."""
    file_id = serializers.IntegerField()
    # ISO datetime, опционально; можно прислать null, тогда бессрочная
    expires_at = serializers.DateTimeField(required=False, allow_null=True)
