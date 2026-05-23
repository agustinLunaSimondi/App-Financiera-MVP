"""
Rate limiter compartido. Se importa desde main.py y desde los routers que decoran
endpoints con `@limiter.limit("N/minute")`.

Configuración default: 60/min por IP. Endpoints sensibles (auth, waitlist, MP, chat)
sobreescriben con límites más estrictos en sus propios decoradores.

X-Forwarded-For sólo se honra cuando TRUST_PROXY=1 — sin eso, un atacante puede
spoofearlo para bypassear el límite. En Render/Vercel se necesita habilitarlo.
"""
import os
from slowapi import Limiter
from slowapi.util import get_remote_address

_TRUST_PROXY = os.getenv("TRUST_PROXY", "0").lower() in ("1", "true", "yes")


def _client_key(request) -> str:
    if _TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            # IP más a la izquierda = cliente original (los proxies van appendeando).
            return fwd.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_key, default_limits=["60/minute"])
