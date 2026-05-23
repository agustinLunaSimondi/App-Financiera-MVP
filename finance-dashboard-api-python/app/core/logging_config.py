"""
Configuración de logging estructurado (JSON en producción, plano en dev).

Permite filtrar logs de Render por user_id, request_id, etc. Sin esto, es buscar
agujas en un pajar de strings.
"""
import logging
import os
import sys

try:
    import structlog
    _HAS_STRUCTLOG = True
except ImportError:
    _HAS_STRUCTLOG = False


def configure_logging():
    env = os.getenv("APP_ENV", "development").lower()
    level = os.getenv("LOG_LEVEL", "INFO").upper()
    is_prod = env in ("production", "prod")

    if not _HAS_STRUCTLOG:
        logging.basicConfig(level=level, stream=sys.stdout)
        return

    timestamper = structlog.processors.TimeStamper(fmt="iso")
    shared = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        timestamper,
    ]

    if is_prod:
        renderer = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=shared + [
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(getattr(logging, level, logging.INFO)),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(file=sys.stdout),
        cache_logger_on_first_use=True,
    )
    # Mantener stdlib logging compatible.
    logging.basicConfig(level=level, stream=sys.stdout, format="%(message)s")
