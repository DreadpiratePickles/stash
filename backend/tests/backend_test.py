"""
Stash backend API tests.
Covers: auth (login/register/me), stash CRUD, search, rediscover, stats.
Uses the public EXPO_PUBLIC_BACKEND_URL to mirror what the frontend hits.
"""
import os
import uuid
import base64
import io
import time

import pytest
import requests

# ---- Base URL from frontend env (public preview URL) ----
def _load_base_url() -> str:
    # Read from frontend/.env (preview public URL)
    env_path = "/app/frontend/.env"
    with open(env_path) as f:
        for line in f:
            if line.startswith("EXPO_PUBLIC_BACKEND_URL"):
                return line.split("=", 1)[1].strip().strip('"').rstrip("/")
    raise RuntimeError("EXPO_PUBLIC_BACKEND_URL missing")


BASE_URL = _load_base_url()
ADMIN_EMAIL = "hello@stash.app"
ADMIN_PASSWORD = "Stash2026!"


# ---- Shared session ----
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_token(api):
    r = api.post(f"{BASE_URL}/api/auth/login",
                 json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                 timeout=20)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---- Helper: real PNG (small, with visual features) ----
def _make_png_b64() -> str:
    from PIL import Image, ImageDraw
    img = Image.new("RGB", (96, 96), color=(30, 30, 30))
    d = ImageDraw.Draw(img)
    d.rectangle([10, 10, 86, 86], outline=(124, 58, 237), width=3)
    d.line([10, 10, 86, 86], fill=(200, 200, 50), width=2)
    d.line([86, 10, 10, 86], fill=(50, 200, 100), width=2)
    d.ellipse([30, 30, 66, 66], outline=(255, 255, 255), width=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


# =====================  AUTH TESTS  =====================
class TestAuth:
    def test_root(self, api):
        r = api.get(f"{BASE_URL}/api/", timeout=15)
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_login_admin_success(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=20)
        assert r.status_code == 200
        body = r.json()
        assert "access_token" in body and body["access_token"]
        assert body["user"]["email"] == ADMIN_EMAIL
        assert body["user"]["is_admin"] is True

    def test_login_wrong_password_401(self, api):
        r = api.post(f"{BASE_URL}/api/auth/login",
                     json={"email": ADMIN_EMAIL, "password": "wrong-pass-xxx"}, timeout=15)
        assert r.status_code == 401

    def test_register_and_duplicate(self, api):
        email = f"TEST_user_{uuid.uuid4().hex[:10]}@example.com"
        r = api.post(f"{BASE_URL}/api/auth/register",
                     json={"email": email, "password": "Pass1234!"}, timeout=15)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["email"] == email.lower()
        assert body["access_token"]

        # duplicate
        r2 = api.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "Pass1234!"}, timeout=15)
        assert r2.status_code == 409

    def test_me_requires_token(self, api):
        r = api.get(f"{BASE_URL}/api/auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL


# =====================  STASH AUTH GUARD  =====================
class TestStashAuthGuard:
    def test_list_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/stashes", timeout=15)
        assert r.status_code == 401

    def test_create_requires_auth(self, api):
        r = api.post(f"{BASE_URL}/api/stashes",
                     json={"type": "text", "raw_text": "hi"}, timeout=15)
        assert r.status_code == 401

    def test_stats_requires_auth(self, api):
        r = api.get(f"{BASE_URL}/api/stats", timeout=15)
        assert r.status_code == 401


# =====================  STASH CRUD  =====================
class TestStashFlows:
    created_ids: list = []

    def test_create_text_stash_ai_enriched(self, api, admin_headers):
        payload = {
            "type": "text",
            "raw_text": "TEST_stash: Watch the movie Inception by Christopher Nolan again — classic mind-bender.",
        }
        r = api.post(f"{BASE_URL}/api/stashes", json=payload, headers=admin_headers, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["id"]
        assert body["type"] == "text"
        assert isinstance(body["title"], str) and len(body["title"]) > 0
        assert isinstance(body["category"], str)
        assert isinstance(body["tags"], list)
        TestStashFlows.created_ids.append(body["id"])

        # GET to verify persistence
        rg = api.get(f"{BASE_URL}/api/stashes/{body['id']}", headers=admin_headers, timeout=15)
        assert rg.status_code == 200
        assert rg.json()["id"] == body["id"]

    def test_create_screenshot_stash_vision(self, api, admin_headers):
        b64 = _make_png_b64()
        payload = {"type": "screenshot", "image_base64": b64,
                   "raw_text": "TEST_screenshot purple frame test"}
        r = api.post(f"{BASE_URL}/api/stashes", json=payload, headers=admin_headers, timeout=120)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["type"] == "screenshot"
        assert body["image_base64"]
        TestStashFlows.created_ids.append(body["id"])

    def test_list_and_category_filter(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/stashes", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1

        # filter
        r2 = api.get(f"{BASE_URL}/api/stashes?category=movie", headers=admin_headers, timeout=15)
        assert r2.status_code == 200
        for it in r2.json():
            assert it["category"] == "movie"

    def test_search(self, api, admin_headers):
        # Search for TEST_ prefix used in raw_text
        r = api.get(f"{BASE_URL}/api/stashes/search?q=TEST_", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        assert len(items) >= 1

    def test_rediscover(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/stashes/rediscover", headers=admin_headers, timeout=20)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

        # with location
        r2 = api.get(f"{BASE_URL}/api/stashes/rediscover?lat=37.77&lng=-122.42",
                     headers=admin_headers, timeout=20)
        assert r2.status_code == 200

    def test_patch_note(self, api, admin_headers):
        assert TestStashFlows.created_ids, "no stash created earlier"
        sid = TestStashFlows.created_ids[0]
        new_note = f"TEST_note_{uuid.uuid4().hex[:6]}"
        r = api.patch(f"{BASE_URL}/api/stashes/{sid}",
                      json={"note": new_note}, headers=admin_headers, timeout=15)
        assert r.status_code == 200
        assert r.json()["note"] == new_note

        # GET to verify persistence
        rg = api.get(f"{BASE_URL}/api/stashes/{sid}", headers=admin_headers, timeout=15)
        assert rg.json()["note"] == new_note

    def test_stats(self, api, admin_headers):
        r = api.get(f"{BASE_URL}/api/stats", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert "total" in body and "by_category" in body
        assert isinstance(body["total"], int)
        assert isinstance(body["by_category"], dict)

    def test_other_user_cannot_access(self, api, admin_headers):
        # register a second user and try to fetch admin's stash
        email = f"TEST_other_{uuid.uuid4().hex[:8]}@example.com"
        rr = api.post(f"{BASE_URL}/api/auth/register",
                      json={"email": email, "password": "Pass1234!"}, timeout=15)
        assert rr.status_code == 200
        other_headers = {"Authorization": f"Bearer {rr.json()['access_token']}",
                         "Content-Type": "application/json"}
        sid = TestStashFlows.created_ids[0]
        r = api.get(f"{BASE_URL}/api/stashes/{sid}", headers=other_headers, timeout=15)
        assert r.status_code == 404

    def test_delete(self, api, admin_headers):
        # Delete all created in this run for cleanup
        ok = 0
        for sid in TestStashFlows.created_ids:
            r = api.delete(f"{BASE_URL}/api/stashes/{sid}", headers=admin_headers, timeout=15)
            if r.status_code == 200:
                ok += 1
                # confirm 404 after
                rg = api.get(f"{BASE_URL}/api/stashes/{sid}", headers=admin_headers, timeout=15)
                assert rg.status_code == 404
        assert ok == len(TestStashFlows.created_ids)
