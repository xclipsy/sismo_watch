import json
from datetime import datetime, timezone
import pytest

def transform_single_geojson_event(raw_feature: dict) -> dict:
    props = raw_feature.get("properties", {})
    geom = raw_feature.get("geometry", {})
    coords = geom.get("coordinates", [0.0, 0.0, 0.0])

    event_id = raw_feature.get("id")
    if not event_id:
        raise ValueError("Identificador unívoco 'id' obligatorio ausente")

    mag = float(props.get("mag") or 0.0)
    place = str(props.get("place") or "Ubicacion no especificada").strip()
    time_ms = props.get("time")
    updated_ms = props.get("updated")

    if time_ms is None or updated_ms is None:
        raise ValueError("Timestamp temporal ausente")

    time_utc = datetime.fromtimestamp(time_ms / 1000.0, tz=timezone.utc)
    updated_utc = datetime.fromtimestamp(updated_ms / 1000.0, tz=timezone.utc)

    lon = float(coords[0])
    lat = float(coords[1])
    depth = float(coords[2]) if len(coords) > 2 else 0.0

    # Validacion estricta de rangos fisicos (cero cuarentena)
    if not (-90.0 <= lat <= 90.0):
        return None
    if not (-180.0 <= lon <= 180.0):
        return None
    if not (-2.0 <= mag <= 10.0):
        return None

    return {
        "id": event_id,
        "mag": mag,
        "place": place,
        "time": time_utc,
        "updated": updated_utc,
        "longitude": lon,
        "latitude": lat,
        "depth_km": depth,
        "tsunami": bool(props.get("tsunami") == 1)
    }

def test_transform_valid_event():
    sample_feature = {
        "type": "Feature",
        "properties": {
            "mag": 5.4,
            "place": "12 km S of Guánica, Puerto Rico\n",
            "time": 1578304000000,
            "updated": 1578305000000,
            "tsunami": 1
        },
        "geometry": {
            "type": "Point",
            "coordinates": [-66.9, 17.9, 10.5]
        },
        "id": "pr2020006001"
    }

    result = transform_single_geojson_event(sample_feature)
    assert result is not None
    assert result["id"] == "pr2020006001"
    assert result["mag"] == 5.4
    assert result["latitude"] == 17.9
    assert result["longitude"] == -66.9
    assert result["depth_km"] == 10.5
    assert result["tsunami"] is True

def test_transform_invalid_latitude_filtered():
    invalid_feature = {
        "type": "Feature",
        "properties": {"mag": 3.0, "time": 1578304000000, "updated": 1578305000000},
        "geometry": {"type": "Point", "coordinates": [-66.9, 120.0, 10.5]},
        "id": "invalid_lat_001"
    }
    # Debe ser filtrado limpiamente retornando None sin arrojar excepcion
    assert transform_single_geojson_event(invalid_feature) is None

def test_transform_invalid_magnitude_filtered():
    invalid_feature = {
        "type": "Feature",
        "properties": {"mag": 15.0, "time": 1578304000000, "updated": 1578305000000},
        "geometry": {"type": "Point", "coordinates": [-66.9, 15.0, 10.5]},
        "id": "invalid_mag_001"
    }
    assert transform_single_geojson_event(invalid_feature) is None
