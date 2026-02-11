from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import Optional, List
from datetime import date
from app.database import models
from app.database.database import get_db
from app.core.deps import get_current_user
from app import schemas

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/kpis")
def get_kpis(
    startDate: Optional[date] = None,
    endDate: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # 1. Balance Total
    accounts = db.query(models.Account).filter(models.Account.user_id == current_user.id).all()
    total_balance = sum(acc.balance for acc in accounts)
    
    # 2. Ingresos del periodo
    income_query = db.query(func.sum(models.Transaction.amount)).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount > 0
    )
    
    # 3. Gastos del periodo
    expense_query = db.query(func.sum(models.Transaction.amount)).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount < 0
    )
    
    if startDate:
        income_query = income_query.filter(models.Transaction.transaction_date >= startDate)
        expense_query = expense_query.filter(models.Transaction.transaction_date >= startDate)
    if endDate:
        income_query = income_query.filter(models.Transaction.transaction_date <= endDate)
        expense_query = expense_query.filter(models.Transaction.transaction_date <= endDate)
        
    period_income = income_query.scalar() or 0
    period_expenses = abs(expense_query.scalar() or 0)
    net_savings = period_income - period_expenses
    
    return {
        "totalBalance": total_balance,
        "periodIncome": period_income,
        "periodExpenses": period_expenses,
        "netSavings": net_savings
    }

@router.get("/breakdown")
def get_breakdown(
    startDate: Optional[date] = None,
    endDate: Optional[date] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(
        models.Category.name,
        models.Category.color,
        func.sum(func.abs(models.Transaction.amount)).label("value")
    ).join(models.Transaction).join(models.Account).filter(
        models.Account.user_id == current_user.id,
        models.Transaction.amount < 0
    )
    
    if startDate:
        query = query.filter(models.Transaction.transaction_date >= startDate)
    if endDate:
        query = query.filter(models.Transaction.transaction_date <= endDate)
        
    results = query.group_by(models.Category.id).order_by(func.sum(func.abs(models.Transaction.amount)).desc()).all()
    
    return [{"name": r.name, "value": float(r.value), "color": r.color} for r in results]

@router.get("/cashflow")
def get_cashflow(
    months: int = 6,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Simplificado: obtener transacciones y agrupar en Python o usar SQL complejo
    # Usaremos una consulta de agregación por mes
    results = db.query(
        func.to_char(models.Transaction.transaction_date, 'YYYY-MM').label('month'),
        func.sum(func.case((models.Transaction.amount > 0, models.Transaction.amount), else_=0)).label('income'),
        func.sum(func.case((models.Transaction.amount < 0, func.abs(models.Transaction.amount)), else_=0)).label('expenses')
    ).join(models.Account).filter(
        models.Account.user_id == current_user.id
    ).group_by('month').order_by('month').all()
    
    return [{"month": r.month, "income": float(r.income), "expenses": float(r.expenses)} for r in results[-months:]]
