"""Tests del growth layer: atribución, referidos, recompensas y entitlements."""
from datetime import datetime, timedelta, timezone

from app.database import models
from app.modules.growth.entitlements import (
    entitlements_for,
    has_feature,
    is_premium,
)
from app.modules.growth.logic import (
    CODE_PREFIX,
    ReferralLite,
    can_self_refer,
    earned_reward_months,
    extract_referrer_host,
    generate_referral_code,
    next_reward_tier,
    normalize_landing_path,
    normalize_referral_code,
    normalize_utm,
    qualified_count,
)
from app.modules.growth.processor import (
    apply_attribution,
    attach_referral,
    ensure_referral_code,
    grant_premium_months,
    qualify_referral,
)


# ─── Lógica pura: saneo de atribución ─────────────────────────────────────────

def test_normalize_utm_lowercases_and_trims():
    assert normalize_utm("  Reddit  ") == "reddit"


def test_normalize_utm_strips_dangerous_chars():
    """Los UTM vienen de la URL — no deben poder inyectar basura en los reportes."""
    assert normalize_utm("<script>alert(1)</script>") == "scriptalert1script"


def test_normalize_utm_returns_none_for_empty():
    assert normalize_utm("") is None
    assert normalize_utm(None) is None
    assert normalize_utm("!!!") is None


def test_normalize_utm_truncates_long_values():
    assert len(normalize_utm("a" * 500)) == 64


def test_extract_referrer_host_drops_path():
    """Guardamos solo el host: el path del referrer puede traer PII o tokens."""
    assert extract_referrer_host("https://www.reddit.com/r/merval/comments/abc") == "reddit.com"


def test_extract_referrer_host_handles_junk():
    assert extract_referrer_host("") is None
    assert extract_referrer_host(None) is None
    assert extract_referrer_host("not a url") is None


def test_normalize_landing_path_drops_query():
    assert normalize_landing_path("https://vueltito.com/pricing?utm_source=x") == "/pricing"


def test_normalize_landing_path_adds_leading_slash():
    assert normalize_landing_path("pricing") == "/pricing"


# ─── Lógica pura: códigos de referido ─────────────────────────────────────────

def test_generate_referral_code_format():
    code = generate_referral_code()
    assert code.startswith(f"{CODE_PREFIX}-")
    assert len(code) == len(CODE_PREFIX) + 1 + 6


def test_generate_referral_code_avoids_ambiguous_chars():
    """Sin 0/O/1/I/L — los códigos se dictan por voz y se tipean a mano."""
    codes = "".join(generate_referral_code() for _ in range(50))
    body = codes.replace(f"{CODE_PREFIX}-", "")
    for ambiguous in "01OIL":
        assert ambiguous not in body


def test_generate_referral_code_is_unique_enough():
    codes = {generate_referral_code() for _ in range(200)}
    assert len(codes) == 200


def test_normalize_referral_code_uppercases():
    code = generate_referral_code()
    assert normalize_referral_code(code.lower()) == code


def test_normalize_referral_code_rejects_malformed():
    assert normalize_referral_code("NOPE") is None
    assert normalize_referral_code("") is None
    assert normalize_referral_code(None) is None
    assert normalize_referral_code("VLT-000000") is None  # 0 no está en el alfabeto


def test_can_self_refer_blocks_same_user():
    assert can_self_refer("u1", "u1") is False
    assert can_self_refer("u1", "u2") is True


# ─── Lógica pura: recompensas ─────────────────────────────────────────────────

def test_qualified_count_ignores_pending():
    referrals = [
        ReferralLite(status="qualified"),
        ReferralLite(status="pending"),
        ReferralLite(status="qualified"),
    ]
    assert qualified_count(referrals) == 2


def test_earned_reward_months_by_tier():
    assert earned_reward_months(0) == 0
    assert earned_reward_months(1) == 1
    assert earned_reward_months(2) == 1
    assert earned_reward_months(3) == 3
    assert earned_reward_months(5) == 6


def test_earned_reward_months_is_not_cumulative():
    """5 referidos dan 6 meses, no 1+3+6=10."""
    assert earned_reward_months(5) == 6


