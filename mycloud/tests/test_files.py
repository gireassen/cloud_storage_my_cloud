import time
from django.utils import timezone
from app.files.models import File
import pytest

@pytest.mark.django_db
def test_list_empty(api, user):
    api.force_login(user)
    r = api.get("/api/files/")
    assert r.status_code == 200
    assert r.json() == []

@pytest.mark.django_db
def test_upload_and_list(api, user, small_file_bytes):
    api.force_login(user)
    r = api.get("/api/files/")
    assert r.status_code == 200

    # upload
    from django.core.files.uploadedfile import SimpleUploadedFile
    f = SimpleUploadedFile("hello.txt", small_file_bytes, content_type="text/plain")
    data = {"file": f, "description": "desc"}
    r = api.post("/api/files/", data, format="multipart")
    assert r.status_code == 201, r.content
    up = r.json()
    assert up["original_name"] == "hello.txt"
    assert up["size"] == len(small_file_bytes)

    # list
    r = api.get("/api/files/")
    assert r.status_code == 200
    files = r.json()
    assert len(files) == 1
    assert files[0]["original_name"] == "hello.txt"

@pytest.mark.django_db
def test_download_updates_counters(api, user, uploaded_file_obj):
    api.force_login(user)
    fid = uploaded_file_obj["id"]

    before = File.objects.get(pk=fid)
    assert before.download_count == 0 or before.download_count is None

    r = api.get(f"/api/files/{fid}/download/")
    assert r.status_code == 200
    assert r.get("Content-Disposition") is not None
    assert int(r.get("Content-Length") or 0) == uploaded_file_obj["size"]

    after = File.objects.get(pk=fid)
    assert after.download_count >= 1
    assert after.last_downloaded_at is not None

@pytest.mark.django_db
def test_delete(api, user, uploaded_file_obj):
    api.force_login(user)
    fid = uploaded_file_obj["id"]
    r = api.delete(f"/api/files/{fid}/")
    assert r.status_code in (204, 200)

    r = api.get("/api/files/")
    assert r.status_code == 200
    assert r.json() == []
