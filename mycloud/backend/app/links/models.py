from django.db import models
from django.conf import settings
from django.utils import timezone

class Link(models.Model):
    file = models.ForeignKey("files.File", on_delete=models.CASCADE, related_name="links")
    token = models.CharField(max_length=64, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def is_expired(self):
        return self.expires_at is not None and self.expires_at < timezone.now()