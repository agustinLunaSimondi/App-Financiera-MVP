"""
Fixtures pytest comunes.

Las pruebas unitarias se setean contra SQLite en memoria — rápido, sin red.
Los modelos usan `String` para ids (UUID-as-string) y SQLAlchemy lo respeta
tanto en Postgres como en SQLite.
"""
import os
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Setear vars antes de importar la app — security.py valida en import time.
os.environ.setdefault("SECRET_KEY", "test-secret-key-must-be-at-least-32-characters-long-for-validation")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ENCRYPTION_KEY", "ZmDfcTF7_60GrrY167zsiPd67pEvs0aGOv2oasOM1Pg=")

from app.database import models  # noqa: E402
from app.database.database import get_db  # noqa: E402
from app.core.deps import get_current_user  # noqa: E402
from main import app  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402


@pytest.fixture
def db_session():
    """In-memory SQLite con todas las tablas creadas."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    models.Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture
def user(db_session):
    """Crea un user persistido y lo retorna."""
    u = models.User(
        email="test@vuelto.app",
        password_hash="x",
        name="Test User",
        currency="ARS",
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u


@pytest.fixture
def client(db_session, user):
    """TestClient con override de get_db y get_current_user."""
    def _get_db():
        try:
            yield db_session
        finally:
            pass

    def _get_user():
        return user

    app.dependency_overrides[get_db] = _get_db
    app.dependency_overrides[get_current_user] = _get_user
    yield TestClient(app)
    app.dependency_overrides.clear()
