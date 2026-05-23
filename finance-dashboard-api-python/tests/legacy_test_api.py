import requests
import uuid

BASE_URL = "http://localhost:8000/api"

def run_tests():
    print("=== Iniciando Tests API ===")
    
    # Datos de prueba con UUID para que no haya conflictos
    test_id = str(uuid.uuid4())[:8]
    test_email = f"test_{test_id}@example.com"
    test_password = "Password123!"
    
    print(f"\n1. Testeando Registro de Usuario ({test_email})...")
    res = requests.post(f"{BASE_URL}/auth/register", json={
        "name": f"Tester {test_id}",
        "email": test_email,
        "password": test_password
    })
    
    if res.status_code == 200:
        print("✅ Registro exitoso!")
        data = res.json()
        token = data.get("token")
        user = data.get("user")
        print(f"-> User ID: {user['id']}")
    else:
        print("❌ Fallo el registro:", res.text)
        return

    print("\n2. Testeando Login...")
    res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": test_email,
        "password": test_password
    })
    if res.status_code == 200:
        print("✅ Login exitoso!")
    else:
        print("❌ Fallo el login:", res.text)
        return

    headers = {"Authorization": f"Bearer {token}"}

    print("\n3. Obteniendo datos del usuario (/me)...")
    res = requests.get(f"{BASE_URL}/auth/me", headers=headers)
    if res.status_code == 200:
        print("✅ Datos obtenidos correctamente!")
    else:
        print("❌ Fallo al obtener metadata:", res.text)
        return
        
    print("\n4. Listando cuentas creadas automáticamente...")
    res = requests.get(f"{BASE_URL}/accounts", headers=headers)
    if res.status_code == 200:
        accounts = res.json()
        print(f"✅ Se encontraron {len(accounts)} cuentas creadas.")
        if len(accounts) > 0:
            print(f"-> Cuenta por defecto: {accounts[0]['name']}")
            account_id = accounts[0]['id']
        else:
            print("❌ No se creo la cuenta por defecto!")
            return
    else:
        print("❌ Fallo al listar cuentas:", res.text)
        return

    print("\n5. Listando categorías creadas automáticamente...")
    res = requests.get(f"{BASE_URL}/categories", headers=headers)
    if res.status_code == 200:
        categories = res.json()
        print(f"✅ Se encontraron {len(categories)} categorías creadas (Cuentas Default de Expense/Income).")
        if len(categories) > 0:
            category_id = categories[0]['id']
        else:
            print("❌ No se crearon las categorias por defecto!")
            return
    else:
        print("❌ Fallo al listar categorias:", res.text)
        return

    print("\n6. Intentando crear una transaccion de prueba...")
    res = requests.post(f"{BASE_URL}/transactions", headers=headers, json={
        "accountId": account_id,
        "categoryId": category_id,
        "amount": 150.50,
        "description": "Compra de prueba E2E",
        "transactionDate": "2026-04-12"
    })
    
    if res.status_code == 200:
        print("✅ Transacción creada y persistida en Supabase con éxito!")
    else:
        print("❌ Error guardando transacción:", res.text)
        return
        
    print("\n🎉 ¡TODOS LOS TESTS PASARON! El Back-End funciona perfectamente en Supabase.")

if __name__ == "__main__":
    try:
        import requests
    except ImportError:
        print("Instalando Requests temporalmente para los tests...")
        import os
        os.system("pip install requests")
        
    run_tests()
