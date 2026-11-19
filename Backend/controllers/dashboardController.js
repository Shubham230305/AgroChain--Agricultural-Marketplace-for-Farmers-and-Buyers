const dashboardService = require('../services/dashboardService');

// @desc    Get real dashboard analytics and statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats(req.user);
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Server error retrieving dashboard statistics'
    });
  }
};
