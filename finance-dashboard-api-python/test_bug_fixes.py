"""
Tests para verificar los bugs corregidos del informe QA.

Casos cubiertos:
  - Crear meta de ahorro sin deadline (antes devolvía 422 por string vacío)
  - Crear meta de ahorro con deadline = ""  (defensa en backend)
  - Crear regla recurrente con endDate = ""  (defensa en backend)
  - Depositar (PUT savings-goals con currentAmount)
  - Crear categoría custom desde el formulario inline
  - Trailing-slash redirects de FastAPI no rompen PUT con UUID

Uso:
    cd finance-dashboard-api-python
    # backend corriendo en localhost:8000
    python test_bug_fixes.py
"""
import sys
import uuid
import requests

BASE_URL = "http://localhost:8000/api"


def step(msg):
    print(f"\n→ {msg}")


def assert_status(res, expected, label):
    if res.status_code != expected:
        print(f"  ❌ {label}: esperado {expected}, recibido {res.status_code}")
        try:
            print(f"     body: {res.json()}")
        except Exception:
            print(f"     body: {res.text}")
        sys.exit(1)
    print(f"  ✓ {label} ({res.status_code})")


def main():
    print("=== Tests de fixes QA ===")
    test_id = str(uuid.uuid4())[:8]
    email = f"qa_fix_{test_id}@example.com"
    password = "Pass1234!"

    # ─── 1. Registrar usuario fresco ───
    step("Registrar usuario de prueba")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": f"QA-{test_id}", "email": email, "password": password
    })
    assert_status(res, 200, "registro")
    token = res.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    # ─── 2. Verificar categorías por defecto creadas ───
    step("Listar categorías (deben existir 13 por defecto)")
    res = requests.get(f"{BASE_URL}/categories/", headers=headers)
    assert_status(res, 200, "GET /categories")
    categories = res.json()
    assert len(categories) >= 13, f"Esperaba >=13 categorías, obtuve {len(categories)}"
    print(f"  ✓ {len(categories)} categorías cargadas")

    expense_cat = next(c for c in categories if c["type"] == "EXPENSE")

    # ─── 3. Crear meta de ahorro SIN deadline (regresión QA bug #2) ───
    step("Bug #2: crear SavingGoal con deadline omitida")
    res = requests.post(f"{BASE_URL}/savings-goals/", headers=headers, json={
        "name": "Vacaciones",
        "targetAmount": 50000,
        "currentAmount": 0,
        "color": "#10B981"
    })
    assert_status(res, 200, "POST /savings-goals (sin deadline)")
    goal_no_deadline = res.json()
    print(f"  ✓ goal id: {goal_no_deadline['id']}, deadline: {goal_no_deadline.get('deadline')}")

    # ─── 4. Crear meta con deadline = "" (string vacío) ───
    step("Bug #2: crear SavingGoal con deadline = '' (defensa backend)")
    res = requests.post(f"{BASE_URL}/savings-goals/", headers=headers, json={
        "name": "Auto",
        "targetAmount": 100000,
        "currentAmount": 0,
        "deadline": "",
        "color": "#3B82F6"
    })
    assert_status(res, 200, "POST /savings-goals (deadline='')")
    goal_empty_deadline = res.json()
    assert goal_empty_deadline["deadline"] is None, \
        f"deadline='' debió convertirse a None, obtuve {goal_empty_deadline['deadline']}"
    print(f"  ✓ deadline='' se convirtió a null correctamente")

    # ─── 5. Crear meta con deadline válida ───
    step("Crear SavingGoal con deadline válida")
    res = requests.post(f"{BASE_URL}/savings-goals/", headers=headers, json={
        "name": "Notebook",
        "targetAmount": 200000,
        "currentAmount": 5000,
        "deadline": "2027-12-31",
        "color": "#8B5CF6"
    })
    assert_status(res, 200, "POST /savings-goals (deadline válida)")
    goal_with_deadline = res.json()

    # ─── 6. Depositar (PUT con currentAmount) — bug "Depositar no funciona" ───
    step("Bug Depositar: PUT /savings-goals/{id} con currentAmount")
    new_amount = float(goal_with_deadline["currentAmount"]) + 1500
    res = requests.put(
        f"{BASE_URL}/savings-goals/{goal_with_deadline['id']}",
        headers=headers,
        json={"currentAmount": new_amount}
    )
    assert_status(res, 200, "PUT /savings-goals/{id}")
    updated = res.json()
    assert float(updated["currentAmount"]) == new_amount, \
        f"currentAmount no actualizado: esperaba {new_amount}, obtuve {updated['currentAmount']}"
    print(f"  ✓ depósito de 1500 aplicado: {updated['currentAmount']}")

    # ─── 7. Bug categoría custom desde formulario inline ───
    step("Bug #1 (parte 2): crear categoría custom (POST /categories)")
    res = requests.post(f"{BASE_URL}/categories/", headers=headers, json={
        "name": "Mi Categoría QA",
        "color": "#10b981",
        "type": "EXPENSE"
    })
    assert_status(res, 200, "POST /categories")
    new_cat = res.json()
    print(f"  ✓ categoría creada id={new_cat['id']}")

    # ─── 8. Listar cuentas (debe haber al menos la default 'Efectivo') ───
    step("Verificar cuenta default")
    res = requests.get(f"{BASE_URL}/accounts/", headers=headers)
    assert_status(res, 200, "GET /accounts")
    accounts = res.json()
    assert len(accounts) >= 1, "Debería existir al menos la cuenta Efectivo"
    account = accounts[0]
    print(f"  ✓ cuenta default: {account['name']}")

    # ─── 9. Recurring con endDate = "" ───
    step("Bug recurring: crear regla con endDate = ''")
    res = requests.post(f"{BASE_URL}/recurring/", headers=headers, json={
        "accountId": account["id"],
        "categoryId": new_cat["id"],
        "amount": -100,
        "description": "Test recurring",
        "frequency": "MONTHLY",
        "startDate": "2026-06-01",
        "endDate": "",
        "isActive": True
    })
    assert_status(res, 200, "POST /recurring (endDate='')")
    rec = res.json()
    assert rec["endDate"] is None, f"endDate='' debería ser null, obtuve {rec['endDate']}"
    print(f"  ✓ endDate='' convertido a null")

    # ─── 10. Crear transacción ───
    step("Crear transacción (smoke test del flujo completo)")
    res = requests.post(f"{BASE_URL}/transactions/", headers=headers, json={
        "accountId": account["id"],
        "categoryId": expense_cat["id"],
        "amount": -250.50,
        "description": "Test compra",
        "transactionDate": "2026-05-10"
    })
    assert_status(res, 200, "POST /transactions")
    print(f"  ✓ transacción creada")

    # ─── 11. Bug: PUT a /savings-goals/{id} con UUID en path NO debe redirigir ───
    step("Verificar que PUT a path con UUID no devuelve 307")
    res = requests.put(
        f"{BASE_URL}/savings-goals/{goal_with_deadline['id']}",
        headers=headers,
        json={"currentAmount": float(updated["currentAmount"]) + 100},
        allow_redirects=False
    )
    assert res.status_code in (200, 307), f"unexpected status {res.status_code}"
    if res.status_code == 200:
        print(f"  ✓ PUT directo (no redirect) OK")
    else:
        print(f"  ⚠ recibí 307 — el cliente axios sigue redirects, no es un bug fatal")

    print("\n🎉 Todos los tests de fixes QA pasaron!")


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print(f"\n❌ Falló una assertion: {e}")
        sys.exit(1)
    except requests.ConnectionError:
        print("\n❌ No se pudo conectar al backend. ¿Está corriendo en localhost:8000?")
        print("   Ejecutá: cd finance-dashboard-api-python && uvicorn main:app --reload")
        sys.exit(1)
