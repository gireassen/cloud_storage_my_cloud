# app/core/storage.py
import os
import base64
import hashlib
from django.core.files.storage import FileSystemStorage
from django.core.files.base import ContentFile
from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken

class EncryptedFileSystemStorage(FileSystemStorage):
    def __init__(self, *args, **kwargs):
        location = kwargs.pop("location", settings.MEDIA_ROOT)
        super().__init__(location=location, *args, **kwargs)

        key = getattr(settings, "ENCRYPTION_KEY", None)
        if not key:
            key = "dev-secret-key"
        try:
            self.fernet = Fernet(key)
        except Exception:
            k = hashlib.sha256(key.encode()).digest()
            self.fernet = Fernet(base64.urlsafe_b64encode(k))

    def _save(self, name, content):
        name = self.get_available_name(name)
        full_path = self.path(name)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        try:
            content.seek(0)
        except Exception:
            pass
        data = content.read()
        token = self.fernet.encrypt(data)

        enc = ContentFile(token)
        return super()._save(name, enc)

    def open_decrypted(self, name):
        """
        Открываем файл, читаем, расшифровываем и возвращаем ContentFile (file-like).
        Если файла нет — возвращаем None (пусть вьюха отдаст 404).
        """
        full_path = self.path(name)
        if not os.path.exists(full_path):
            return None

        with super().open(name, mode="rb") as f:
            token = f.read()
        try:
            data = self.fernet.decrypt(token)
        except InvalidToken:
            data = token
        return ContentFile(data, name=os.path.basename(name))
