"""
Adaptador de email vía Resend (https://resend.com).

Config:
- RESEND_API_KEY: si está set, se manda real.
- RESEND_FROM_EMAIL: from address ("Vueltito <hola@vueltitox.com>").
- Sin RESEND_API_KEY: log-only. Sirve para dev sin gastar quota.

Uso:
    send_email(to="user@x.com", subject="Hola", html="<p>...</p>")
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

RESEND_API_URL = "https://api.resend.com/emails"


def _enabled() -> bool:
    return bool(os.getenv("RESEND_API_KEY"))


def send_email(to: str, subject: str, html: str, from_email: Optional[str] = None) -> bool:
    """
    Envía un mail. Devuelve True si se envió (o se logueó en modo dev), False en error.
    No tira excepción — el caller no debería romperse por un fallo de email.
    """
    sender = from_email or os.getenv("RESEND_FROM_EMAIL", "Vueltito <hola@vueltitox.com>")

    if not _enabled():
        logger.info("[email/dry-run] to=%s subject=%r", to, subject)
        logger.debug("[email/dry-run] html=%s", html[:500])
        return True

    try:
        with httpx.Client(timeout=10.0) as cli:
            res = cli.post(
                RESEND_API_URL,
                headers={
                    "Authorization": f"Bearer {os.environ['RESEND_API_KEY']}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": sender,
                    "to": [to],
                    "subject": subject,
                    "html": html,
                },
            )
        if res.status_code >= 400:
            logger.error("[email] resend %s → %s", res.status_code, res.text[:300])
            return False
        return True
    except Exception:
        logger.exception("[email] unexpected error sending to=%s", to)
        return False
