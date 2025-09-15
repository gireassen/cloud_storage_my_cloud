import pytest

@pytest.mark.django_db
def test_create_link_and_public_download(api, user, uploaded_file_obj):
    api.force_login(user)
    r = api.post("/api/links/", {"file_id": uploaded_file_obj["id"]}, format="json")
    assert r.status_code == 201, r.content
    data = r.json()
    assert "token" in data
    assert "url" in data

    public_url = data["url"]
    assert public_url.startswith("/api/public/")
    r = api.get(public_url)
    assert r.status_code == 200
    assert int(r.get("Content-Length") or 0) == uploaded_file_obj["size"]
    assert "attachment; filename" in (r.get("Content-Disposition") or "")
