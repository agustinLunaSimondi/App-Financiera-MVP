const BaseController = require('../../common/BaseController');
const transactionService = require('./TransactionService');

/**
 * Controlador para rutas de transacciones
 */
class TransactionController extends BaseController {
    /**
     * GET /api/transactions
     */
    async getAll(req, res, next) {
        try {
            const result = await transactionService.getAll(req.user.id, req.query);
            return this.ok(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/transactions/:id
     */
    async getById(req, res, next) {
        try {
            const transaction = await transactionService.getById(req.params.id, req.user.id);
            return this.ok(res, transaction);
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/transactions
     */
    async create(req, res, next) {
        try {
            const transaction = await transactionService.create(req.user.id, req.body);
            return this.created(res, transaction);
        } catch (error) {
            next(error);
        }
    }

    /**
     * PUT /api/transactions/:id
     */
    async update(req, res, next) {
        try {
            const transaction = await transactionService.update(req.params.id, req.user.id, req.body);
            return this.ok(res, transaction);
        } catch (error) {
            next(error);
        }
    }

    /**
     * DELETE /api/transactions/:id
     */
    async delete(req, res, next) {
        try {
            await transactionService.delete(req.params.id, req.user.id);
            return this.noContent(res);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new TransactionController();
