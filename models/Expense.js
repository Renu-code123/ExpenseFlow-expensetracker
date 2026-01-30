const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  originalAmount: {
    type: Number,
    required: true,
    min: 0.01
  },
  originalCurrency: {
    type: String,
    required: true,
    default: 'INR',
    uppercase: true
  },
  convertedAmount: {
    type: Number,
    min: 0.01
  },
  convertedCurrency: {
    type: String,
    uppercase: true
  },
  exchangeRate: {
    type: Number,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other']
  },
  type: {
    type: String,
    required: true,
    enum: ['income', 'expense']
  },
  merchant: {
    type: String,
    trim: true,
    maxlength: 50,
    default: ''
  },
  date: {
    type: Date,
    default: Date.now
  },
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    default: null
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  syncedToAccounting: {
    type: Boolean,
    default: false
  },
  // Receipt OCR fields
  source: {
    type: String,
    enum: ['manual', 'receipt_scan', 'receipt_itemized', 'import', 'recurring', 'api'],
    default: 'manual'
  },
  receiptId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt',
    default: null
  },
  itemDetails: {
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: {
      type: Number
    },
    receiptItemIndex: {
      type: Number
    }
  }
}, {
  timestamps: true
});

// Indexes for performance optimization
expenseSchema.index({ user: 1, date: -1 });
expenseSchema.index({ workspace: 1, date: -1 });
expenseSchema.index({ user: 1, type: 1, date: -1 });
expenseSchema.index({ workspace: 1, type: 1, date: -1 });
expenseSchema.index({ user: 1, category: 1, date: -1 });
expenseSchema.index({ workspace: 1, category: 1, date: -1 });
expenseSchema.index({ receiptId: 1 });
expenseSchema.index({ source: 1, user: 1 });

module.exports = mongoose.model('Expense', expenseSchema);