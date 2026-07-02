from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from pydantic.alias_generators import to_camel
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal
from app.database.models import AccountType, CategoryType, BudgetPeriod, RecurrenceFrequency

# Base Config
class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True
    )


def _empty_str_to_none(value):
    """Helper para convertir strings vacíos enviados desde el frontend a None.

    Evita errores 422 cuando un campo Optional[date] / Optional[str] recibe ""
    en vez de null (típico de inputs HTML <input type="date" />).
    """
    if isinstance(value, str) and value.strip() == "":
        return None
    return value

# Base Schemas
class UserBase(CamelModel):
    email: EmailStr
    name: str
    currency: str = "USD"
    dark_mode: bool = False
    onboarding_completed: bool = False

class UserCreate(UserBase):
    # Mínimo 8 chars (NIST 800-63B); max acota el costo de bcrypt.
    password: str = Field(min_length=8, max_length=128)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(CamelModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    currency: Optional[str] = None
    dark_mode: Optional[bool] = None
    password: Optional[str] = Field(default=None, min_length=8, max_length=128)

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime


# Token Schemas
class Token(BaseModel):
    token: str
    user: User

class TokenData(BaseModel):
    email: Optional[str] = None
    userId: Optional[str] = None

# Account Schemas
class AccountBase(CamelModel):
    name: str
    type: AccountType
    balance: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    currency: str = "USD"

class AccountCreate(AccountBase):
    pass

class AccountUpdate(CamelModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    balance: Optional[Decimal] = None
    currency: Optional[str] = None

class Account(AccountBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


# Category Schemas
class CategoryBase(CamelModel):
    name: str
    color: str = "#6B7280"
    icon: Optional[str] = None
    type: CategoryType
    tax_deductible: bool = False

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CamelModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    type: Optional[CategoryType] = None
    tax_deductible: Optional[bool] = None

class Category(CategoryBase):
    id: str
    user_id: Optional[str] = None
    is_default: bool
    created_at: datetime


# Transaction Schemas
class TransactionBase(CamelModel):
    account_id: str
    category_id: str
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    description: str
    transaction_date: date

class TransactionCreate(TransactionBase):
    pass

class TransactionUpdate(CamelModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    transaction_date: Optional[date] = None

class Transaction(TransactionBase):
    id: str
    recurring_id: Optional[str] = None
    external_id: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    category: Optional[Category] = None
    account: Optional[Account] = None


# Budget Schemas
class BudgetBase(CamelModel):
    category_id: str
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    period: BudgetPeriod = BudgetPeriod.MONTHLY
    start_date: date
    color: Optional[str] = None
    is_strict: bool = False

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(CamelModel):
    category_id: Optional[str] = None
    amount: Optional[Decimal] = None
    period: Optional[BudgetPeriod] = None
    start_date: Optional[date] = None
    color: Optional[str] = None
    is_strict: Optional[bool] = None

class Budget(BudgetBase):
    id: str
    user_id: str
    category: Optional[Category] = None


# Saving Goal Schemas
class SavingGoalBase(CamelModel):
    name: str
    target_amount: Decimal = Field(max_digits=12, decimal_places=2)
    current_amount: Decimal = Field(default=0, max_digits=12, decimal_places=2)
    deadline: Optional[date] = None
    icon: Optional[str] = None
    color: Optional[str] = "#10B981"

    @field_validator("deadline", mode="before")
    @classmethod
    def _empty_deadline_to_none(cls, v):
        return _empty_str_to_none(v)

class SavingGoalCreate(SavingGoalBase):
    pass

class SavingGoalUpdate(CamelModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = None
    current_amount: Optional[Decimal] = None
    deadline: Optional[date] = None
    icon: Optional[str] = None
    color: Optional[str] = None

    @field_validator("deadline", mode="before")
    @classmethod
    def _empty_deadline_to_none(cls, v):
        return _empty_str_to_none(v)

class SavingGoal(SavingGoalBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


# Goal Rules (#56) — auto-depósito al recibir tx en categoría trigger
# Nota: precision la enforcea la DB (Numeric(5,2)/Numeric(12,2)). Pydantic v2 no
# soporta max_digits sobre Optional[Decimal] directamente.
class GoalRuleBase(CamelModel):
    trigger_category_id: str
    percentage: Optional[Decimal] = None
    fixed_amount: Optional[Decimal] = None
    is_active: bool = True

class GoalRuleCreate(GoalRuleBase):
    pass

class GoalRuleUpdate(CamelModel):
    trigger_category_id: Optional[str] = None
    percentage: Optional[Decimal] = None
    fixed_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None

class GoalRule(GoalRuleBase):
    id: str
    user_id: str
    goal_id: str
    created_at: datetime
    updated_at: datetime


# Recurring Transaction Schemas
class RecurringTransactionBase(CamelModel):
    account_id: str
    category_id: str
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    description: str
    frequency: RecurrenceFrequency
    start_date: date
    end_date: Optional[date] = None
    is_active: bool = True

    @field_validator("end_date", mode="before")
    @classmethod
    def _empty_end_date_to_none(cls, v):
        return _empty_str_to_none(v)

class RecurringTransactionCreate(RecurringTransactionBase):
    pass

class RecurringTransactionUpdate(CamelModel):
    account_id: Optional[str] = None
    category_id: Optional[str] = None
    amount: Optional[Decimal] = None
    description: Optional[str] = None
    frequency: Optional[RecurrenceFrequency] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None

    @field_validator("end_date", "start_date", mode="before")
    @classmethod
    def _empty_dates_to_none(cls, v):
        return _empty_str_to_none(v)

class RecurringTransaction(RecurringTransactionBase):
    id: str
    user_id: str
    next_date: date
    created_at: datetime
    updated_at: datetime
    category: Optional[Category] = None
    account: Optional[Account] = None


# Sugerencias de suscripciones (#61)
class SubscriptionSuggestionItem(CamelModel):
    key: str
    sample_description: str
    occurrences: int
    average_amount: Decimal
    median_interval_days: float
    last_transaction_date: date
    transaction_ids: List[str]
    category_id: Optional[str] = None
    account_id: Optional[str] = None


class SubscriptionSuggestionList(CamelModel):
    suggestions: List[SubscriptionSuggestionItem]


class SubscriptionFromSuggestionItem(CamelModel):
    """Sugerencia aceptada por el usuario, con eventuales overrides desde el modal."""
    sample_description: str
    average_amount: Decimal
    last_transaction_date: date
    transaction_ids: List[str] = []
    account_id: str
    category_id: str
    frequency: RecurrenceFrequency = RecurrenceFrequency.MONTHLY


class SubscriptionFromSuggestionRequest(CamelModel):
    items: List[SubscriptionFromSuggestionItem]


class SubscriptionFromSuggestionResult(CamelModel):
    created: List[RecurringTransaction]
    skipped: int = 0


# Auto-categorización por embeddings (#55)
class AutoCategorizeRequest(CamelModel):
    transaction_ids: Optional[List[str]] = None  # None = backend elige candidatos default

class CategorySuggestionItem(CamelModel):
    transaction_id: str
    suggested_category_id: str
    suggested_category_name: str
    confidence: float
    sample_description: str

class AutoCategorizeResponse(CamelModel):
    suggestions: List[CategorySuggestionItem]

class AcceptCategorySuggestionItem(CamelModel):
    transaction_id: str
    category_id: str

class AcceptCategorySuggestionsRequest(CamelModel):
    items: List[AcceptCategorySuggestionItem]

class AcceptCategorySuggestionsResponse(CamelModel):
    updated: int


# Mercado Pago Schemas
class MercadoPagoCallback(BaseModel):
    code: str

class MercadoPagoStatus(CamelModel):
    connected: bool
    mp_user_id: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

class MercadoPagoSyncResult(CamelModel):
    transactions_imported: int = 0
    transactions_skipped: int = 0
    message: str = ""


# Belvo Schemas
class BelvoWidgetToken(CamelModel):
    access: str

class BelvoLinkCreate(CamelModel):
    link_id: str
    institution_name: str

class BelvoConnectionStatus(CamelModel):
    id: str
    institution_name: str
    status: str
    last_sync_at: Optional[datetime] = None

class BelvoSyncResult(CamelModel):
    transactions_imported: int = 0
    transactions_skipped: int = 0
    message: str = ""


# ===== Events Schemas (gastos compartidos en grupo) =====
class EventMemberCreate(CamelModel):
    display_name: str
    email: Optional[str] = None

    @field_validator("email", mode="before")
    @classmethod
    def _email_empty(cls, v):
        return _empty_str_to_none(v)


class EventExpenseSplitOut(CamelModel):
    id: str
    member_id: str
    member_name: str
    share_amount: Decimal
    is_paid: bool


class EventExpenseCreate(CamelModel):
    paid_by_member_id: str
    description: str
    amount: Decimal = Field(max_digits=12, decimal_places=2)
    expense_date: date
    split_mode: str = "equal"
    # Si split_mode == "custom": [{ memberId, shareAmount }]
    custom_splits: Optional[List[dict]] = None


class EventExpenseOut(CamelModel):
    id: str
    paid_by_member_id: str
    paid_by_name: str
    description: str
    amount: Decimal
    expense_date: date
    receipt_url: Optional[str] = None
    receipt_filename: Optional[str] = None
    split_mode: str
    splits: List[EventExpenseSplitOut] = []
    created_at: datetime


class EventMemberOut(CamelModel):
    id: str
    display_name: str
    email: Optional[str] = None
    role: str
    user_id: Optional[str] = None
    total_paid: Decimal       # suma de gastos que pagó
    total_owed: Decimal       # suma de splits que le corresponden
    net_balance: Decimal      # total_paid - total_owed (>0 le deben, <0 debe)


class EventSettlementOut(CamelModel):
    from_member_id: str
    from_member_name: str
    to_member_id: str
    to_member_name: str
    amount: Decimal


class EventCreate(CamelModel):
    name: str
    description: Optional[str] = None
    event_date: Optional[date] = None
    currency: str = "ARS"
    cover_emoji: Optional[str] = None

    @field_validator("event_date", "description", "cover_emoji", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return _empty_str_to_none(v)


class EventUpdate(CamelModel):
    name: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    cover_emoji: Optional[str] = None

    @field_validator("event_date", "description", "cover_emoji", mode="before")
    @classmethod
    def _blank_to_none(cls, v):
        return _empty_str_to_none(v)


class EventListItem(CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    event_date: Optional[date] = None
    currency: str
    status: str
    cover_emoji: Optional[str] = None
    owner_id: str
    member_count: int
    total_amount: Decimal
    created_at: datetime


class EventOut(CamelModel):
    id: str
    name: str
    description: Optional[str] = None
    event_date: Optional[date] = None
    currency: str
    status: str
    cover_emoji: Optional[str] = None
    owner_id: str
    members: List[EventMemberOut] = []
    expenses: List[EventExpenseOut] = []
    settlements: List[EventSettlementOut] = []
    total_amount: Decimal
    created_at: datetime

