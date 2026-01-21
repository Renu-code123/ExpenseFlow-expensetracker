const mongoose = require('mongoose');

const searchQuerySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  query: {
    type: String,
    required: true,
    trim: true
  },
  filters: {
    dateRange: {
      start: Date,
      end: Date
    },
    amountRange: {
      min: Number,
      max: Number
    },
    categories: [String],
    tags: [String]
  },
  name: {
    type: String,
    trim: true
  },
  isSaved: {
    type: Boolean,
    default: false
  },
  executionCount: {
    type: Number,
    default: 1
  },
  lastExecuted: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

searchQuerySchema.index({ userId: 1, query: 'text' });
searchQuerySchema.index({ userId: 1, isSaved: 1 });
searchQuerySchema.index({ executionCount: -1 });

module.exports = mongoose.model('SearchQuery', searchQuerySchema);