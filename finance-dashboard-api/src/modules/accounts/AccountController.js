const BaseController = require('../../common/BaseController');
const accountService = require('./AccountService');

/**
 * Controlador para rutas de cuentas
 */
class AccountController extends BaseController {
    /**
     * GET /api/accounts
     */
    async getAll(req, res, next) {
        try {
            const accounts = await accountService.getAll(req.user.id);
            return this.ok(res, accounts);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/accounts/:id
     */
    async getById(req, res, next) {
        try {
            const account = await accountService.getById(req.params.id, req.user.id);
            return this.ok(res, account);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/accounts
     */
    async create(req, res, next) {
        try {
            const account = await accountService.create(req.user.id, req.body);
            return this.created(res, account);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/accounts/:id
     */
    async update(req, res, next) {
        try {
            const account = await accountService.update(req.params.id, req.user.id, req.body);
            return this.ok(res, account);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/accounts/:id
     */
    async delete(req, res, next) {
        try {
            await accountService.delete(req.params.id, req.user.id);
            return this.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AccountController();