def test_next_reward_tier_reports_missing():
    tier = next_reward_tier(0)
    assert tier["qualified"] == 1
    assert tier["missing"] == 1

    tier = next_reward_tier(2)
    assert tier["qualified"] == 3
    assert tier["missing"] == 1

    assert next_reward_tier(99) is None


# ─── Entitlements ─────────────────────────────────────────────────────────────

def _user(plan_type="free", expires=None):
    u = models.User(email="x@x.com", password_hash="h", name="X")
    u.plan_type = plan_type
    u.plan_expires_at = expires
    return u


def test_free_user_is_not_premium():
    assert is_premium(_user()) is False


def test_premium_without_expiry_is_premium():
    assert is_premium(_user("premium", None)) is True


def test_premium_with_future_expiry_is_premium():
    future = datetime.now(timezone.utc) + timedelta(days=10)
    assert is_premium(_user("premium", future)) is True


def test_expired_premium_is_not_premium():
    """El vencimiento manda sobre el flag: si expiró, no hay acceso pago."""
    past = datetime.now(timezone.utc) - timedelta(days=1)
    assert is_premium(_user("premium", past)) is False


def test_naive_datetime_expiry_is_treated_as_utc():
    """Postgres puede devolver naive datetimes — no debe romper la comparación."""
    future_naive = (datetime.now(timezone.utc) + timedelta(days=5)).replace(tzinfo=None)
    assert is_premium(_user("premium", future_naive)) is True


def test_free_feature_available_to_everyone():
    assert has_feature(_user(), "budgets") is True


def test_premium_feature_blocked_for_free():
    assert has_feature(_user(), "ai_insights") is False
    assert has_feature(_user("premium", None), "ai_insights") is True


def test_entitlements_payload_shape():
    ent = entitlements_for(_user())
    assert ent["planType"] == "free"
    assert ent["isPremium"] is False
    assert ent["features"]["ai_insights"] is False
    assert ent["limits"]["chatMonthlyMessages"] == 20

    ent = entitlements_for(_user("premium", None))
    assert ent["isPremium"] is True
    assert ent["limits"]["chatMonthlyMessages"] is None


# ─── Processor: atribución ────────────────────────────────────────────────────

def test_apply_attribution_persists_normalized_values(db_session, user):
    apply_attribution(
        user,
        utm_source="  Reddit ",
        utm_medium="Organic",
        utm_campaign="Beta-Lanzamiento",
        referrer="https://www.reddit.com/r/merval/x",
        landing_path="/pricing?utm_source=reddit",
    )
    db_session.commit()

    assert user.acquisition_source == "reddit"
    assert user.acquisition_medium == "organic"
    assert user.acquisition_campaign == "beta-lanzamiento"
    assert user.acquisition_referrer == "reddit.com"
    assert user.acquisition_landing == "/pricing"


def test_apply_attribution_is_first_touch_only(db_session, user):
    """Lo que medimos es qué canal trajo al usuario, no el último que tocó."""
    apply_attribution(user, utm_source="reddit")
    db_session.commit()
    apply_attribution(user, utm_source="instagram")
    db_session.commit()

    assert user.acquisition_source == "reddit"


# ─── Processor: códigos y referidos ───────────────────────────────────────────

def test_ensure_referral_code_is_idempotent(db_session, user):
    first = ensure_referral_code(db_session, user)
    second = ensure_referral_code(db_session, user)
    db_session.commit()
    assert first == second


def _make_user(db_session, email):
    u = models.User(email=email, password_hash="h", name=email.split("@")[0])
    db_session.add(u)
    db_session.flush()
    return u


def test_attach_referral_links_users(db_session, user):
    code = ensure_referral_code(db_session, user)
    invited = _make_user(db_session, "invited@x.com")

    referral = attach_referral(db_session, referred_user=invited, raw_code=code)
    db_session.commit()

    assert referral is not None
    assert referral.status == "pending"
    assert invited.referred_by_user_id == user.id


def test_attach_referral_gives_invited_user_instant_bonus(db_session, user):
    """El bonus inmediato al invitado es lo que hace que valga la pena usar el link."""
    code = ensure_referral_code(db_session, user)
    invited = _make_user(db_session, "invited2@x.com")

    attach_referral(db_session, referred_user=invited, raw_code=code)
    db_session.commit()

    assert is_premium(invited) is True


