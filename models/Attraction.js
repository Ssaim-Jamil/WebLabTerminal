const mongoose = require('mongoose');

const attractionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  entryFee: {
    type: Number,
    required: true,
    min: 1, // Entry fee must be greater than 0
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5, // Rating can only be between 0 and 5
  },
});

module.exports = mongoose.model('Attraction', attractionSchema);
