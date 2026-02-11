const express = require('express');
const budgetController = require('./BudgetController');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', (req, res, next) => budgetController.getAll(req, res, next));
router.get('/:id', (req, res, next) => budgetController.getById(req, res, next));
router.post('/', (req, res, next) => budgetController.create(req, res, next));
router.put('/:id', (req, res, next) => budgetController.update(req, res, next));
router.delete('/:id', (req, res, next) => budgetController.delete(req, res, next));

module.exports = router;
