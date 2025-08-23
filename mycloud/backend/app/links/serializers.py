from rest_framework import serializers
from .models import Link

class LinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Link
        fields = ("id", "token", "created_at", "expires_at", "url")

    def get_url(self, obj):
        return f"/api/public/{obj.token}/"
