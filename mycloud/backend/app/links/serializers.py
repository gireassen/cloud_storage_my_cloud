from rest_framework import serializers
from django.urls import reverse
from .models import Link

class LinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = Link
        fields = ["id", "token", "url", "created_at"]

    def get_url(self, obj):
        return reverse("public-download", kwargs={"token": obj.token})
