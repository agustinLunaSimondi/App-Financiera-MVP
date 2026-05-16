"""
Encriptación simétrica para datos sensibles en reposo (tokens OAuth de terceros, etc.).

Diseño:
- Usa Fernet (AES-128 CBC + HMAC) de la librería `cryptography`.
- La clave se lee de ENCRYPTION_KEY (env var). Generarla con:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
- Se expone un TypeDecorator de SQLAlchemy (`EncryptedString`) para encriptar
  transparentemente columnas: el ORM ve plaintext, la DB ve ciphertext.
- decrypt() tolera plaintext legacy: si Fernet falla con InvalidToken, devuelve
  el valor crudo (best-effort migration) y loggea un warning. La próxima escritura
  ya lo guardará encriptado.
"""
import os
import logging
from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy.types import TypeDecorator, String

logger = logging.getLogger(__name__)

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is not None:
        return _fernet
    key = os.getenv("ENCRYPTION_KEY")
    if not key:
        raise RuntimeError(
            "ENCRYPTION_KEY no está configurada. Generar con: "
            "python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
        )
    _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt(plaintext: str | None) -> str | None:
    if plaintext is None:
        return None
    return _get_fernet().encrypt(plaintext.encode()).decode()


def decrypt(ciphertext: str | None) -> str | None:
    if ciphertext is None:
        return None
    try:
        return _get_fernet().decrypt(ciphertext.encode()).decode()
    except InvalidToken:
        # Compatibilidad con filas previas a la introducción de cifrado.
        # No filtramos el valor en el log (es un token sensible).
        logger.warning("Valor encontrado en plaintext — se reencriptará en el próximo write")
        return ciphertext


class EncryptedString(TypeDecorator):
    """Columna String que cifra al persistir y descifra al leer."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt(value)

    def process_result_value(self, value, dialect):
        return decrypt(value)
