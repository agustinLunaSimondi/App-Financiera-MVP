"""Lógica pura del growth layer: atribución, referidos y recompensas.

Sin acceso a DB ni a red — todo acá es testeable de forma aislada.
Los efectos sobre la base viven en `processor.py`.
"""
from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from typing import Iterable, Optional
from urllib.parse import urlparse

# Los valores UTM llegan de la URL, o sea de fuera del sistema: son input no confiable.
# Los acotamos y saneamos antes de persistirlos para no ensuciar los reportes de CAC
# (y para que nadie inyecte basura en un dashboard que después se lee como si fuera dato).
MAX_UTM_LEN = 64
_UTM_DISALLOWED = re.compile(r"[^a-zA-Z0-9_\-. ]")

# Alfabeto sin caracteres ambiguos (0/O, 1/I/l) — estos códigos se dictan por voz
# y se tipean a mano, así que la legibilidad importa más que el espacio de claves.
_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
CODE_PREFIX = "VLT"
CODE_BODY_LEN = 6

# Recompensa del motor viral: meses de premium que gana quien invita, según
# cuántos invitados llegaron a 'qualified'. Ver `docs/estrategia-mvp-marketing-metas.md`.
REWARD_TIERS = (
    {"qualified": 1, "reward_months": 1, "label": "1 mes de Premium"},
    {"qualified": 3, "reward_months": 3, "label": "3 meses de Premium"},
    {"qualified": 5, "reward_months": 6, "label": "6 meses de Premium"},
)

# Meses de premium que recibe el invitado por entrar con un código.
REFERRED_BONUS_MONTHS = 1


def normalize_utm(value: Optional[str]) -> Optional[str]:
    """Sanea un valor UTM: recorta, baja a minúsculas y descarta caracteres raros.

    Devuelve None si el valor queda vacío, así no persistimos strings sin contenido.
    """
    if not value:
        return None
    cleaned = _UTM_DISALLOWED.sub("", str(value)).strip().lower()
    cleaned = re.sub(r"\s+", " ", cleaned)
    if not cleaned:
        return None
    return cleaned[:MAX_UTM_LEN]


def extract_referrer_host(url: Optional[str]) -> Optional[str]:
    """Extrae solo el host de un referrer.

    Guardamos el host y no la URL completa a propósito: el path de un referrer
    puede arrastrar datos personales o tokens de sesión de otro sitio.
    """
    if not url:
        return None
    try:
        parsed = urlparse(str(url))
    except (ValueError, AttributeError):
        return None
    host = (parsed.netloc or "").strip().lower()
    if not host:
        return None
    if host.startswith("www."):
        host = host[4:]
    return host[:MAX_UTM_LEN] or None


def normalize_landing_path(url_or_path: Optional[str]) -> Optional[str]:
    """Devuelve solo el path de la landing, sin query string.

    La query se descarta porque ya extrajimos los UTM aparte y puede traer PII.
    """
    if not url_or_path:
        return None
    raw = str(url_or_path)
    try:
        parsed = urlparse(raw)
    except (ValueError, AttributeError):
        return None
    path = parsed.path or raw.split("?")[0]
    path = path.strip()
    if not path:
        return None
    if not path.startswith("/"):
        path = "/" + path
    return path[:128]


def generate_referral_code() -> str:
    """Genera un código de referido tipo 'VLT-7K2M9Q'.

    Usa `secrets` y no `random`: el código es adivinable a mano si el espacio es
    chico o predecible, y adivinarlo permitiría atribuirse referidos ajenos.
    """
    body = "".join(secrets.choice(_CODE_ALPHABET) for _ in range(CODE_BODY_LEN))
    return f"{CODE_PREFIX}-{body}"


def normalize_referral_code(value: Optional[str]) -> Optional[str]:
    """Normaliza un código tipeado por el usuario (mayúsculas, sin espacios)."""
    if not value:
        return None
    cleaned = str(value).strip().upper().replace(" ", "")
    if not cleaned:
        return None
    if not re.fullmatch(rf"{CODE_PREFIX}-[{_CODE_ALPHABET}]{{{CODE_BODY_LEN}}}", cleaned):
        return None
    return cleaned


@dataclass(frozen=True)
class ReferralLite:
    """Vista mínima de un referido, para calcular recompensas sin tocar la DB."""
    status: str


def qualified_count(referrals: Iterable[ReferralLite]) -> int:
    """Cuenta los referidos que llegaron a 'qualified' (completaron onboarding)."""
    return sum(1 for r in referrals if r.status == "qualified")


def earned_reward_months(qualified: int) -> int:
    """Meses de premium ganados en total para esa cantidad de referidos calificados.

    No es acumulativo entre tiers: 5 referidos dan 6 meses, no 1+3+6.
    """
    earned = 0
    for tier in REWARD_TIERS:
        if qualified >= tier["qualified"]:
            earned = tier["reward_months"]
    return earned


def next_reward_tier(qualified: int) -> Optional[dict]:
    """Próximo tier a desbloquear, con cuántos referidos faltan. None si ya están todos."""
    for tier in REWARD_TIERS:
        if qualified < tier["qualified"]:
            return {
                **tier,
                "missing": tier["qualified"] - qualified,
            }
    return None


def can_self_refer(referrer_user_id: str, referred_user_id: str) -> bool:
    """False si alguien intenta referirse a sí mismo."""
    return referrer_user_id != referred_user_id
