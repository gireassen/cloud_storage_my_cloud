from rest_framework import serializers
from django.urls import reverse
from .models import Link
from app.files.serializers import FileSerializer

def pick_identifier(obj):
    for attr in ("slug", "token", "code", "uuid"):
        if hasattr(obj, attr):
            val = getattr(obj, attr)
            if val:
                return str(val)
    return str(obj.pk)

class LinkSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()
    file = FileSerializer(read_only=True)

    class Meta:
        model = Link
        fields = ("id", "url", "file", "created_at", "expires_at")
        read_only_fields = ("id", "url", "created_at")

    def get_url(self, obj):
        ident = pick_identifier(obj)
        return reverse("public-download", kwargs={"token": ident})
