from django.core.files.storage import FileSystemStorage
from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken

class EncryptedFileSystemStorage(FileSystemStorage):
    def __init__(self, *args, **kwargs):
        location = kwargs.pop("location", settings.MEDIA_ROOT)
        super().__init__(location=location, *args, **kwargs)
        key = settings.ENCRYPTION_KEY
        try:
            self.fernet = Fernet(key)
        except Exception:
            import base64, hashlib
            k = hashlib.sha256(key.encode()).digest()
            self.fernet = Fernet(base64.urlsafe_b64encode(k))

    def _save(self, name, content):
        data = content.read()
        token = self.fernet.encrypt(data)
        from django.core.files.base import ContentFile
        encrypted_file = ContentFile(token)
        return super()._save(name, encrypted_file)

    def open_decrypted(self, name):
        f = super().open(name, mode="rb")
        token = f.read()
        f.close()
        try:
            data = self.fernet.decrypt(token)
        except InvalidToken:
            data = token
        from django.core.files.base import ContentFile
        return ContentFile(data)
