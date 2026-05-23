import requests
import uuid

BASE_URL = "http://localhost:8000/api"

def run_additional_tests():
    print("Iniciando pruebas adicionales...")
    test_id = str(uuid.uuid4())[:8]
    email = f"qa2_{test_id}@test.com"
    pw = "P4ssw0rd!"
    
    # 1. Registro
    res = requests.post(f"{BASE_URL}/auth/register", json={"name": "QA Tester 2", "email": email, "password": pw})
    assert res.status_code == 200, f"Error registro: {res.text}"
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Obtener categorias y cuentas
    categories = requests.get(f"{BASE_URL}/categories", headers=headers).json()
    accounts = requests.get(f"{BASE_URL}/accounts", headers=headers).json()
    cat_id = categories[0]["id"]
    acc_id = accounts[0]["id"]
    
    # 2. Testing Budgets
    res = requests.post(f"{BASE_URL}/budgets", headers=headers, json={
        "category_id": cat_id,
        "amount": 500,
        "period": "MONTHLY",
        "start_date": "2026-04-01"
    })
    assert res.status_code == 200, "Error creando budget"
    
    # Update al mismo presupuesto si repetimos category y period (logica "existing" en el post)
    res = requests.post(f"{BASE_URL}/budgets", headers=headers, json={
        "category_id": cat_id,
        "amount": 800,
        "period": "MONTHLY",
        "start_date": "2026-04-01"
    })
    assert res.status_code == 200
    res_get = requests.get(f"{BASE_URL}/budgets", headers=headers)
    assert len(res_get.json()) == 1, "Debería haber solo 1 budget por no crear duplicados"
    assert res_get.json()[0]["amount"] == 800, "Budget debe haberse actualizado"

    # 3. Testing Recurring Transactions
    res = requests.post(f"{BASE_URL}/recurring", headers=headers, json={
        "account_id": acc_id,
        "category_id": cat_id,
        "amount": 100,
        "description": "Recurrente Mensual",
        "frequency": "MONTHLY",
        "start_date": "2026-04-12"
    })
    assert res.status_code == 200, "Error creando recurrente"
    
    # 4. Testing Savings
    res = requests.post(f"{BASE_URL}/savings-goals", headers=headers, json={
        "name": "Vacaciones",
        "target_amount": 2000,
        "current_amount": 100,
        "deadline": "2026-12-01"
    })
    assert res.status_code == 200, "Error creando saving goal"
    goal_id = res.json()["id"]
    
    res = requests.put(f"{BASE_URL}/savings-goals/{goal_id}", headers=headers, json={
        "current_amount": 300
    })
    assert res.status_code == 200, "Error actualizando saving goal"
    assert res.json()["current_amount"] == 300
    
    print("Todas las pruebas adicionales pasaron!")

if __name__ == "__main__":
    run_additional_tests()
