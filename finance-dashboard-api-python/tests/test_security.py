"""Tests del módulo de seguridad: hashing y JWT."""
from datetime import timedelta
from app.core import security


def test_hash_and_verify_password_ok():
    pw = "S3cur3-P@ss"
    hashed = security.get_password_hash(pw)
    assert hashed != pw
    assert security.verify_password(pw, hashed) is True


def test_verify_password_rejects_wrong():
    hashed = security.get_password_hash("right")
    assert security.verify_password("wrong", hashed) is False


def test_verify_password_handles_garbage_hash():
    # No debe explotar con hashes inválidos.
    assert security.verify_password("anything", "not-a-bcrypt-hash") is False


def test_access_token_has_claims():
    from jose import jwt
    token = security.create_access_token(data={"userId": "u1", "email": "a@b.com"})
    payload = jwt.decode(
        token,
        security.SECRET_KEY,
        algorithms=[security.ALGORITHM],
        audience=security.JWT_AUDIENCE,
        issuer=security.JWT_ISSUER,
    )
    assert payload["userId"] == "u1"
    assert "jti" in payload
    assert "iat" in payload
    assert "exp" in payload
    assert payload["aud"] == security.JWT_AUDIENCE
    assert payload["iss"] == security.JWT_ISSUER


def test_access_token_expiry_respects_delta():
    from jose import jwt
    token = security.create_access_token(data={"userId": "u1"}, expires_delta=timedelta(minutes=1))
    payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM],
                        audience=security.JWT_AUDIENCE, issuer=security.JWT_ISSUER)
    assert payload["exp"] - payload["iat"] == 60
