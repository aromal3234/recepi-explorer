const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  recipeId: { type: String, required: true },
  name: { type: String },
  image: { type: String }, // Add image field
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
