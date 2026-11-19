const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables (check root directory, fallback to Frontend/.env)
dotenv.config({ path: path.join(__dirname, '../.env') });
if (!process.env.PORT) {
  dotenv.config({ path: path.join(__dirname, '../Frontend/.env') });
}

// Route imports
const authRoutes = require('./routes/authRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const farmerRoutes = require('./routes/farmerRoutes');
const buyerRoutes = require('./routes/buyerRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 8000;

// Connect to MongoDB database
connectDB()
  .then(() => {
    console.log('MongoDB connection established successfully');
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
  });

// Global Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/payments', transactionRoutes); // Backwards compatibility for payment endpoints
app.use('/api/farmer', farmerRoutes);
app.use('/api/buyer', buyerRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'AgroChain API', timestamp: new Date() });
});

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../Frontend')));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` AgroChain Server running on port ${PORT}`);
  console.log(` Frontend: http://localhost:${PORT}`);
  console.log(` API Base: http://localhost:${PORT}/api`);
  console.log(` Architecture: Layered (Routes -> Controllers -> Services -> Models)`);
  console.log(`===============================================`);
});

module.exports = app;
