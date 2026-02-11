const prisma = require('../../config/database');

/**
 * Servicio para manejar la lógica de categorías
 */
class CategoryService {
    /**
     * Listar categorías (deduplicadas y ordenadas)
     */
    async getAll(userId) {
        const where = {
            OR: [
                { userId: null }, // Categorías por defecto
                { userId }       // Categorías del usuario
            ]
        };

        const categories = await prisma.category.findMany({
            where,
            orderBy: [{ type: 'asc' }, { name: 'asc' }]
        });

        // Deduplicar por nombre (preferir las del usuario sobre las por defecto)
        const uniqueCategories = [];
        const seenNames = new Set();

        // Ordenamos para que las de usuario aparezcan primero y sean elegidas
        const sorted = [...categories].sort((a, b) => {
            if (a.userId && !b.userId) return -1;
            if (!a.userId && b.userId) return 1;
            return 0;
        });

        for (const cat of sorted) {
            const key = `${cat.type}-${cat.name.toLowerCase()}`;
            if (!seenNames.has(key)) {
                seenNames.add(key);
                uniqueCategories.push(cat);
            }
        }

        return uniqueCategories;
    }

    /**
     * Crear una nueva categoría
     */
    async create(userId, data) {
        const { name, type, color, icon } = data;

        return await prisma.category.create({
            data: {
                userId,
                name,
                type,
                color: color || '#6B7280',
                icon,
                isDefault: false
            }
        });
    }

    /**
     * Actualizar una categoría
     */
    async update(id, userId, updates) {
        // Verificar que sea del usuario y no por defecto
        const category = await prisma.category.findFirst({
            where: { id, userId }
        });

        if (!category) {
            const error = new Error('Categoría no encontrada o no es editable');
            error.status = 404;
            throw error;
        }

        const { name, color, icon, type } = updates;

        return await prisma.category.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(color && { color }),
                ...(icon && { icon }),
                ...(type && { type })
            }
        });
    }

    /**
     * Eliminar una categoría
     */
    async delete(id, userId) {
        const category = await prisma.category.findFirst({
            where: { id, userId }
        });

        if (!category) {
            const error = new Error('Categoría no encontrada o no es eliminable');
            error.status = 404;
            throw error;
        }

        await prisma.category.delete({ where: { id } });
        return true;
    }
}

module.exports = new CategoryService();
