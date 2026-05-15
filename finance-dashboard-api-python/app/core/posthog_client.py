import os
import posthog

posthog.api_key = os.getenv("POSTHOG_API_KEY", "")
posthog.host = os.getenv("POSTHOG_HOST", "")


def capture(distinct_id: str, event: str, properties: dict = None):
    if not posthog.api_key:
        return
    posthog.capture(distinct_id, event, properties or {})


def identify(distinct_id: str, properties: dict = None):
    if not posthog.api_key:
        return
    posthog.identify(distinct_id, properties or {})


def shutdown():
    posthog.shutdown()
