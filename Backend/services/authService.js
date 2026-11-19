const User = require('../models/User');

class AuthService {
  /**
   * Register a new user
   * @param {Object} userData - { name, email, phone, password, role, location }
   * @returns {Promise<Object>} Created user
   */
  async registerUser(userData) {
    const { name, email, phone, password, role, location } = userData;

    // Validate required fields
    if (!name || !email || !password) {
      const error = new Error('Please provide name, email and password');
      error.statusCode = 400;
      throw error;
    }

    if (password.length < 6) {
      const error = new Error('Password must be at least 6 characters long');
      error.statusCode = 400;
      throw error;
    }

    // Role check: only allow 'farmer' or 'buyer' via registration
    const userRole = (role && (role.toLowerCase() === 'farmer' || role.toLowerCase() === 'buyer'))
      ? role.toLowerCase()
      : 'buyer';

    // Check if user already exists with this email
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      const error = new Error('An account with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    // Check phone if provided
    if (phone) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        const error = new Error('An account with this phone number already exists');
        error.statusCode = 409;
        throw error;
      }
    }

    // Create user in MongoDB
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : undefined,
      password,
      role: userRole,
      location: location ? location.trim() : ''
    });

    return user;
  }

  /**
   * Authenticate user with email/phone and password
   * @param {string} identifier - Email or phone
   * @param {string} password - Raw password
   * @returns {Promise<Object>} Authenticated user
   */
  async loginUser(identifier, password) {
    const cleanId = (identifier || '').trim();

    if (!cleanId || !password) {
      const error = new Error('Please provide email/phone and password');
      error.statusCode = 400;
      throw error;
    }

    // Find user by email or phone
    const user = await User.findOne({
      $or: [
        { email: cleanId.toLowerCase() },
        { phone: cleanId }
      ]
    }).select('+password');

    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Verify password with bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    return user;
  }

  /**
   * Retrieve user profile by ID
   * @param {string} userId
   * @returns {Promise<Object>} User profile
   */
  async getUserProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    return user;
  }

  /**
   * Update user profile information
   * @param {string} userId
   * @param {Object} updateData - { name, phone, location }
   * @returns {Promise<Object>} Updated user
   */
  async updateUserProfile(userId, { name, phone, location }) {
    const updates = {};
    if (name) updates.name = name.trim();
    if (phone) updates.phone = phone.trim();
    if (location !== undefined) updates.location = location.trim();

    const user = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    });

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    return user;
  }
}

module.exports = new AuthService();
