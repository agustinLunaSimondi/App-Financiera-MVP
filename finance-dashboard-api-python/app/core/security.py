import bcrypt
import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY") or os.getenv("JWT_SECRET")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
# JWT corto. Para una finance app, 60min es el techo razonable sin refresh token.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY/JWT_SECRET no está configurada. Configurala en .env antes de arrancar. "
        "Generala con: python -c \"import secrets; print(secrets.token_urlsafe(64))\""
    )

if len(SECRET_KEY) < 32:
    raise RuntimeError(
        "SECRET_KEY/JWT_SECRET es demasiado corta (<32 chars). Usá un secreto largo y aleatorio."
    )

# Hash bcrypt fijo usado para nivelar el tiempo de respuesta cuando el usuario no existe.
# Evita ataques de enumeración de usuarios por timing en /auth/login.
DUMMY_PASSWORD_HASH = bcrypt.hashpw(b"timing-equalizer", bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # iat (issued-at) habilita revocación por User.tokens_invalidated_at (ver deps.py)
    to_encode.update({"exp": expire, "iat": now})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
