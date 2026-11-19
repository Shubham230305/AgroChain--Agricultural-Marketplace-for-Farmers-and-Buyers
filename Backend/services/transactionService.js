const Transaction = require('../models/Transaction');
const Crop = require('../models/Crop');

class TransactionService {
  /**
   * Process a crop purchase transaction with stock validation and atomic deduction
   * @param {string} buyerId
   * @param {Object} purchaseData - { cropId, quantity, paymentMethod }
   * @returns {Promise<Object>} Populated transaction record
   */
  async createPurchase(buyerId, purchaseData) {
    const { cropId, quantity, paymentMethod } = purchaseData;

    if (!cropId || quantity === undefined) {
      const error = new Error('Please provide cropId and quantity');
      error.statusCode = 400;
      throw error;
    }

    const purchaseQuantity = parseFloat(quantity);
    if (isNaN(purchaseQuantity) || purchaseQuantity <= 0) {
      const error = new Error('Quantity must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    // Find the crop
    const crop = await Crop.findById(cropId);
    if (!crop) {
      const error = new Error('Crop not found');
      error.statusCode = 404;
      throw error;
    }

    // Check availability
    if (crop.status !== 'available' || crop.quantity <= 0) {
      const error = new Error('This crop is currently not available for purchase');
      error.statusCode = 400;
      throw error;
    }

    // Prevent farmer from purchasing their own crop
    if (crop.farmer.toString() === buyerId.toString()) {
      const error = new Error('Farmers cannot purchase their own listed crops');
      error.statusCode = 400;
      throw error;
    }

    // Check available quantity
    if (purchaseQuantity > crop.quantity) {
      const error = new Error(`Requested quantity (${purchaseQuantity} ${crop.unit}) exceeds available stock (${crop.quantity} ${crop.unit})`);
      error.statusCode = 400;
      throw error;
    }

    // Calculate total price from actual DB price
    const totalAmount = parseFloat((crop.price * purchaseQuantity).toFixed(2));

    // Deduct quantity from crop
    crop.quantity -= purchaseQuantity;
    if (crop.quantity === 0) {
      crop.status = 'sold';
    }
    await crop.save();

    // Create transaction record
    const transaction = await Transaction.create({
      buyer: buyerId,
      farmer: crop.farmer,
      crop: crop._id,
      quantity: purchaseQuantity,
      unitPrice: crop.price,
      totalAmount,
      status: 'completed',
      paymentMethod: paymentMethod || 'marketplace_direct'
    });

    return await Transaction.findById(transaction._id)
      .populate('crop', 'name unit price location')
      .populate('farmer', 'name email phone location')
      .populate('buyer', 'name email phone');
  }

  /**
   * Get transactions for authenticated user based on role
   * @param {Object} user - { _id, id, role }
   * @returns {Promise<Array>} List of transactions
   */
  async getUserTransactions(user) {
    let query = {};
    const userId = user._id || user.id;

    if (user.role === 'buyer') {
      query = { buyer: userId };
    } else if (user.role === 'farmer') {
      query = { farmer: userId };
    }
    // Admin sees all

    return await Transaction.find(query)
      .populate('crop', 'name unit price location')
      .populate('buyer', 'name email phone')
      .populate('farmer', 'name email phone location')
      .sort('-createdAt');
  }

  /**
   * Get single transaction details with role authorization
   * @param {string} transactionId
   * @param {Object} user - { _id, id, role }
   * @returns {Promise<Object>}
   */
  async getTransactionById(transactionId, user) {
    const transaction = await Transaction.findById(transactionId)
      .populate('crop', 'name unit price location quality organic')
      .populate('buyer', 'name email phone')
      .populate('farmer', 'name email phone location');

    if (!transaction) {
      const error = new Error('Transaction not found');
      error.statusCode = 404;
      throw error;
    }

    const userId = (user._id || user.id).toString();
    const isBuyer = transaction.buyer && transaction.buyer._id.toString() === userId;
    const isFarmer = transaction.farmer && transaction.farmer._id.toString() === userId;
    const isAdmin = user.role === 'admin';

    if (!isBuyer && !isFarmer && !isAdmin) {
      const error = new Error('Not authorized to view this transaction');
      error.statusCode = 403;
      throw error;
    }

    return transaction;
  }
}

module.exports = new TransactionService();
