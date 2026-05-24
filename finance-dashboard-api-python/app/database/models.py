from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Date, Integer, Text, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import enum
import uuid

from app.core.crypto import EncryptedString

class Base(DeclarativeBase):
    pass

class AccountType(enum.Enum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"
    CREDIT = "CREDIT"
    INVESTMENT = "INVESTMENT"

class CategoryType(enum.Enum):
    INCOME = "INCOME"
    EXPENSE = "EXPENSE"

class BudgetPeriod(enum.Enum):
    WEEKLY = "WEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"

class RecurrenceFrequency(enum.Enum):
    DAILY = "DAILY"
    WEEKLY = "WEEKLY"
    BIWEEKLY = "BIWEEKLY"
    MONTHLY = "MONTHLY"
    YEARLY = "YEARLY"

# Pre-built enum types referencing existing Supabase types (create_type=False prevents
# SQLAlchemy from trying to CREATE TYPE when they already exist in the DB)
_accounttype_pg = SQLEnum(AccountType, create_type=False, name="accounttype")
_categorytype_pg = SQLEnum(CategoryType, create_type=False, name="categorytype")
_budgetperiod_pg = SQLEnum(BudgetPeriod, create_type=False, name="budgetperiod")
_recurrencefrequency_pg = SQLEnum(RecurrenceFrequency, create_type=False, name="recurrencefrequency")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    currency = Column(String, default="USD")
    dark_mode = Column(Boolean, default=False)
    onboarding_completed = Column(Boolean, default=False, nullable=False, server_default="false")
    # Preferencias de email (#51 #52). Default True — el user opt-out desde settings.
    email_weekly_snapshot = Column(Boolean, default=True, nullable=False, server_default="true")
    email_smart_alerts = Column(Boolean, default=True, nullable=False, server_default="true")
    # Engagement: modo de presupuesto (#60 envelopes). 'standard' | 'envelopes'.
    budget_mode = Column(String, default="standard", nullable=False, server_default="standard")
    # Engagement: opt-in para benchmark anonimizado (#59) + datos demográficos.
    benchmark_opt_in = Column(Boolean, default=False, nullable=False, server_default="false")
    age_range = Column(String, nullable=True)  # '18-24' | '25-34' | '35-44' | '45-54' | '55+'
    geo_region = Column(String, nullable=True)  # 'AR-CABA' | 'AR-GBA' | 'AR-Norte' | 'AR-Cuyo' | 'AR-Sur' | 'AR-Centro' | 'Otro'
    # JWTs emitidos antes de esta marca son rechazados (revocación granular: logout total, cambio de contraseña, etc.)
    tokens_invalidated_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="user", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="user", cascade="all, delete-orphan")
    saving_goals = relationship("SavingGoal", back_populates="user", cascade="all, delete-orphan")
    recurring_transactions = relationship("RecurringTransaction", back_populates="user", cascade="all, delete-orphan")
    mercadopago_connection = relationship("MercadoPagoConnection", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(_accounttype_pg, nullable=False)
    balance = Column(Numeric(12, 2), default=0)
    currency = Column(String, default="USD")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")
    recurring_transactions = relationship("RecurringTransaction", back_populates="account", cascade="all, delete-orphan")

class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=False)
    color = Column(String, default="#6B7280")
    icon = Column(String, nullable=True)
    type = Column(_categorytype_pg, nullable=False)
    is_default = Column(Boolean, default=False)
    # AFIP report (#63): el user marca cuáles categorías son deducibles.
    tax_deductible = Column(Boolean, default=False, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    budgets = relationship("Budget", back_populates="category")
    recurring_transactions = relationship("RecurringTransaction", back_populates="category")

    __table_args__ = (UniqueConstraint('user_id', 'name', name='_user_category_name_uc'),)

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    account_id = Column(String, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False)
    recurring_id = Column(String, ForeignKey("recurring_transactions.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=False)
    transaction_date = Column(Date, nullable=False)
    external_id = Column(String, nullable=True)
    source = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    account = relationship("Account", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")
    recurring = relationship("RecurringTransaction", back_populates="transactions")

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    period = Column(_budgetperiod_pg, default=BudgetPeriod.MONTHLY)
    start_date = Column(Date, nullable=False)
    # Color custom — si es null, el frontend cae al color de la categoría.
    color = Column(String, nullable=True)

    user = relationship("User", back_populates="budgets")
    category = relationship("Category", back_populates="budgets")

    __table_args__ = (UniqueConstraint('user_id', 'category_id', 'period', name='_user_category_period_uc'),)

class SavingGoal(Base):
    __tablename__ = "saving_goals"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    target_amount = Column(Numeric(12, 2), nullable=False)
    current_amount = Column(Numeric(12, 2), default=0)
    deadline = Column(Date, nullable=True)
    icon = Column(String, nullable=True)
    color = Column(String, default="#10B981")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="saving_goals")
    rules = relationship("GoalRule", back_populates="goal", cascade="all, delete-orphan")


class GoalRule(Base):
    """Regla de auto-depósito: cuando entra una tx en `trigger_category_id`, transfiere
    `percentage` % o `fixed_amount` a la meta. Exactamente uno de los dos debe estar set."""
    __tablename__ = "goal_rules"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    goal_id = Column(String, ForeignKey("saving_goals.id", ondelete="CASCADE"), nullable=False, index=True)
    trigger_category_id = Column(String, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    percentage = Column(Numeric(5, 2), nullable=True)        # ej. 10.00 = 10%
    fixed_amount = Column(Numeric(12, 2), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    goal = relationship("SavingGoal", back_populates="rules")
    trigger_category = relationship("Category")

class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=False)
    frequency = Column(_recurrencefrequency_pg, nullable=False)
    start_date = Column(Date, nullable=False)
    next_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="recurring_transactions")
    account = relationship("Account", back_populates="recurring_transactions")
    category = relationship("Category", back_populates="recurring_transactions")
    transactions = relationship("Transaction", back_populates="recurring")

class MercadoPagoConnection(Base):
    __tablename__ = "mercadopago_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    # Encriptados at rest: el ORM ve plaintext, la DB ciphertext (ver app/core/crypto.py)
    access_token = Column(EncryptedString, nullable=False)
    refresh_token = Column(EncryptedString, nullable=False)
    mp_user_id = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="mercadopago_connection")


class Notification(Base):
    """Histórico de notificaciones enviadas (email u otros). El par
    (user_id, dedup_key) sirve para no enviar la misma alerta dos veces."""
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(String, nullable=False)  # 'weekly_snapshot' | 'budget_at_risk' | 'unusual_spend' | etc.
    dedup_key = Column(String, nullable=False, index=True)
    channel = Column(String, default="email", nullable=False)  # email | push | in_app
    sent_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint('user_id', 'dedup_key', name='_user_dedup_key_uc'),)


class TransactionEmbedding(Base):
    """Vector embedding para auto-categorización (#55). 1 fila por TX. Si
    transactions se actualiza/borra, el ORM cascadea por la FK."""
    __tablename__ = "transaction_embeddings"

    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True)
    embedding_json = Column(String, nullable=False)  # JSON-serialized list[float]
    model = Column(String, nullable=False, default="text-embedding-004")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WaitlistEmail(Base):
    __tablename__ = "waitlist_emails"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    source = Column(String, nullable=True)  # ej: 'landing', 'hero', 'pricing'
    referrer = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ───────────────────────────────────────────────────────────────
