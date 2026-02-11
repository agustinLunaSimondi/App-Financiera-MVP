const prisma = require('../config/database');

/**
 * Calcula la próxima fecha de ocurrencia basada en la frecuencia
 */
function calculateNextDate(currentDate, frequency) {
    const next = new Date(currentDate);
    switch (frequency) {
        case 'DAILY':
            next.setDate(next.getDate() + 1);
            break;
        case 'WEEKLY':
            next.setDate(next.getDate() + 7);
            break;
        case 'BIWEEKLY':
            next.setDate(next.getDate() + 14);
            break;
        case 'MONTHLY':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'YEARLY':
            next.setFullYear(next.getFullYear() + 1);
            break;
    }
    return next;
}

/**
 * Procesa todas las transacciones recurrentes activas que están vencidas
 */
async function processRecurringTransactions() {
    console.log('[RecurringProcessor] Iniciando procesamiento...');
    const now = new Date();

    try {
        console.log('[RecurringProcessor] Ejecutando findMany...');
        const dueTransactions = await prisma.recurringTransaction.findMany({
            where: {
                isActive: true,
                nextDate: { lte: now },
                OR: [
                    { endDate: null },
                    { endDate: { gte: now } }
                ]
            }
        });

        console.log(`[RecurringProcessor] findMany completado. Encontradas ${dueTransactions.length} transacciones.`);

        for (const rt of dueTransactions) {
            await prisma.$transaction(async (tx) => {
                // 1. Crear la transacción real
                await tx.transaction.create({
                    data: {
                        accountId: rt.accountId,
                        categoryId: rt.categoryId,
                        amount: rt.amount,
                        description: rt.description,
                        transactionDate: rt.nextDate, // Usar la fecha programada
                        recurringId: rt.id
                    }
                });

                // 2. Actualizar balance de la cuenta
                await tx.account.update({
                    where: { id: rt.accountId },
                    data: { balance: { increment: rt.amount } }
                });

                // 3. Calcular y actualizar la próxima fecha
                const nextDate = calculateNextDate(rt.nextDate, rt.frequency);

                // Si la próxima fecha supera la fecha de fin, desactivar
                const isActive = rt.endDate ? nextDate <= rt.endDate : true;

                await tx.recurringTransaction.update({
                    where: { id: rt.id },
                    data: {
                        nextDate,
                        isActive
                    }
                });
            });
            console.log(`[RecurringProcessor] Procesada RT: ${rt.description}`);
        }
    } catch (error) {
        console.error('[RecurringProcessor] Error procesando transacciones recurrentes:', error);
    }
}

module.exports = {
    processRecurringTransactions
};
