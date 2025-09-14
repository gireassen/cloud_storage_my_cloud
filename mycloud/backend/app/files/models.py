from django.db import models
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver
from django.utils import timezone
from app.core.storage import EncryptedFileSystemStorage

efs = EncryptedFileSystemStorage()

def upload_path(instance, filename):
    from uuid import uuid4
    today = timezone.localdate()
    return f"{instance.user_id}/{today:%Y/%m/%d}/{uuid4().hex}"

class File(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="files")
    original_name = models.CharField(max_length=255)
    file = models.FileField(upload_to=upload_path, storage=efs)
    size = models.BigIntegerField()
    uploaded_at = models.DateTimeField(auto_now_add=True)
    description = models.TextField(blank=True, null=True)

    last_downloaded_at = models.DateTimeField(blank=True, null=True)
    download_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-uploaded_at"]

    def __str__(self):
        return f"{self.original_name} ({self.user_id})"

def delete_content_file(sender, instance, **kwargs):
    try:
        name = getattr(instance, "file").name if getattr(instance, "file") else None
    except Exception:
        name = None
    if name and efs.exists(name):
        try:
            efs.delete(name)
        except Exception:
            pass

@receiver(post_delete, sender=File)
def on_file_row_deleted(sender, instance, **kwargs):
    delete_content_file(sender, instance, **kwargs)