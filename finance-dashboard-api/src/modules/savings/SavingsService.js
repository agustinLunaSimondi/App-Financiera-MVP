const prisma = require('../../config/database');

/**
 * Servicio para manejar la lógica de metas de ahorro
 */
class SavingsService {
    /**
     * Listar metas de ahorro del usuario
     */
    async getAll(userId) {
        return await prisma.savingGoal.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Obtener una meta por ID
     */
    async getById(id, userId) {
        const goal = await prisma.savingGoal.findFirst({
            where: { id, userId }
        });

        if (!goal) {
            const error = new Error('Meta de ahorro no encontrada');
            error.status = 404;
            throw error;
        }

        return goal;
    }

    /**
     * Crear una nueva meta
     */
    async create(userId, data) {
        const { name, targetAmount, currentAmount, deadline, icon, color } = data;

        return await prisma.savingGoal.create({
            data: {
                userId,
                name,
                targetAmount,
                currentAmount: currentAmount || 0,
                deadline: deadline ? new Date(deadline) : null,
                icon,
                color: color || '#10B981'
            }
        });
    }

    /**
     * Actualizar una meta
     */
    async update(id, userId, updates) {
        // Verificar existencia
        await this.getById(id, userId);

        const { name, targetAmount, currentAmount, deadline, icon, color } = updates;

        return await prisma.savingGoal.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(targetAmount !== undefined && { targetAmount }),
                ...(currentAmount !== undefined && { currentAmount }),
                ...(deadline && { deadline: new Date(deadline) }),
                ...(icon && { icon }),
                ...(color && { color })
            }
        });
    }

    /**
     * Eliminar una meta
     */
    async delete(id, userId) {
        // Verificar existencia
        await this.getById(id, userId);

        await prisma.savingGoal.delete({ where: { id } });
        return true;
    }
}

module.exports = new SavingsService();
