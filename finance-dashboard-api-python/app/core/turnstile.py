"""
Verificación de Cloudflare Turnstile (anti-bot) en endpoints públicos.

No-op mientras TURNSTILE_SECRET_KEY no esté configurada: devuelve True siempre.
Así el registro y la waitlist no se rompen en dev local ni en producción hasta
que se cree el widget en el dashboard de Cloudflare y se seteen las dos env vars
(secret acá, site key en el frontend).
"""
import os
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

TURNSTILE_SECRET_KEY = os.getenv("TURNSTILE_SECRET_KEY", "").strip()
TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def verify_turnstile(token: Optional[str], remote_ip: Optional[str] = None) -> bool:
    """Verifica un token de Turnstile contra la API de Cloudflare.

    Devuelve True si TURNSTILE_SECRET_KEY no está configurada (feature apagada).
    """
    if not TURNSTILE_SECRET_KEY:
        return True
    if not token:
        return False

    payload = {"secret": TURNSTILE_SECRET_KEY, "response": token}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        resp = httpx.post(TURNSTILE_VERIFY_URL, data=payload, timeout=5.0)
        return bool(resp.json().get("success"))
    except httpx.HTTPError:
        logger.warning("Turnstile: fallo al verificar token", exc_info=True)
        return False