def test_attach_referral_ignores_bad_code(db_session, user):
    """Un código inválido no debe hacer fallar el registro."""
    invited = _make_user(db_session, "invited3@x.com")
    assert attach_referral(db_session, referred_user=invited, raw_code="GARBAGE") is None
    assert attach_referral(db_session, referred_user=invited, raw_code=None) is None


def test_attach_referral_blocks_self_referral(db_session, user):
    code = ensure_referral_code(db_session, user)
    db_session.commit()
    assert attach_referral(db_session, referred_user=user, raw_code=code) is None


def test_qualify_referral_rewards_referrer(db_session, user):
    code = ensure_referral_code(db_session, user)
    invited = _make_user(db_session, "invited4@x.com")
    attach_referral(db_session, referred_user=invited, raw_code=code)
    db_session.commit()

    assert is_premium(user) is False  # todavía no cobró nada

    referral = qualify_referral(db_session, invited)
    db_session.commit()

    assert referral.status == "qualified"
    assert referral.qualified_at is not None
    assert is_premium(user) is True  # 1 referido calificado = 1 mes


def test_qualify_referral_is_idempotent(db_session, user):
    """Reenviar onboarding-complete no debe volver a premiar."""
    code = ensure_referral_code(db_session, user)
    invited = _make_user(db_session, "invited5@x.com")
    attach_referral(db_session, referred_user=invited, raw_code=code)
    db_session.commit()

    qualify_referral(db_session, invited)
    db_session.commit()
    first_expiry = user.plan_expires_at

    assert qualify_referral(db_session, invited) is None
    db_session.commit()
    assert user.plan_expires_at == first_expiry


def test_grant_premium_months_stacks_from_existing_expiry(db_session, user):
    """Acumular recompensas no debe hacerte perder tiempo pago ya ganado.

    La comparación se hace antes del commit a propósito: SQLite devuelve datetimes
    naive al releer y no se pueden comparar con los aware que genera el código.
    En Postgres (timezone=True) vuelven aware. `is_premium` normaliza ambos casos.
    """
    grant_premium_months(user, 1)
    first = user.plan_expires_at
    grant_premium_months(user, 1)
    second = user.plan_expires_at

    assert second > first
    db_session.commit()
    assert is_premium(user) is True


def test_grant_premium_months_ignores_non_positive(db_session, user):
    grant_premium_months(user, 0)
    assert user.plan_type == "free"


# ─── Endpoints ────────────────────────────────────────────────────────────────

def test_growth_me_returns_code_and_entitlements(client):
    resp = client.get("/api/growth/me")
    assert resp.status_code == 200
    data = resp.json()
    assert data["referralCode"].startswith(f"{CODE_PREFIX}-")
    assert data["referrals"]["total"] == 0
    assert data["rewards"]["earnedMonths"] == 0
    assert data["entitlements"]["planType"] == "free"


def test_entitlements_endpoint(client):
    resp = client.get("/api/growth/entitlements")
    assert resp.status_code == 200
    assert resp.json()["isPremium"] is False


def test_pricing_intent_is_public_and_recorded(client, db_session):
    resp = client.post("/api/growth/pricing-intent", json={
        "action": "clicked_subscribe",
        "plan": "premium",
        "priceShownUsd": 6,
        "priceShownArs": 6000,
    })
    assert resp.status_code == 200
    assert resp.json()["success"] is True
    assert db_session.query(models.PricingIntent).count() == 1


def test_pricing_intent_rejects_unknown_action(client):
    """Un cliente viejo con una acción desconocida no debe romper la UI."""
    resp = client.post("/api/growth/pricing-intent", json={"action": "hacked"})
    assert resp.status_code == 200
    assert resp.json()["success"] is False


def test_pricing_intent_stats_returns_ctr(client):
    client.post("/api/growth/pricing-intent", json={"action": "viewed_pricing"})
    client.post("/api/growth/pricing-intent", json={"action": "viewed_pricing"})
    client.post("/api/growth/pricing-intent", json={"action": "clicked_subscribe"})

    resp = client.get("/api/growth/pricing-intent/stats")
    assert resp.status_code == 200
    data = resp.json()
    assert data["byAction"]["viewed_pricing"] == 2
    assert data["clickThroughRate"] == 0.5
