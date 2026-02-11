const prisma = require('../../config/database');

/**
 * Servicio para manejar la lógica de cuentas
 */
class AccountService {
    /**
     * Listar cuentas del usuario
     */
    async getAll(userId) {
        return await prisma.account.findMany({
            where: { userId },
            orderBy: { name: 'asc' }
        });
    }

    /**
     * Obtener una cuenta por ID
     */
    async getById(id, userId) {
        const account = await prisma.account.findFirst({
            where: { id, userId }
        });

        if (!account) {
            const error = new Error('Cuenta no encontrada');
            error.status = 404;
            throw error;
        }

        return account;
    }

    /**
     * Crear una nueva cuenta
     */
    async create(userId, data) {
        const { name, type, balance, currency } = data;

        return await prisma.account.create({
            data: {
                userId,
                name,
                type: type || 'CHECKING',
                balance: balance || 0,
                currency: currency || 'USD'
            }
        });
    }

    /**
     * Actualizar una cuenta
     */
    async update(id, userId, updates) {
        // Verificar existencia
        await this.getById(id, userId);

        const { name, type, balance, currency } = updates;

        return await prisma.account.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(type && { type }),
                ...(balance !== undefined && { balance }),
                ...(currency && { currency })
            }
        });
    }

    /**
     * Eliminar una cuenta
     */
    async delete(id, userId) {
        // Verificar existencia
        await this.getById(id, userId);

        await prisma.account.delete({ where: { id } });
        return true;
    }
}

module.exports = new AccountService();
