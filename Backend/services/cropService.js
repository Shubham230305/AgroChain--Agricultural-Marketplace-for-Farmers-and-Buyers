const Crop = require('../models/Crop');

class CropService {
  /**
   * Query all available crops for the marketplace with optional search/filters
   * @param {Object} filters - { search, organic, unit, quality }
   * @returns {Promise<Array>} List of available crops
   */
  async getMarketplaceCrops(filters = {}) {
    const { search, organic, unit, quality } = filters;
    const query = { status: 'available' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (organic !== undefined && organic !== '') {
      query.organic = organic === 'true' || organic === true;
    }

    if (unit) {
      query.unit = unit;
    }

    if (quality) {
      query.quality = quality;
    }

    return await Crop.find(query)
      .populate('farmer', 'name email phone location')
      .sort('-createdAt');
  }

  /**
   * Get crops listed by a specific farmer
   * @param {string} farmerId
   * @returns {Promise<Array>}
   */
  async getFarmerCrops(farmerId) {
    return await Crop.find({ farmer: farmerId }).sort('-createdAt');
  }

  /**
   * Get single crop by ID
   * @param {string} cropId
   * @returns {Promise<Object>}
   */
  async getCropById(cropId) {
    const crop = await Crop.findById(cropId).populate('farmer', 'name email phone location');
    if (!crop) {
      const error = new Error('Crop not found');
      error.statusCode = 404;
      throw error;
    }
    return crop;
  }

  /**
   * List a new crop
   * @param {string} farmerId
   * @param {Object} cropData
   * @returns {Promise<Object>}
   */
  async createCrop(farmerId, cropData) {
    const { name, description, quantity, unit, price, location, harvestDate, quality, organic } = cropData;

    if (!name || quantity === undefined || price === undefined || !location) {
      const error = new Error('Please provide crop name, quantity, price and location');
      error.statusCode = 400;
      throw error;
    }

    const numericQuantity = parseFloat(quantity);
    const numericPrice = parseFloat(price);

    if (isNaN(numericQuantity) || numericQuantity <= 0) {
      const error = new Error('Quantity must be a positive number');
      error.statusCode = 400;
      throw error;
    }

    if (isNaN(numericPrice) || numericPrice <= 0) {
      const error = new Error('Price must be a positive number');
      error.statusCode = 400;
      throw error;
    }

    return await Crop.create({
      name: name.trim(),
      description: (description || '').trim(),
      quantity: numericQuantity,
      unit: unit || 'kg',
      price: numericPrice,
      location: location.trim(),
      harvestDate: harvestDate || Date.now(),
      quality: quality || 'standard',
      organic: organic === true || organic === 'true',
      farmer: farmerId,
      status: 'available'
    });
  }

  /**
   * Update an existing crop listing with ownership validation
   * @param {string} cropId
   * @param {string} userId
   * @param {string} userRole
   * @param {Object} updateData
   * @returns {Promise<Object>}
   */
  async updateCrop(cropId, userId, userRole, updateData) {
    let crop = await Crop.findById(cropId);

    if (!crop) {
      const error = new Error('Crop not found');
      error.statusCode = 404;
      throw error;
    }

    // Ownership authorization check
    if (crop.farmer.toString() !== userId.toString() && userRole !== 'admin') {
      const error = new Error('Not authorized to update this crop listing');
      error.statusCode = 403;
      throw error;
    }

    const { name, description, quantity, unit, price, location, quality, organic, status } = updateData;
    const updates = {};

    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description.trim();
    if (quantity !== undefined) {
      const q = parseFloat(quantity);
      if (isNaN(q) || q < 0) {
        const error = new Error('Invalid quantity');
        error.statusCode = 400;
        throw error;
      }
      updates.quantity = q;
      if (q === 0 && !status) updates.status = 'sold';
    }
    if (unit) updates.unit = unit;
    if (price !== undefined) {
      const p = parseFloat(price);
      if (isNaN(p) || p <= 0) {
        const error = new Error('Price must be greater than zero');
        error.statusCode = 400;
        throw error;
      }
      updates.price = p;
    }
    if (location) updates.location = location.trim();
    if (quality) updates.quality = quality;
    if (organic !== undefined) updates.organic = organic === true || organic === 'true';
    if (status && ['available', 'sold', 'inactive'].includes(status)) {
      updates.status = status;
    }

    return await Crop.findByIdAndUpdate(cropId, updates, {
      new: true,
      runValidators: true
    }).populate('farmer', 'name email phone location');
  }

  /**
   * Delete a crop listing with ownership validation
   * @param {string} cropId
   * @param {string} userId
   * @param {string} userRole
   * @returns {Promise<boolean>}
   */
  async deleteCrop(cropId, userId, userRole) {
    const crop = await Crop.findById(cropId);

    if (!crop) {
      const error = new Error('Crop not found');
      error.statusCode = 404;
      throw error;
    }

    // Ownership authorization check
    if (crop.farmer.toString() !== userId.toString() && userRole !== 'admin') {
      const error = new Error('Not authorized to delete this crop');
      error.statusCode = 403;
      throw error;
    }

    await Crop.findByIdAndDelete(cropId);
    return true;
  }
}

module.exports = new CropService();
