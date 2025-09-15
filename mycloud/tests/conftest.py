import io
import os
import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

User = get_user_model()

@pytest.fixture(autouse=True)
def _settings_overrides(settings, tmp_path):
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.ENCRYPTION_KEY = os.environ.get("ENCRYPTION_KEY", "test-secret-key-please-change")
    return settings

@pytest.fixture
def api() -> APIClient:
    return APIClient()

@pytest.fixture
def user(db):
    return User.objects.create_user(
        username="johnsmith",
        email="john@example.com",
        password="P@ssw0rd!"
    )

@pytest.fixture
def admin(db):
    return User.objects.create_user(
        username="admin",
        email="admin@example.com",
        password="P@ssw0rd!",
        is_staff=True,
        is_superuser=True,
    )

@pytest.fixture
def small_file_bytes():
    return b"hello, world!"

@pytest.fixture
def uploaded_file_obj(api, user, small_file_bytes):
    api.force_login(user)
    f = SimpleUploadedFile("hello.txt", small_file_bytes, content_type="text/plain")
    data = {"file": f, "description": "test file"}
    resp = api.post("/api/files/", data, format="multipart")
    assert resp.status_code == 201, resp.content
    return resp.json()
