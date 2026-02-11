require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

console.log('Seed: DATABASE_URL available:', !!process.env.DATABASE_URL);

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('🌱 Iniciando Seed...');

    // 1. Categorías por defecto del sistema
    const defaultCategories = [
        { name: 'Salario', type: 'INCOME', color: '#10B981', icon: '💰' },
        { name: 'Freelance', type: 'INCOME', color: '#3B82F6', icon: '💻' },
        { name: 'Inversiones', type: 'INCOME', color: '#8B5CF6', icon: '📈' },
        { name: 'Alimentación', type: 'EXPENSE', color: '#EF4444', icon: '🍔' },
        { name: 'Transporte', type: 'EXPENSE', color: '#F59E0B', icon: '🚗' },
        { name: 'Vivienda', type: 'EXPENSE', color: '#EC4899', icon: '🏠' },
        { name: 'Entretenimiento', type: 'EXPENSE', color: '#6366F1', icon: '🎬' },
        { name: 'Salud', type: 'EXPENSE', color: '#14B8A6', icon: '🏥' },
        { name: 'Educación', type: 'EXPENSE', color: '#F97316', icon: '📚' },
        { name: 'Servicios', type: 'EXPENSE', color: '#6B7280', icon: '💡' },
        { name: 'Ropa', type: 'EXPENSE', color: '#DB2777', icon: '👕' },
        { name: 'Otros', type: 'EXPENSE', color: '#9CA3AF', icon: '📦' },
    ];

    console.log('📊 Creando categorías por defecto...');

    // Usamos createMany si es posible, o upsert en bucle
    // upsert es mejor para idempotencia
    for (const cat of defaultCategories) {
        // Nota: Como 'userId' es parte de la clave única y es nullable, 
        // Prisma nos permite buscar por userId: null

        // Verificamos si existe antes de crear para evitar problemas con unique nulls en algunos drivers
        const existing = await prisma.category.findFirst({
            where: {
                name: cat.name,
                userId: null
            }
        });

        if (!existing) {
            await prisma.category.create({
                data: {
                    ...cat,
                    isDefault: true,
                    userId: null
                }
            });
            console.log(`  + Categoría creada: ${cat.name}`);
        } else {
            console.log(`  . Categoría existente: ${cat.name}`);
        }
    }

    console.log('✅ Seed completado exitosamente.');
}

main()
    .catch((e) => {
        console.error('❌ Error en Seed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
