const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const visitorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true, // Email must be unique
    match: [/^\S+@\S+\.\S+$/, 'Invalid email format'], // Valid email format
  },
  password: {
    type: String,
    required: true,
  },
  visitedAttractions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Attraction', // Reference to the Attraction model
    },
  ],
});

// Hash password before saving
visitorSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

module.exports = mongoose.model('Visitor', visitorSchema);
