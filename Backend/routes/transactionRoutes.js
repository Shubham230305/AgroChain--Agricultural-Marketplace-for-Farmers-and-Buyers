const express = require('express');
const {
  createTransaction,
  getTransactions,
  getTransaction
} = require('../controllers/transactionController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('buyer', 'admin'), createTransaction);
router.post('/purchase', protect, authorize('buyer', 'admin'), createTransaction);
router.get('/', protect, getTransactions);
router.get('/:id', protect, getTransaction);

module.exports = router;
