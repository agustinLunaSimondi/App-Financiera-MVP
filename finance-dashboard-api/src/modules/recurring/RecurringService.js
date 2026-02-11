const prisma = require('../../config/database');

/**
 * Servicio para manejar la lógica de transacciones recurrentes
 */
class RecurringService {
    /**
     * Listar transacciones recurrentes del usuario
     */
    async getAll(userId) {
        return await prisma.recurringTransaction.findMany({
            where: { userId },
            include: {
                account: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Obtener una transacción recurrente por ID
     */
    async getById(id, userId) {
        const rt = await prisma.recurringTransaction.findFirst({
            where: { id, userId },
            include: {
                account: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true } }
            }
        });

        if (!rt) {
            const error = new Error('Transacción recurrente no encontrada');
            error.status = 404;
            throw error;
        }

        return rt;
    }

    /**
     * Crear una nueva transacción recurrente
     */
    async create(userId, data) {
        const { accountId, categoryId, amount, description, frequency, startDate, endDate } = data;

        const start = new Date(startDate || new Date());

        return await prisma.recurringTransaction.create({
            data: {
                userId,
                accountId,
                categoryId,
                amount,
                description,
                frequency,
                startDate: start,
                nextDate: start, // Al crear, la próxima fecha es la de inicio
                endDate: endDate ? new Date(endDate) : null
            },
            include: {
                account: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true } }
            }
        });
    }

    /**
     * Actualizar una transacción recurrente
     */
    async update(id, userId, updates) {
        // Verificar existencia
        await this.getById(id, userId);

        const { accountId, categoryId, amount, description, frequency, startDate, endDate, isActive } = updates;

        return await prisma.recurringTransaction.update({
            where: { id },
            data: {
                ...(accountId && { accountId }),
                ...(categoryId && { categoryId }),
                ...(amount !== undefined && { amount }),
                ...(description && { description }),
                ...(frequency && { frequency }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
                ...(isActive !== undefined && { isActive })
            },
            include: {
                account: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true } }
            }
        });
    }

    /**
     * Eliminar una transacción recurrente
     */
    async delete(id, userId) {
        // Verificar existencia
        await this.getById(id, userId);

        await prisma.recurringTransaction.delete({ where: { id } });
        return true;
    }
}

module.exports = new RecurringService();
