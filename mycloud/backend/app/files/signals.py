from django.db.models.signals import post_delete
from django.dispatch import receiver

from app.files.models import File


@receiver(post_delete, sender=File)
def delete_content_file(sender, instance: File, **kwargs):
    """
    При удалении записи удаляем и физический файл
    через тот же storage, что привязан к FileField.
    """
    f = getattr(instance, "file", None)
    if not f:
        return
    name = f.name
    storage = f.storage
    if name and storage.exists(name):
        try:
            storage.delete(name)
        except Exception:
            # намеренно не роняем удаление записи
            pass
