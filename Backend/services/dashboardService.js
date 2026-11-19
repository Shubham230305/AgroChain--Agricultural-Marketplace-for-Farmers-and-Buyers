const Crop = require('../models/Crop');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

class DashboardService {
  /**
   * Calculate live analytics and statistics based on user role
   * @param {Object} user - { _id, id, role }
   * @returns {Promise<Object>} Statistics object
   */
  async getDashboardStats(user) {
    const role = user.role;
    const userId = user._id || user.id;

    if (role === 'farmer') {
      const totalCrops = await Crop.countDocuments({ farmer: userId });
      const availableCrops = await Crop.countDocuments({ farmer: userId, status: 'available' });
      const soldCrops = await Crop.countDocuments({ farmer: userId, status: 'sold' });

      // Transactions where farmer sold crops
      const sales = await Transaction.find({ farmer: userId });
      const totalSales = sales.length;
      const totalRevenue = sales.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

      // Recent 5 sales
      const recentSales = await Transaction.find({ farmer: userId })
        .populate('crop', 'name unit price')
        .populate('buyer', 'name email phone')
        .sort('-createdAt')
        .limit(5);

      return {
        totalCrops,
        availableCrops,
        soldCrops,
        totalSales,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        recentSales
      };
    }

    if (role === 'buyer') {
      const purchases = await Transaction.find({ buyer: userId });
      const totalPurchases = purchases.length;
      const totalSpent = purchases.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
      const availableMarketCrops = await Crop.countDocuments({ status: 'available' });

      // Recent 5 purchases
      const recentPurchases = await Transaction.find({ buyer: userId })
        .populate('crop', 'name unit price location')
        .populate('farmer', 'name email phone location')
        .sort('-createdAt')
        .limit(5);

      return {
        totalPurchases,
        totalSpent: parseFloat(totalSpent.toFixed(2)),
        availableMarketCrops,
        recentPurchases
      };
    }

    // Admin overview
    const totalUsers = await User.countDocuments();
    const totalFarmers = await User.countDocuments({ role: 'farmer' });
    const totalBuyers = await User.countDocuments({ role: 'buyer' });
    const totalCrops = await Crop.countDocuments();
    const availableCrops = await Crop.countDocuments({ status: 'available' });
    const allTransactions = await Transaction.find();
    const totalTransactions = allTransactions.length;
    const totalVolume = allTransactions.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

    return {
      totalUsers,
      totalFarmers,
      totalBuyers,
      totalCrops,
      availableCrops,
      totalTransactions,
      totalVolume: parseFloat(totalVolume.toFixed(2))
    };
  }
}

module.exports = new DashboardService();
