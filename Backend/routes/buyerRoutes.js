const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getCrops, getCrop } = require('../controllers/cropController');
const { createTransaction, getTransactions } = require('../controllers/transactionController');

const router = express.Router();

// Buyer marketplace view
router.get('/marketplace', getCrops);
router.get('/marketplace/:id', getCrop);

// Buyer purchases
router.post('/purchase', protect, authorize('buyer', 'admin'), createTransaction);
router.get('/transactions', protect, authorize('buyer', 'admin'), getTransactions);

module.exports = router;
