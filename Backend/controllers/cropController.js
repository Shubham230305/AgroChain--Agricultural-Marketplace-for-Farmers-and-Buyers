const cropService = require('../services/cropService');

// @desc    Get all available crops for marketplace
// @route   GET /api/marketplace/crops
// @access  Public
exports.getCrops = async (req, res) => {
  try {
    const crops = await cropService.getMarketplaceCrops(req.query);
    res.status(200).json({
      success: true,
      count: crops.length,
      crops
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error retrieving crops'
    });
  }
};

// @desc    Get farmer's own crops
// @route   GET /api/marketplace/my-crops
// @access  Private (Farmer/Admin)
exports.getMyCrops = async (req, res) => {
  try {
    const crops = await cropService.getFarmerCrops(req.user.id);
    res.status(200).json({
      success: true,
      count: crops.length,
      crops
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error retrieving your crops'
    });
  }
};

// @desc    Get single crop by ID
// @route   GET /api/marketplace/crops/:id
// @access  Public
exports.getCrop = async (req, res) => {
  try {
    const crop = await cropService.getCropById(req.params.id);
    res.status(200).json({
      success: true,
      crop
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error retrieving crop'
    });
  }
};

// @desc    Create new crop listing
// @route   POST /api/marketplace/crops
// @access  Private (Farmer / Admin)
exports.createCrop = async (req, res) => {
  try {
    const crop = await cropService.createCrop(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Crop listed successfully',
      crop
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error creating crop listing'
    });
  }
};

// @desc    Update crop listing
// @route   PUT /api/marketplace/crops/:id
// @access  Private (Owner Farmer / Admin)
exports.updateCrop = async (req, res) => {
  try {
    const crop = await cropService.updateCrop(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body
    );
    res.status(200).json({
      success: true,
      message: 'Crop updated successfully',
      crop
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error updating crop'
    });
  }
};

// @desc    Delete crop listing
// @route   DELETE /api/marketplace/crops/:id
// @access  Private (Owner Farmer / Admin)
exports.deleteCrop = async (req, res) => {
  try {
    await cropService.deleteCrop(req.params.id, req.user.id, req.user.role);
    res.status(200).json({
      success: true,
      message: 'Crop listing deleted successfully'
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error deleting crop'
    });
  }
};
