from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from app.modules.mercadopago import mp_routes
from app.modules.waitlist import waitlist_routes
from app.modules.chat import chat_routes
from app.modules.recurring.recurring_processor import process_recurring_transactions
from app.modules.notifications.processor import run_daily_smart_alerts, run_weekly_snapshots
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

app = FastAPI(
    title="Finance Dashboard API (Python/FastAPI)",
    version="1.0.0",
    lifespan=lifespan
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
app.include_router(waitlist_routes.router, prefix="/api")
app.include_router(chat_routes.router, prefix="/api")

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
    if db_error:
        payload["db_error"] = db_error
    return payload

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