# Engagement layer (#59 / #60 / #62 / #63 / #64)
# ───────────────────────────────────────────────────────────────


class UserStreak(Base):
    """Streak de días sin gasto no esencial (#62).
    `current_streak`: días consecutivos hasta `last_evaluated_on`.
    `longest_streak`: récord histórico. `last_zero_day_at`: último día sin gasto manual.
    """
    __tablename__ = "user_streaks"

    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    current_streak = Column(Integer, default=0, nullable=False, server_default="0")
    longest_streak = Column(Integer, default=0, nullable=False, server_default="0")
    last_zero_day_at = Column(Date, nullable=True)
    last_evaluated_on = Column(Date, nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class BenchmarkAggregate(Base):
    """Agregado anónimo (#59). 1 fila por bucket (age_range × geo_region × category × period).
    Solo se publica si `sample_size >= 50`. Guardamos percentiles para mostrar 'tu lugar en el ranking'."""
    __tablename__ = "benchmark_aggregates"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    age_range = Column(String, nullable=False)
    geo_region = Column(String, nullable=False)
    category_name = Column(String, nullable=False)  # nombre normalizado (no FK porque cruza users)
    period = Column(String, nullable=False, default="monthly")  # 'monthly'
    sample_size = Column(Integer, nullable=False)
    p25 = Column(Numeric(14, 2), nullable=False)
    p50 = Column(Numeric(14, 2), nullable=False)
    p75 = Column(Numeric(14, 2), nullable=False)
    avg = Column(Numeric(14, 2), nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("age_range", "geo_region", "category_name", "period", name="_benchmark_bucket_uc"),
    )


class PublicWidget(Base):
    """Widget público embebible (#64). Token rotable. type ∈ {'balance','goal','month_spend'}.
    config_json puede incluir { goal_id, currency_symbol, theme }."""
    __tablename__ = "public_widgets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)
    type = Column(String, nullable=False)
    config_json = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
