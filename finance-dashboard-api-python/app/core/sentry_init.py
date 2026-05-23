"""
Inicialización opcional de Sentry. Si SENTRY_DSN no está configurada, no-op.
"""
import os
import logging

logger = logging.getLogger(__name__)


def init_sentry():
    dsn = os.getenv("SENTRY_DSN", "").strip()
    if not dsn:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        env = os.getenv("APP_ENV", "development")
        sentry_sdk.init(
            dsn=dsn,
            environment=env,
            traces_sample_rate=float(os.getenv("SENTRY_TRACES_RATE", "0.1")),
            send_default_pii=False,  # No mandar IPs ni emails en errores.
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
        )
        logger.info(f"Sentry inicializado (env={env})")
    except Exception as e:
        logger.warning(f"No se pudo inicializar Sentry: {e}")
