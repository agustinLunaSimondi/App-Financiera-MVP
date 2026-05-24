"""Tests para benchmark anonimizado (#59)."""
from decimal import Decimal

from app.modules.benchmark.aggregator import (
    MIN_BUCKET_SIZE, _percentile, compute_buckets,
)


def test_percentile_basic():
    vals = [Decimal(str(x)) for x in [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]]
    assert _percentile(vals, 0.5) == Decimal("55.0")
    assert _percentile(vals, 0.25).quantize(Decimal("0.01")) == Decimal("32.50")
    assert _percentile(vals, 0.75).quantize(Decimal("0.01")) == Decimal("77.50")


def test_percentile_empty():
    assert _percentile([], 0.5) == Decimal("0")


def test_bucket_below_min_is_excluded():
    """Buckets con < MIN_BUCKET_SIZE muestras no se publican (k-anonymity)."""
    user_demo = {f"u{i}": ("25-34", "AR-CABA") for i in range(MIN_BUCKET_SIZE - 1)}
    spend = {uid: {"Comida": Decimal("1000")} for uid in user_demo}
    out = compute_buckets(spend, user_demo)
    assert out == []


def test_bucket_at_min_is_included():
    user_demo = {f"u{i}": ("25-34", "AR-CABA") for i in range(MIN_BUCKET_SIZE)}
    spend = {uid: {"Comida": Decimal(str(1000 + i * 10))} for i, uid in enumerate(user_demo.keys())}
    out = compute_buckets(spend, user_demo)
    assert len(out) == 1
    bucket = out[0]
    assert bucket["sample_size"] == MIN_BUCKET_SIZE
    assert bucket["age_range"] == "25-34"
    assert bucket["geo_region"] == "AR-CABA"
    assert bucket["category_name"] == "Comida"
    assert bucket["p25"] < bucket["p50"] < bucket["p75"]


def test_invalid_demo_filtered_out():
    user_demo = {f"u{i}": ("invalid-age", "AR-CABA") for i in range(MIN_BUCKET_SIZE)}
    spend = {uid: {"Comida": Decimal("1000")} for uid in user_demo}
    out = compute_buckets(spend, user_demo)
    assert out == []


def test_buckets_split_by_demo():
    """Mismo gasto en categoría idéntica pero edades distintas → buckets separados."""
    demo = {}
    spend = {}
    for i in range(MIN_BUCKET_SIZE):
        demo[f"young{i}"] = ("18-24", "AR-CABA")
        spend[f"young{i}"] = {"Comida": Decimal("1000")}
        demo[f"old{i}"] = ("35-44", "AR-CABA")
        spend[f"old{i}"] = {"Comida": Decimal("2000")}
    out = compute_buckets(spend, demo)
    age_ranges = {b["age_range"] for b in out}
    assert {"18-24", "35-44"} == age_ranges


def test_prefs_endpoint_roundtrip(client, db_session, user):
    """GET → PUT → GET refleja los cambios."""
    r = client.get("/api/benchmark/prefs")
    assert r.status_code == 200
    assert r.json()["optIn"] is False

    # Intentar opt-in sin demo → 400
    r = client.put("/api/benchmark/prefs", json={"optIn": True})
    assert r.status_code == 400

    r = client.put("/api/benchmark/prefs", json={"ageRange": "25-34", "geoRegion": "AR-CABA", "optIn": True})
    assert r.status_code == 200
    body = r.json()
    assert body["optIn"] is True
    assert body["ageRange"] == "25-34"


def test_invalid_age_range_rejected(client, db_session, user):
    r = client.put("/api/benchmark/prefs", json={"ageRange": "200+"})
    assert r.status_code == 400


def test_me_returns_empty_when_opt_out(client, db_session, user):
    r = client.get("/api/benchmark/me")
    assert r.status_code == 200
    assert r.json()["enabled"] is False
