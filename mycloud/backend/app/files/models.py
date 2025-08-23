import uuid
from django.db import models
from django.conf import settings
from app.core.storage import EncryptedFileSystemStorage

efs = EncryptedFileSystemStorage()

def upload_path(instance, filename):
    from datetime import datetime
    today = datetime.utcnow().strftime("%Y/%m/%d")
    return f"{instance.user_id}/{today}/{uuid.uuid4().hex}"

class File(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="files")
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=upload_path, storage=efs)
    size = models.BigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.original_name} ({self.user_id})"
