import requests
import uuid

BASE_URL = "http://localhost:8000/api"

def test_transactions_math():
    print("Iniciando pruebas de lógica de balance...")
    test_id = str(uuid.uuid4())[:8]
    email = f"qa_{test_id}@test.com"
    pw = "P4ssw0rd!"
    
    # 1. Registro
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": "QA Tester",
        "email": email,
        "password": pw
    })
    assert res.status_code == 200, f"Error registro: {res.text}"
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get Accounts (deberia tener 'Efectivo' con balance 0)
    res = requests.get(f"{BASE_URL}/accounts", headers=headers)
    accounts = res.json()
    account_id = accounts[0]["id"]
    initial_balance = float(accounts[0]["balance"])
    assert initial_balance == 0.0, "Balance inicial no es 0"
    
    # 3. Get Categories
    res = requests.get(f"{BASE_URL}/categories", headers=headers)
    categories = res.json()
    income_category = next(c for c in categories if c["type"] == "INCOME")
    expense_category = next(c for c in categories if c["type"] == "EXPENSE")
    
    # 4. Crear Ingreso (1000)
    res = requests.post(f"{BASE_URL}/transactions", headers=headers, json={
        "accountId": account_id,
        "categoryId": income_category["id"],
        "amount": 1000.0,
        "description": "Sueldo",
        "transactionDate": "2026-04-12"
    })
    assert res.status_code == 200
    tx1_id = res.json()["id"]
    
    res = requests.get(f"{BASE_URL}/accounts", headers=headers)
    assert float(res.json()[0]["balance"]) == 1000.0, "Error en suma de ingreso"
    
    # 5. Crear Gasto (-300)
    res = requests.post(f"{BASE_URL}/transactions", headers=headers, json={
        "accountId": account_id,
        "categoryId": expense_category["id"],
        "amount": -300.0,
        "description": "Super",
        "transactionDate": "2026-04-12"
    })
    assert res.status_code == 200
    tx2_id = res.json()["id"]
    
    res = requests.get(f"{BASE_URL}/accounts", headers=headers)
    assert float(res.json()[0]["balance"]) == 700.0, "Error en resta de gasto"
    
    # 6. Delete Transaction (Deberia volver a 1000)
    res = requests.delete(f"{BASE_URL}/transactions/{tx2_id}", headers=headers)
    assert res.status_code == 200
    res = requests.get(f"{BASE_URL}/accounts", headers=headers)
    assert float(res.json()[0]["balance"]) == 1000.0, "Error en reversión tras eliminar gasto"
    
    # 7. Update Transaction (Sueldo de 1000 a 1500)
    res = requests.put(f"{BASE_URL}/transactions/{tx1_id}", headers=headers, json={
        "amount": 1500.0
    })
    assert res.status_code == 200
    res = requests.get(f"{BASE_URL}/accounts", headers=headers)
    assert float(res.json()[0]["balance"]) == 1500.0, "Error en update transaccion"
    
    print("Todas las pruebas lógicas pasaron!")

if __name__ == "__main__":
    test_transactions_math()
