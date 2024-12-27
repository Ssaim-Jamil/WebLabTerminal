const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  attraction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Attraction', // Reference to the Attraction model
    required: true,
  },
  visitor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visitor', // Reference to the Visitor model
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 1,
    max: 5, // Score must be between 1 and 5
  },
  comment: {
    type: String,
    default: '', // Optional comment
  },
});

module.exports = mongoose.model('Review', reviewSchema);
