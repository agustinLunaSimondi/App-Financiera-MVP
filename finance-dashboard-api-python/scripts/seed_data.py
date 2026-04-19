import os
import sys
import uuid
import datetime
from sqlalchemy.orm import Session

# Add the parent directory to sys.path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.database import SessionLocal, engine
from app.database import models
from app.core import security

models.Base.metadata.create_all(bind=engine)

def get_password_hash(password):
    return security.get_password_hash(password)

def seed_data():
    db = SessionLocal()
    try:
        # Check if user already exists
        email = "demo@demo.com"
        existing_user = db.query(models.User).filter(models.User.email == email).first()
        
        if existing_user:
            print(f"User {email} already exists. Cleaning up old data...")
            db.delete(existing_user)
            db.commit()
            
        print("Creating seed user...")
        # 1. Create User
        user = models.User(
            id=str(uuid.uuid4()),
            email=email,
            password_hash=get_password_hash("demo123"),
            name="Usuario Demo",
            currency="USD",
            dark_mode=False
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 2. Create Accounts
        account_checking = models.Account(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Banco Galicia (Corriente)",
            type=models.AccountType.CHECKING,
            balance=150000.50,
            currency="ARS"
        )
        account_savings = models.Account(
            id=str(uuid.uuid4()),
            user_id=user.id,
            name="Caja de Ahorro USD",
            type=models.AccountType.SAVINGS,
            balance=2500.00,
            currency="USD"
        )
        db.add_all([account_checking, account_savings])
        db.commit()

        # 3. Create Categories
        cat_salary = models.Category(id=str(uuid.uuid4()), user_id=user.id, name="Sueldo", type=models.CategoryType.INCOME, color="#10B981", icon="Briefcase")
        cat_food = models.Category(id=str(uuid.uuid4()), user_id=user.id, name="Comida", type=models.CategoryType.EXPENSE, color="#EF4444", icon="ShoppingCart")
        cat_transport = models.Category(id=str(uuid.uuid4()), user_id=user.id, name="Transporte", type=models.CategoryType.EXPENSE, color="#3B82F6", icon="Car")
        cat_entertainment = models.Category(id=str(uuid.uuid4()), user_id=user.id, name="Ocio", type=models.CategoryType.EXPENSE, color="#8B5CF6", icon="Film")
        
        db.add_all([cat_salary, cat_food, cat_transport, cat_entertainment])
        db.commit()

        # 4. Create Transactions
        today = datetime.date.today()
        transactions = [
            models.Transaction(
                id=str(uuid.uuid4()), account_id=account_checking.id, category_id=cat_salary.id,
                amount=850000.00, description="Sueldo Mensual", transaction_date=today.replace(day=1)
            ),
            models.Transaction(
                id=str(uuid.uuid4()), account_id=account_checking.id, category_id=cat_food.id,
                amount=25000.00, description="Supermercado Coto", transaction_date=today.replace(day=5)
            ),
            models.Transaction(
                id=str(uuid.uuid4()), account_id=account_checking.id, category_id=cat_transport.id,
                amount=15000.00, description="Carga Sube", transaction_date=today.replace(day=10)
            ),
            models.Transaction(
                id=str(uuid.uuid4()), account_id=account_savings.id, category_id=cat_salary.id,
                amount=500.00, description="Venta Freelance", transaction_date=today.replace(day=15)
            ),
        ]
        db.add_all(transactions)
        db.commit()

        # 5. Create Budgets
        budget_food = models.Budget(
            id=str(uuid.uuid4()), user_id=user.id, category_id=cat_food.id,
            amount=150000.00, period=models.BudgetPeriod.MONTHLY, start_date=today.replace(day=1)
        )
        db.add(budget_food)
        
        # 6. Create Saving Goals
        goal_vacation = models.SavingGoal(
            id=str(uuid.uuid4()), user_id=user.id, name="Vacaciones Brasil",
            target_amount=1500.00, current_amount=500.00, deadline=today.replace(month=12, day=31),
            icon="Plane", color="#F59E0B"
        )
        db.add(goal_vacation)
        
        db.commit()
        
        print("========================================")
        print("Database successfully seeded!")
        print(f"Email: {email}")
        print(f"Password: demo123")
        print("========================================")

    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
