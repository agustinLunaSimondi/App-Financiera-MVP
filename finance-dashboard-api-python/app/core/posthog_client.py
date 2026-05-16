"""
Wrapper liviano sobre PostHog 7.x.
La v7 cambió la firma: event es posicional y distinct_id/properties son kwargs.
Además, `posthog.identify()` ya no existe a nivel módulo — se usa `posthog.set()`
para fijar propiedades de la persona.

Si `POSTHOG_API_KEY` no está seteado, todas las llamadas son no-op.
"""
import os
import posthog

posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
posthog.host = os.getenv("POSTHOG_HOST", "")


def capture(distinct_id: str, event: str, properties: dict = None):
    if not posthog.api_key:
        return
    try:
        posthog.capture(event, distinct_id=distinct_id, properties=properties or {})
    except Exception:
        # Telemetría nunca debe romper un request del usuario.
        pass


def identify(distinct_id: str, properties: dict = None):
    if not posthog.api_key:
        return
    try:
        posthog.set(distinct_id=distinct_id, properties=properties or {})
    except Exception:
        pass


def shutdown():
    try:
        posthog.shutdown()
    except Exception:
        pass
