"""
Rate limiter compartido. Se importa desde main.py y desde los routers que decoran
endpoints con `@limiter.limit("N/minute")`.

Configuración default: 60/min por IP. Endpoints sensibles (auth, waitlist, MP)
sobreescriben con límites más estrictos en sus propios decoradores.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address


def _client_key(request) -> str:
    """
    Key por IP, respetando X-Forwarded-For (Render/Vercel ponen el real client IP ahí).
    Caemos a la IP del socket si el header no está.
    """
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_client_key, default_limits=["60/minute"])
