from django.core.management.base import BaseCommand
from app.files.models import File
from app.core.storage import EncryptedFileSystemStorage

class Command(BaseCommand):
    help = "Проверить соответствие БД и хранилища"

    def handle(self, *args, **opts):
        efs = EncryptedFileSystemStorage()
        missing = 0
        for f in File.objects.all():
            if not efs.exists(f.file.name):
                self.stdout.write(self.style.WARNING(f"Missing: {f.id} {f.file.name}"))
                missing += 1
        self.stdout.write(self.style.SUCCESS(f"Done. Missing: {missing}"))
