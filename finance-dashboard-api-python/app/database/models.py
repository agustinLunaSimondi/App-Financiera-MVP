from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Date, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship, DeclarativeBase
from sqlalchemy.sql import func
import enum
import uuid

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

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    name = Column(String, nullable=False)
    currency = Column(String, default="USD")
    dark_mode = Column(Boolean, default=False)
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
    type = Column(SQLEnum(AccountType), nullable=False)
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
    type = Column(SQLEnum(CategoryType), nullable=False)
    is_default = Column(Boolean, default=False)
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
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    recurring_id = Column(String, ForeignKey("recurring_transactions.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=False)
    transaction_date = Column(Date, nullable=False)
    external_id = Column(String, nullable=True)  # ID externo para pagos importados (ej: MP payment ID)
    source = Column(String, nullable=True)  # 'manual', 'recurring', 'mercadopago'
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
    period = Column(SQLEnum(BudgetPeriod), default=BudgetPeriod.MONTHLY)
    start_date = Column(Date, nullable=False)

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

class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False)
    category_id = Column(String, ForeignKey("categories.id"), nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    description = Column(String, nullable=False)
    frequency = Column(SQLEnum(RecurrenceFrequency), nullable=False)
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
    access_token = Column(String, nullable=False)
    refresh_token = Column(String, nullable=False)
    mp_user_id = Column(String, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_sync_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    user = relationship("User", back_populates="mercadopago_connection")
