import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token

client = TestClient(app)

def test_kpis_endpoint_unauthorized():
    # Intento de acceso sin token JWT
    response = client.get("/api/kpis")
    assert response.status_code == 401
    assert "Token de autorizacion ausente" in response.json()["detail"]

def test_admin_backfill_forbidden_for_viewer():
    # Token con rol 'viewer'
    viewer_token = create_access_token(data={"sub": "viewer@sismowatch.internal", "role": "viewer"})
    headers = {"Authorization": f"Bearer {viewer_token}"}

    payload = {"start_date": "2026-01-01", "end_date": "2026-01-10", "min_magnitude": 2.5}
    response = client.post("/api/admin/backfill", json=payload, headers=headers)

    # Debe retornar 403 Forbidden tajante
    assert response.status_code == 403
    assert "Accion restringida" in response.json()["detail"]

def test_admin_backfill_allowed_for_admin():
    # Token con rol 'admin'
    admin_token = create_access_token(data={"sub": "admin@sismowatch.internal", "role": "admin"})
    headers = {"Authorization": f"Bearer {admin_token}"}

    payload = {"start_date": "2026-01-01", "end_date": "2026-01-10", "min_magnitude": 2.5}
    response = client.post("/api/admin/backfill", json=payload, headers=headers)

    assert response.status_code == 200
    assert response.json()["status"] == "success"
