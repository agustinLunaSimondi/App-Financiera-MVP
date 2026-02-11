const prisma = require('../../config/database');

/**
 * Servicio para manejar la lógica de presupuestos
 */
class BudgetService {
    /**
     * Listar presupuestos del usuario
     */
    async getAll(userId) {
        return await prisma.budget.findMany({
            where: { userId },
            include: {
                category: { select: { id: true, name: true, color: true } }
            },
            orderBy: { startDate: 'desc' }
        });
    }

    /**
     * Obtener un presupuesto por ID
     */
    async getById(id, userId) {
        const budget = await prisma.budget.findFirst({
            where: { id, userId },
            include: {
                category: { select: { id: true, name: true, color: true } }
            }
        });

        if (!budget) {
            const error = new Error('Presupuesto no encontrado');
            error.status = 404;
            throw error;
        }

        return budget;
    }

    /**
     * Crear un nuevo presupuesto
     */
    async create(userId, data) {
        const { categoryId, amount, period, startDate } = data;

        // Verificar si ya existe un presupuesto para este usuario, categoría y periodo
        const existing = await prisma.budget.findFirst({
            where: {
                userId,
                categoryId,
                period: period || 'MONTHLY'
            }
        });

        if (existing) {
            const error = new Error('Ya existe un presupuesto para esta categoría y periodo');
            error.status = 400;
            throw error;
        }

        return await prisma.budget.create({
            data: {
                userId,
                categoryId,
                amount,
                period: period || 'MONTHLY',
                startDate: new Date(startDate || new Date())
            },
            include: {
                category: { select: { id: true, name: true, color: true } }
            }
        });
    }

    /**
     * Actualizar un presupuesto
     */
    async update(id, userId, updates) {
        // Verificar existencia
        await this.getById(id, userId);

        const { amount, period, startDate, categoryId } = updates;

        return await prisma.budget.update({
            where: { id },
            data: {
                ...(amount !== undefined && { amount }),
                ...(period && { period }),
                ...(startDate && { startDate: new Date(startDate) }),
                ...(categoryId && { categoryId })
            },
            include: {
                category: { select: { id: true, name: true, color: true } }
            }
        });
    }

    /**
     * Eliminar un presupuesto
     */
    async delete(id, userId) {
        // Verificar existencia
        await this.getById(id, userId);

        await prisma.budget.delete({ where: { id } });
        return true;
    }
}

module.exports = new BudgetService();
