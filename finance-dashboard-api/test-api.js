const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

const API_URL = 'http://localhost:3001/api';
let serverProcess;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startServer() {
    console.log('🚀 Iniciando servidor backend...');
    serverProcess = spawn('node', ['src/app.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });

    // Esperar a que el servidor esté listo
    let attempts = 0;
    while (attempts < 20) {
        try {
            await axios.get('http://localhost:3001/api/health'); // Asumiendo endpoint de health, si no existe fallará y reintentará
            console.log('✅ Servidor listo en puerto 3001');
            return;
        } catch (e) {
            await sleep(1000);
            attempts++;
        }
    }
    throw new Error('El servidor no respondió a tiempo');
}

async function runTests() {
    try {
        await startServer();

        // 1. Registro
        console.log('\n👤 Probando Registro...');
        const email = `test${Date.now()}@example.com`;
        const password = 'password123';
        const registerRes = await axios.post(`${API_URL}/auth/register`, {
            email,
            password,
            name: 'Test User'
        });
        console.log('✅ Registro exitoso:', registerRes.status);
        const { token, user } = registerRes.data;

        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

        // 2. Login
        console.log('\n🔑 Probando Login...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        });
        console.log('✅ Login exitoso:', loginRes.status);

        // 3. Crear Transacción
        console.log('\n💸 Probando Crear Transacción...');
        // Necesitamos accountId y categoryId.
        // Al registrarse, se crean categorías por defecto?
        // Revisemos auth.js: Sí, createDefaultCategories(user.id)
        // Pero NO crea cuentas (Accounts).
        // Necesitamos crear una cuenta primero?
        // Revisemos si existe endpoint /api/accounts POST.
        // Asumiremos que sí.

        console.log('  -> Creando cuenta...');
        const accountRes = await axios.post(`${API_URL}/accounts`, {
            name: 'Cuenta Principal',
            type: 'CHECKING',
            currency: 'USD',
            balance: 1000
        }, authHeaders);
        const accountId = accountRes.data.id;
        console.log('  -> Cuenta creada ID:', accountId);

        // Obtener categorías para usar una
        const categoriesRes = await axios.get(`${API_URL}/categories`, authHeaders);
        const categoryId = categoriesRes.data[0].id;
        console.log('  -> Usando Categoría ID:', categoryId);

        const transactionRes = await axios.post(`${API_URL}/transactions`, {
            accountId,
            categoryId,
            amount: 50.00,
            description: 'Prueba de transacción',
            transactionDate: new Date()
        }, authHeaders);
        console.log('✅ Transacción creada:', transactionRes.status, transactionRes.data.id);
        const transactionId = transactionRes.data.id;

        // 4. Listar Transacciones
        console.log('\n📜 Probando Listar Transacciones...');
        const listRes = await axios.get(`${API_URL}/transactions`, authHeaders);
        console.log(`✅ Listado exitoso. Encontradas: ${listRes.data.transactions.length}`);

        // 5. Eliminar Transacción
        console.log('\n🗑 Probando Eliminar Transacción...');
        await axios.delete(`${API_URL}/transactions/${transactionId}`, authHeaders);
        console.log('✅ Eliminación exitosa');

        console.log('\n✨ TODAS LAS PRUEBAS PASARON');

    } catch (error) {
        console.error('\n❌ ERROR EN PRUEBAS:', error.message);
        if (error.response) {
            console.error('Data:', error.response.data);
        }
    } finally {
        if (serverProcess) {
            console.log('\n🛑 Deteniendo servidor...');
            // En Windows, spawn con shell:true crea dos procesos.
            // taskkill es más seguro.
            spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t']);
        }
    }
}

runTests();
