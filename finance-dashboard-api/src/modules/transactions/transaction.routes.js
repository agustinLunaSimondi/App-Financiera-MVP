const express = require('express');
const transactionController = require('./TransactionController');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

router.get('/', (req, res, next) => transactionController.getAll(req, res, next));
router.get('/:id', (req, res, next) => transactionController.getById(req, res, next));
router.post('/', (req, res, next) => transactionController.create(req, res, next));
router.put('/:id', (req, res, next) => transactionController.update(req, res, next));
router.delete('/:id', (req, res, next) => transactionController.delete(req, res, next));

module.exports = router;
