from datetime import datetime, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core import security
from app.database.database import get_db
from app.database import models
from app import schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No se pudieron validar las credenciales",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, security.SECRET_KEY, algorithms=[security.ALGORITHM])
        user_id: str = payload.get("userId")
        iat = payload.get("iat")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception

    # Revocación: si tokens_invalidated_at > iat, el token quedó invalidado
    # (logout total, cambio de contraseña, posible compromiso).
    if user.tokens_invalidated_at and iat is not None:
        try:
            iat_dt = datetime.fromtimestamp(iat, tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            raise credentials_exception
        if iat_dt < user.tokens_invalidated_at:
            raise credentials_exception

    return user
