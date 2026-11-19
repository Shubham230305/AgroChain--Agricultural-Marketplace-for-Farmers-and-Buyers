const transactionService = require('../services/transactionService');

// @desc    Create new marketplace purchase transaction
// @route   POST /api/transactions
// @access  Private (Buyer / Admin)
exports.createTransaction = async (req, res) => {
  try {
    const transaction = await transactionService.createPurchase(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      transaction
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error during transaction processing'
    });
  }
};

// @desc    Get transactions for authenticated user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await transactionService.getUserTransactions(req.user);
    res.status(200).json({
      success: true,
      count: transactions.length,
      transactions
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error retrieving transactions'
    });
  }
};

// @desc    Get single transaction details
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await transactionService.getTransactionById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      transaction
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error retrieving transaction'
    });
  }
};
