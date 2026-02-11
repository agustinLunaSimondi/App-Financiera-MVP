from pydantic import BaseModel, EmailStr, Field, ConfigDict
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

# Base Schemas
class UserBase(CamelModel):
    email: EmailStr
    name: str
    currency: str = "USD"
    dark_mode: bool = False

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(CamelModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    currency: Optional[str] = None
    dark_mode: Optional[bool] = None
    password: Optional[str] = None

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

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CamelModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    type: Optional[CategoryType] = None

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

class BudgetCreate(BudgetBase):
    pass

class BudgetUpdate(CamelModel):
    category_id: Optional[str] = None
    amount: Optional[Decimal] = None
    period: Optional[BudgetPeriod] = None
    start_date: Optional[date] = None

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

class SavingGoalCreate(SavingGoalBase):
    pass

class SavingGoalUpdate(CamelModel):
    name: Optional[str] = None
    target_amount: Optional[Decimal] = None
    current_amount: Optional[Decimal] = None
    deadline: Optional[date] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class SavingGoal(SavingGoalBase):
    id: str
    user_id: str
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

class RecurringTransaction(RecurringTransactionBase):
    id: str
    user_id: str
    next_date: date
    created_at: datetime
    updated_at: datetime
    category: Optional[Category] = None
    account: Optional[Account] = None
