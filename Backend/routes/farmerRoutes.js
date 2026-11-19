const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const { getMyCrops, createCrop, updateCrop, deleteCrop } = require('../controllers/cropController');
const { getTransactions } = require('../controllers/transactionController');

const router = express.Router();

// Farmer crop management
router.get('/crops', protect, authorize('farmer', 'admin'), getMyCrops);
router.post('/crops', protect, authorize('farmer', 'admin'), createCrop);
router.put('/crops/:id', protect, authorize('farmer', 'admin'), updateCrop);
router.delete('/crops/:id', protect, authorize('farmer', 'admin'), deleteCrop);

// Farmer sales history
router.get('/transactions', protect, authorize('farmer', 'admin'), getTransactions);

module.exports = router;
