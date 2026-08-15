from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from apscheduler.schedulers.background import BackgroundScheduler
import uvicorn
import os
import logging
from dotenv import load_dotenv

from app.modules.auth import auth_routes
from app.modules.accounts import account_routes
from app.modules.categories import category_routes
from app.modules.transactions import transaction_routes
from app.modules.budgets import budget_routes
from app.modules.savings import saving_routes
from app.modules.recurring import recurring_routes
from app.modules.analytics import analytics_routes
from app.modules.analytics.analytics_routes import refresh_macro_cache
from app.modules.mercadopago import mp_routes
from app.modules.belvo import belvo_routes
from app.modules.belvo.belvo_service import sync_all_belvo_connections
from app.modules.waitlist import waitlist_routes
from app.modules.chat import chat_routes
from app.modules.aki_name import aki_name_routes
from app.modules.events import event_routes
from app.modules.recurring.recurring_processor import process_recurring_transactions
from app.modules.notifications.processor import run_daily_smart_alerts, run_weekly_snapshots
from app.modules.streaks import streak_routes
from app.modules.streaks.processor import run_nightly_streaks
from app.modules.benchmark import benchmark_routes
from app.modules.benchmark.aggregator import run_daily_benchmark_aggregation
from app.modules.reports import report_routes
from app.modules.widgets import widget_routes
from app.modules.growth import growth_routes
from app.database.database import SessionLocal

load_dotenv()

from app.core import posthog_client  # noqa: E402 — must import after load_dotenv
from app.core.rate_limit import limiter  # noqa: E402
from app.core.logging_config import configure_logging  # noqa: E402
from app.core.sentry_init import init_sentry  # noqa: E402

configure_logging()
init_sentry()
logger = logging.getLogger(__name__)

# Scheduler para Tareas de Fondo
scheduler = BackgroundScheduler()
scheduler.add_job(process_recurring_transactions, 'interval', hours=1)
# Aki proactivo (#51): cada día a las 9am hora ART (UTC-3 → 12 UTC).
scheduler.add_job(run_daily_smart_alerts, 'cron', hour=12, minute=0, id='daily_smart_alerts')
# Snapshot semanal (#52): domingos 10am ART (13 UTC).
scheduler.add_job(run_weekly_snapshots, 'cron', day_of_week='sun', hour=13, minute=0, id='weekly_snapshot')
# Streaks nocturno (#62): 6am ART (9 UTC) — evalúa el día de ayer.
scheduler.add_job(run_nightly_streaks, 'cron', hour=9, minute=0, id='nightly_streaks')
# Benchmark anonimizado (#59): diario 7am ART (10 UTC) — recalcula buckets.
scheduler.add_job(run_daily_benchmark_aggregation, 'cron', hour=10, minute=30, id='daily_benchmark')
# Refresh de conexiones bancarias Belvo cada 6h (complementa al webhook, que no siempre llega).
scheduler.add_job(sync_all_belvo_connections, 'interval', hours=6, id='belvo_sync')
# Dólar blue/IPC (#analytics): refresco proactivo cada 1h, mismo TTL del cache en
# memoria — evita que el primer usuario post-expiración pague la latencia del fetch.
scheduler.add_job(refresh_macro_cache, 'interval', hours=1, id='macro_refresh')

@asynccontextmanager
async def lifespan(app):
    # Startup
    scheduler.start()
    logger.info("Scheduler iniciado.")
    yield
    # Shutdown
    scheduler.shutdown()
    logger.info("Scheduler apagado.")
    posthog_client.shutdown()

# Documentación interactiva (Swagger/ReDoc/OpenAPI): fail-closed.
# Por defecto queda DESHABILITADA. Solo se expone /docs, /redoc y /openapi.json
# si ENABLE_DOCS=true (entornos de desarrollo). En producción permanece oculta
# para no filtrar el mapa completo de la API a usuarios no autenticados.
_DOCS_ENABLED = os.getenv("ENABLE_DOCS", "false").strip().lower() in ("1", "true", "yes")

app = FastAPI(
    title="Finance Dashboard API (Python/FastAPI)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if _DOCS_ENABLED else None,
    redoc_url="/redoc" if _DOCS_ENABLED else None,
    openapi_url="/openapi.json" if _DOCS_ENABLED else None,
)

# Rate limiting global (ver app/core/rate_limit.py)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuración de CORS — explícita en métodos y headers (no usar wildcards con credenciales).
_frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:5173")
# Vite sube de puerto (5174, 5175...) cuando el default est ocupado — incluimos
# los siguientes por defecto para evitar Network Error en dev.
origins = list(set(
    [url.strip() for url in _frontend_urls.split(",") if url.strip()]
    + [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175",
    ]
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
    expose_headers=["Content-Disposition"],
    max_age=600,
)

# Security headers en toda respuesta del API (M1 del assessment).
# vercel.json solo cubre el frontend estático; esto cubre las respuestas de Render.
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "no-referrer")
    # API JSON-only: CSP restrictiva previene render de contenido inyectado si
    # un browser abre una respuesta directamente.
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
    # HSTS solo aplica detrás de TLS (Render termina HTTPS); ignorado en http local.
    response.headers.setdefault("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
    return response

# Registro de Rutas
app.include_router(auth_routes.router, prefix="/api")
app.include_router(account_routes.router, prefix="/api")
app.include_router(category_routes.router, prefix="/api")
app.include_router(transaction_routes.router, prefix="/api")
app.include_router(budget_routes.router, prefix="/api")
app.include_router(saving_routes.router, prefix="/api")
app.include_router(recurring_routes.router, prefix="/api")
app.include_router(analytics_routes.router, prefix="/api")
app.include_router(mp_routes.router, prefix="/api")
app.include_router(belvo_routes.router, prefix="/api")
app.include_router(waitlist_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")
app.include_router(streak_routes.router, prefix="/api")
app.include_router(benchmark_routes.router, prefix="/api")
app.include_router(report_routes.router, prefix="/api")
app.include_router(widget_routes.router, prefix="/api")
app.include_router(aki_name_routes.router, prefix="/api")
app.include_router(event_routes.router, prefix="/api")
app.include_router(growth_routes.router, prefix="/api")

# Static para recibos de eventos subidos localmente (dev/fallback).
# En prod se usa Supabase Storage; este dir es efímero en Render.
_UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")

@app.get("/")
def read_root():
    return {"message": "Finance Dashboard API Python is running!"}

@app.get("/health")
def health_check():
    """Health check con ping a DB. Útil para healthchecks de Render/K8s."""
    db_ok = True
    db_error = None
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_ok = False
        db_error = str(e)[:200]
    finally:
        db.close()
    payload = {
        "status": "ok" if db_ok else "degraded",
        "db": "ok" if db_ok else "error",
        "scheduler_running": scheduler.running if scheduler else False,
        "version": app.version,
    }
    # El detalle del error de DB puede filtrar host/driver/usuario de Supabase.
    # Solo se expone en dev (ENABLE_DOCS=true); en prod se omite.
    if db_error and _DOCS_ENABLED:
        payload["db_error"] = db_error
    return payload

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
