import secrets
from datetime import datetime, timedelta
from django.db import models
from app.files.models import File
from django.utils import timezone

def token_gen():
    return secrets.token_urlsafe(32)

class Link(models.Model):
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name="links")
    token = models.CharField(max_length=128, default=token_gen, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    def is_expired(self):
        return self.expires_at is not None and self.expires_at < timezone.now()

    def __str__(self):
        return f"link:{self.id} -> file:{self.file_id}"
