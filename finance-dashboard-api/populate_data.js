const readline = require('readline');
const path = require('path');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

// Cargar variables de entorno si no existen
if (!process.env.DATABASE_URL) {
    try {
        require('dotenv').config({ path: path.join(__dirname, '.env') });
    } catch (e) {
        console.warn('⚠️ No se pudo cargar dotenv, asegúrate de pasar las variables de entorno o usar --env-file');
    }
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function main() {
    console.log('🚀 --- Generador de Datos de Prueba --- 🚀');

    rl.question('📧 Ingrese el email del usuario a popular: ', async (email) => {
        try {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() }
            });

            if (!user) {
                console.error(`❌ Usuario con email ${email} no encontrado.`);
                process.exit(1);
            }

            console.log(`✅ Usuario encontrado: ${user.name}`);

            // 1. Crear Cuentas
            console.log('🏦 Creando cuentas...');
            const banco = await prisma.account.create({
                data: {
                    name: 'Banco Principal',
                    type: 'CHECKING',
                    balance: 500000,
                    currency: 'ARS',
                    userId: user.id
                }
            });

            const efectivo = await prisma.account.create({
                data: {
                    name: 'Billetera',
                    type: 'CHECKING',
                    balance: 25000,
                    currency: 'ARS',
                    userId: user.id
                }
            });

            const accounts = [banco, efectivo];

            // 2. Obtener Categorías
            const categories = await prisma.category.findMany({
                where: { OR: [{ userId: user.id }, { isDefault: true }] }
            });

            if (categories.length === 0) {
                console.error('⚠️ No hay categorías disponibles. Asegúrate de registrar el usuario correctamente.');
                process.exit(1);
            }

            // 3. Generar Transacciones
            console.log('💸 Generando 50 transacciones...');
            const transactions = [];

            for (let i = 0; i < 50; i++) {
                const isIncome = Math.random() > 0.7; // 30% Ingresos, 70% Gastos
                const account = accounts[Math.floor(Math.random() * accounts.length)];

                // Filtrar categorías por tipo
                const typeCategories = categories.filter(c => c.type === (isIncome ? 'INCOME' : 'EXPENSE'));
                const category = typeCategories.length > 0
                    ? typeCategories[Math.floor(Math.random() * typeCategories.length)]
                    : categories[0];

                const amount = isIncome
                    ? Math.floor(Math.random() * 50000) + 1000
                    : (Math.floor(Math.random() * 15000) + 500) * -1;

                const daysAgo = Math.floor(Math.random() * 90);
                const date = new Date();
                date.setDate(date.getDate() - daysAgo);

                transactions.push({
                    accountId: account.id,
                    categoryId: category.id,
                    amount: parseFloat(amount), // Prisma lo maneja, pero aseguramos float
                    description: `Transacción de prueba ${i + 1}`,
                    transactionDate: date
                });
            }

            // Insertar transacciones
            // Nota: createMany no actualiza balances automáticamente, así que mejor usamos un loop o recalculamos
            // Para simplicidad y corrección, insertamos una por una y actualizamos balance

            let completed = 0;
            for (const tx of transactions) {
                await prisma.$transaction([
                    prisma.transaction.create({ data: tx }),
                    prisma.account.update({
                        where: { id: tx.accountId },
                        data: { balance: { increment: tx.amount } }
                    })
                ]);
                completed++;
                process.stdout.write(`\rProcesando: ${completed}/50`);
            }

            console.log('\n🎉 ¡Datos generados exitosamente!');
            console.log('Ahora tu dashboard debería verse increíble.');

        } catch (error) {
            console.error('❌ Error:', error);
        } finally {
            await prisma.$disconnect();
            rl.close();
            process.exit(0);
        }
    });
}

main();
