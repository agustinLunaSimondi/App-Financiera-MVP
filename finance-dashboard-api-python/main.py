from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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
from app.modules.recurring.recurring_processor import process_recurring_transactions

load_dotenv()

from app.core import posthog_client  # noqa: E402 — must import after load_dotenv
from app.core.rate_limit import limiter  # noqa: E402

logger = logging.getLogger(__name__)

# Scheduler para Tareas de Fondo
scheduler = BackgroundScheduler()
scheduler.add_job(process_recurring_transactions, 'interval', hours=1)

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

# Configuración de CORS
# Soporta múltiples URLs separadas por coma en FRONTEND_URL
_frontend_urls = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = list(set(
    [url.strip() for url in _frontend_urls.split(",") if url.strip()]
    + ["http://localhost:5173", "http://127.0.0.1:5173"]
))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

@app.get("/")
def read_root():
    return {"message": "Finance Dashboard API Python is running!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
