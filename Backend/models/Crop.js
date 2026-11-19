const mongoose = require('mongoose');

const CropSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a crop name'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  quantity: {
    type: Number,
    required: [true, 'Please add quantity'],
    min: [0, 'Quantity cannot be negative']
  },
  unit: {
    type: String,
    required: [true, 'Please specify unit'],
    enum: ['kg', 'quintal', 'ton', 'piece', 'dozen', 'box'],
    default: 'kg'
  },
  price: {
    type: Number,
    required: [true, 'Please add price per unit'],
    min: [0.01, 'Price must be greater than zero']
  },
  location: {
    type: String,
    required: [true, 'Please add location'],
    trim: true
  },
  harvestDate: {
    type: Date,
    default: Date.now
  },
  quality: {
    type: String,
    enum: ['premium', 'standard', 'economy', 'A', 'B', 'C'],
    default: 'standard'
  },
  organic: {
    type: Boolean,
    default: false
  },
  farmer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['available', 'sold', 'inactive'],
    default: 'available'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Crop', CropSchema);
