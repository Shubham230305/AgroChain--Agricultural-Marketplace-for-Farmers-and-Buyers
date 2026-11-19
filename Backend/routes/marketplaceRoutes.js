const express = require('express');
const {
  getCrops,
  getMyCrops,
  getCrop,
  createCrop,
  updateCrop,
  deleteCrop
} = require('../controllers/cropController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public marketplace crop listings
router.get('/crops', getCrops);

// Farmer's own crops
router.get('/my-crops', protect, authorize('farmer', 'admin'), getMyCrops);

// Single crop operations
router.get('/crops/:id', getCrop);
router.post('/crops', protect, authorize('farmer', 'admin'), createCrop);
router.put('/crops/:id', protect, authorize('farmer', 'admin'), updateCrop);
router.delete('/crops/:id', protect, authorize('farmer', 'admin'), deleteCrop);

module.exports = router;
