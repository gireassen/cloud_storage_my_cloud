import pytest

@pytest.mark.django_db
def test_register_ok(api):
    payload = {
        "username": "User1234",
        "email": "u1234@example.com",
        "password": "Strong1!",
        "full_name": "User Name",
    }
    r = api.post("/api/auth/register/", payload, format="json")
    assert r.status_code in (201, 200), r.content
    data = r.json()
    assert data["username"] == "User1234"
    assert data["email"] == "u1234@example.com"

@pytest.mark.django_db
def test_register_bad_username(api):
    payload = {
        "username": "1bad",
        "email": "bad@example.com",
        "password": "Strong1!",
    }
    r = api.post("/api/auth/register/", payload, format="json")
    assert r.status_code == 400
    assert "username" in r.json()

@pytest.mark.django_db
def test_register_bad_password(api):
    payload = {
        "username": "GoodName",
        "email": "good@example.com",
        "password": "weak",
    }
    r = api.post("/api/auth/register/", payload, format="json")
    assert r.status_code == 400
    assert "password" in r.json()
