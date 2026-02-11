const BaseController = require('../../common/BaseController');
const authService = require('./AuthService');

/**
 * Controlador para rutas de autenticación
 */
class AuthController extends BaseController {
    /**
     * POST /api/auth/register
     */
    async register(req, res, next) {
        try {
            const result = await authService.register(req.body);
            return this.created(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            return this.ok(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/auth/me
     */
    async getProfile(req, res, next) {
        try {
            const user = await authService.getProfile(req.user.id);
            return this.ok(res, user);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/auth/me
     */
    async updateProfile(req, res, next) {
        try {
            const user = await authService.updateProfile(req.user.id, req.body);
            return this.ok(res, user);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/auth/me
     */
    async deleteAccount(req, res, next) {
        try {
            await authService.deleteAccount(req.user.id);
            return this.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();
