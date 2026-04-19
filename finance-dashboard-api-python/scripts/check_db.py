import os
import sys
from sqlalchemy import text

sys.path.append(os.path.join(os.getcwd()))
from app.database.database import engine

def check_data():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT email FROM users WHERE email = 'demo@demo.com'"))
        user = result.fetchone()
        if user:
            print(f"User found: {user[0]}")
            
            # Check accounts
            result = conn.execute(text("SELECT name, balance FROM accounts WHERE user_id = (SELECT id FROM users WHERE email = 'demo@demo.com')"))
            accounts = result.fetchall()
            print(f"Accounts found: {len(accounts)}")
            for acc in accounts:
                print(f" - {acc[0]}: {acc[1]}")
                
            # Check transactions
            result = conn.execute(text("SELECT COUNT(*) FROM transactions WHERE account_id IN (SELECT id FROM accounts WHERE user_id = (SELECT id FROM users WHERE email = 'demo@demo.com'))"))
            count = result.scalar()
            print(f"Transactions found: {count}")
        else:
            print("User demo@demo.com NOT found in database.")

if __name__ == "__main__":
    check_data()
