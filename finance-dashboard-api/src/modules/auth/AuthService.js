const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

/**
 * Servicio para manejar la lógica de autenticación y usuarios
 */
class AuthService {
    /**
     * Registrar un nuevo usuario
     */
    async register(userData) {
        const { email, password, name } = userData;

        // Verificar si el usuario ya existe
        const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
        if (existingUser) {
            const error = new Error('El usuario ya existe');
            error.status = 400;
            throw error;
        }

        // Hashear password
        const passwordHash = await bcrypt.hash(password, 12);

        // Crear usuario
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name,
                passwordHash,
                // Crear una cuenta por defecto
                accounts: {
                    create: {
                        name: 'Efectivo',
                        type: 'CHECKING', // Usamos CHECKING como genérico para efectivo
                        balance: 0
                    }
                }
            },
            select: {
                id: true,
                email: true,
                name: true,
                currency: true,
                createdAt: true
            }
        });

        // Crear categorías por defecto
        await this._createDefaultCategories(user.id);

        return this._generateTokenResponse(user);
    }

    /**
     * Iniciar sesión
     */
    async login(email, password) {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            const error = new Error('Credenciales inválidas');
            error.status = 401;
            throw error;
        }

        return this._generateTokenResponse(user);
    }

    /**
     * Obtener perfil del usuario
     */
    async getProfile(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                currency: true,
                darkMode: true,
                createdAt: true
            }
        });

        if (!user) {
            const error = new Error('Usuario no encontrado');
            error.status = 404;
            throw error;
        }

        return user;
    }

    /**
     * Actualizar perfil del usuario
     */
    async updateProfile(userId, updates) {
        const { name, currency, darkMode } = updates;

        return await prisma.user.update({
            where: { id: userId },
            data: {
                ...(name && { name }),
                ...(currency && { currency }),
                ...(darkMode !== undefined && { darkMode })
            },
            select: {
                id: true,
                email: true,
                name: true,
                currency: true,
                darkMode: true
            }
        });
    }

    /**
     * Eliminar cuenta de usuario
     */
    async deleteAccount(userId) {
        await prisma.user.delete({ where: { id: userId } });
        return true;
    }

    /**
     * Helper para generar el token JWT y respuesta de usuario
     */
    _generateTokenResponse(user) {
        const token = jwt.sign(
            { userId: user.id }, // Usamos userId para coincidir con el middleware original
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return {
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                currency: user.currency || 'USD',
                darkMode: user.darkMode || false
            },
            token
        };
    }

    /**
     * Helper: Crear categorías por defecto
     */
    async _createDefaultCategories(userId) {
        const defaultCategories = [
            // Ingresos
            { name: 'Salario', type: 'INCOME', color: '#10B981', icon: 'briefcase' },
            { name: 'Freelance', type: 'INCOME', color: '#059669', icon: 'laptop' },
            { name: 'Inversiones', type: 'INCOME', color: '#047857', icon: 'trending-up' },
            { name: 'Otros Ingresos', type: 'INCOME', color: '#065F46', icon: 'plus-circle' },
            // Gastos
            { name: 'Alimentación', type: 'EXPENSE', color: '#F59E0B', icon: 'utensils' },
            { name: 'Transporte', type: 'EXPENSE', color: '#3B82F6', icon: 'car' },
            { name: 'Vivienda', type: 'EXPENSE', color: '#8B5CF6', icon: 'home' },
            { name: 'Servicios', type: 'EXPENSE', color: '#EC4899', icon: 'zap' },
            { name: 'Entretenimiento', type: 'EXPENSE', color: '#EF4444', icon: 'film' },
            { name: 'Salud', type: 'EXPENSE', color: '#14B8A6', icon: 'heart' },
            { name: 'Educación', type: 'EXPENSE', color: '#6366F1', icon: 'book' },
            { name: 'Compras', type: 'EXPENSE', color: '#F97316', icon: 'shopping-bag' },
            { name: 'Otros Gastos', type: 'EXPENSE', color: '#6B7280', icon: 'more-horizontal' }
        ];

        await prisma.category.createMany({
            data: defaultCategories.map(cat => ({
                ...cat,
                userId,
                isDefault: true
            }))
        });
    }
}

module.exports = new AuthService();
