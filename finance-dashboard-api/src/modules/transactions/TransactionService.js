const prisma = require('../../config/database');

/**
 * Servicio para manejar la lógica de transacciones
 */
class TransactionService {
    /**
     * Listar transacciones con filtros
     */
    async getAll(userId, filters = {}) {
        const {
            accountId,
            categoryId,
            startDate,
            endDate,
            type,
            search,
            limit = 50,
            offset = 0
        } = filters;

        const where = {
            account: {
                userId: userId
            }
        };

        if (accountId) where.accountId = accountId;
        if (categoryId) where.categoryId = categoryId;

        if (startDate || endDate) {
            where.transactionDate = {};
            if (startDate) where.transactionDate.gte = new Date(startDate);
            if (endDate) where.transactionDate.lte = new Date(endDate);
        }

        if (type === 'income') {
            where.amount = { gt: 0 };
        } else if (type === 'expense') {
            where.amount = { lt: 0 };
        }

        if (search) {
            where.description = { contains: search, mode: 'insensitive' };
        }

        const [transactions, total] = await Promise.all([
            prisma.transaction.findMany({
                where,
                include: {
                    account: { select: { id: true, name: true } },
                    category: { select: { id: true, name: true, color: true, icon: true } }
                },
                orderBy: { transactionDate: 'desc' },
                take: parseInt(limit),
                skip: parseInt(offset)
            }),
            prisma.transaction.count({ where })
        ]);

        return {
            transactions,
            pagination: {
                total,
                limit: parseInt(limit),
                offset: parseInt(offset),
                hasMore: parseInt(offset) + transactions.length < total
            }
        };
    }

    /**
     * Obtener una transacción por ID
     */
    async getById(id, userId) {
        const transaction = await prisma.transaction.findFirst({
            where: {
                id,
                account: { userId }
            },
            include: {
                account: { select: { id: true, name: true } },
                category: { select: { id: true, name: true, color: true, icon: true } }
            }
        });

        if (!transaction) {
            const error = new Error('Transacción no encontrada');
            error.status = 404;
            throw error;
        }

        return transaction;
    }

    /**
     * Crear una nueva transacción
     */
    async create(userId, data) {
        const { accountId, categoryId, amount, description, transactionDate } = data;

        // Verificar que la cuenta pertenece al usuario
        const account = await prisma.account.findFirst({
            where: { id: accountId, userId }
        });

        if (!account) {
            const error = new Error('Cuenta no válida o no encontrada');
            error.status = 400;
            throw error;
        }

        // Crear transacción y actualizar balance en una transacción de BD
        return await prisma.$transaction(async (tx) => {
            const transaction = await tx.transaction.create({
                data: {
                    accountId,
                    categoryId,
                    amount,
                    description,
                    transactionDate: new Date(transactionDate)
                },
                include: {
                    account: { select: { id: true, name: true } },
                    category: { select: { id: true, name: true, color: true, icon: true } }
                }
            });

            // Actualizar balance de la cuenta
            await tx.account.update({
                where: { id: accountId },
                data: {
                    balance: {
                        increment: amount
                    }
                }
            });

            return transaction;
        });
    }

    /**
     * Actualizar una transacción
     */
    async update(id, userId, updates) {
        // Verificar existencia y propiedad
        const oldTx = await this.getById(id, userId);

        const { amount, accountId, categoryId, description, transactionDate } = updates;

        return await prisma.$transaction(async (tx) => {
            // Si cambió el monto o la cuenta, ajustar balances
            if (amount !== undefined || (accountId && accountId !== oldTx.accountId)) {
                // Revertir balance viejo
                await tx.account.update({
                    where: { id: oldTx.accountId },
                    data: { balance: { decrement: oldTx.amount } }
                });

                // Aplicar balance nuevo
                const targetAccountId = accountId || oldTx.accountId;
                const targetAmount = amount !== undefined ? amount : oldTx.amount;

                await tx.account.update({
                    where: { id: targetAccountId },
                    data: { balance: { increment: targetAmount } }
                });
            }

            return await tx.transaction.update({
                where: { id },
                data: {
                    ...(amount !== undefined && { amount }),
                    ...(accountId && { accountId }),
                    ...(categoryId && { categoryId }),
                    ...(description && { description }),
                    ...(transactionDate && { transactionDate: new Date(transactionDate) })
                },
                include: {
                    account: { select: { id: true, name: true } },
                    category: { select: { id: true, name: true, color: true, icon: true } }
                }
            });
        });
    }

    /**
     * Eliminar una transacción
     */
    async delete(id, userId) {
        const transaction = await this.getById(id, userId);

        await prisma.$transaction(async (tx) => {
            // Revertir balance
            await tx.account.update({
                where: { id: transaction.accountId },
                data: { balance: { decrement: transaction.amount } }
            });

            // Eliminar
            await tx.transaction.delete({ where: { id } });
        });

        return true;
    }
}

module.exports = new TransactionService();
