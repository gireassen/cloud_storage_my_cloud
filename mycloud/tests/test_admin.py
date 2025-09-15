import pytest
from django.contrib.auth import get_user_model
User = get_user_model()

@pytest.mark.django_db
def test_admin_lists(api, admin, user, uploaded_file_obj):
    api.force_login(admin)

    r = api.get("/api/admin/users/")
    assert r.status_code == 200
    users = r.json()
    assert any(u["username"] == user.username for u in users)
    assert any(u["username"] == admin.username for u in users)

    r = api.get("/api/admin/files/")
    assert r.status_code == 200
    files = r.json()
    assert any(f["id"] == uploaded_file_obj["id"] for f in files)
