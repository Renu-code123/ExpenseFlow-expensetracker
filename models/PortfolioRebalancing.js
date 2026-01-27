const mongoose = require('mongoose');

// Target Allocation Schema
const targetAllocationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    default: 'Default Allocation Strategy'
  },
  
  description: String,
  
  // Allocation targets
  allocations: [{
    assetType: {
      type: String,
      enum: ['stock', 'crypto', 'bond', 'mutual_fund', 'etf', 'real_estate', 'commodity', 'cash'],
      required: true
    },
    targetPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    toleranceBand: {
      type: Number,
      default: 5, // ±5% tolerance
      min: 0,
      max: 20
    }
  }],
  
  // Specific asset allocations (optional)
  specificAssets: [{
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    },
    symbol: String,
    name: String,
    targetPercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    }
  }],
  
  // Rebalancing preferences
  rebalancingSettings: {
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi-annually', 'annually', 'threshold-based', 'manual'],
      default: 'quarterly'
    },
    
    // Next scheduled rebalance
    nextRebalanceDate: Date,
    
    // Automatic rebalancing
    autoRebalance: {
      type: Boolean,
      default: false
    },
    
    // Minimum trade amount (to avoid tiny trades)
    minTradeAmount: {
      type: Number,
      default: 100
    },
    
    // Consider tax implications
    taxOptimized: {
      type: Boolean,
      default: true
    },
    
    // Use cash flow for rebalancing
    useCashFlow: {
      type: Boolean,
      default: true
    }
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Rebalancing History Schema
const rebalancingHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true,
    index: true
  },
  
  targetAllocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TargetAllocation'
  },
  
  // Type of rebalancing
  type: {
    type: String,
    enum: ['automatic', 'manual', 'threshold', 'scheduled'],
    default: 'manual'
  },
  
  // Status
  status: {
    type: String,
    enum: ['proposed', 'approved', 'executed', 'cancelled'],
    default: 'proposed'
  },
  
  // Pre-rebalancing state
  preRebalance: {
    totalValue: Number,
    allocations: [{
      assetType: String,
      symbol: String,
      name: String,
      currentValue: Number,
      currentPercentage: Number,
      targetPercentage: Number,
      deviation: Number
    }]
  },
  
  // Recommended trades
  recommendedTrades: [{
    action: {
      type: String,
      enum: ['buy', 'sell', 'hold'],
      required: true
    },
    asset: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Asset'
    },
    symbol: String,
    name: String,
    assetType: String,
    
    currentShares: Number,
    targetShares: Number,
    sharesToTrade: Number,
    
    currentValue: Number,
    tradeValue: Number,
    estimatedPrice: Number,
    
    // Cost analysis
    estimatedFees: {
      tradingFee: { type: Number, default: 0 },
      exchangeFee: { type: Number, default: 0 },
      totalFees: { type: Number, default: 0 }
    },
    
    // Tax implications
    taxImpact: {
      capitalGain: { type: Number, default: 0 },
      holdingPeriod: String, // 'short-term' or 'long-term'
      estimatedTax: { type: Number, default: 0 }
    },
    
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium'
    },
    
    executed: {
      type: Boolean,
      default: false
    },
    executedAt: Date,
    actualPrice: Number,
    actualFees: Number
  }],
  
  // Post-rebalancing state (if executed)
  postRebalance: {
    totalValue: Number,
    allocations: [{
      assetType: String,
      symbol: String,
      name: String,
      currentValue: Number,
      currentPercentage: Number,
      targetPercentage: Number,
      deviation: Number
    }]
  },
  
  // Summary
  summary: {
    totalTrades: Number,
    totalBuyValue: Number,
    totalSellValue: Number,
    totalFees: Number,
    totalTaxImpact: Number,
    netCost: Number,
    deviationImprovement: Number // how much closer to target
  },
  
  // Analysis notes
  notes: String,
  
  // Timestamps
  proposedAt: {
    type: Date,
    default: Date.now
  },
  
  approvedAt: Date,
  executedAt: Date,
  cancelledAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Rebalancing Alert Schema
const rebalancingAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  portfolio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
    required: true
  },
  
  targetAllocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TargetAllocation'
  },
  
  alertType: {
    type: String,
    enum: ['scheduled', 'threshold-exceeded', 'opportunity'],
    required: true
  },
  
  message: {
    type: String,
    required: true
  },
  
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info'
  },
  
  details: {
    maxDeviation: Number,
    affectedAssets: [String],
    estimatedCost: Number
  },
  
  read: {
    type: Boolean,
    default: false
  },
  
  dismissed: {
    type: Boolean,
    default: false
  },
  
  actionTaken: {
    type: Boolean,
    default: false
  },
  
  rebalancingHistory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RebalancingHistory'
  },
  
  expiresAt: Date,
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes
targetAllocationSchema.index({ user: 1, portfolio: 1, isActive: 1 });
rebalancingHistorySchema.index({ user: 1, portfolio: 1, createdAt: -1 });
rebalancingHistorySchema.index({ status: 1, createdAt: -1 });
rebalancingAlertSchema.index({ user: 1, read: 1, dismissed: 1 });
rebalancingAlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware
targetAllocationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Validate total allocation percentage
  const totalPercentage = this.allocations.reduce((sum, alloc) => sum + alloc.targetPercentage, 0);
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return next(new Error('Total target allocation must equal 100%'));
  }
  
  // Set next rebalance date if frequency is set
  if (this.rebalancingSettings.frequency !== 'manual' && !this.nextRebalanceDate) {
    this.nextRebalanceDate = calculateNextRebalanceDate(this.rebalancingSettings.frequency);
  }
  
  next();
});

function calculateNextRebalanceDate(frequency) {
  const now = new Date();
  const next = new Date(now);
  
  switch (frequency) {
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'semi-annually':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'annually':
      next.setFullYear(next.getFullYear() + 1);
      break;
    default:
      return null;
  }
  
  return next;
}

// Instance methods
targetAllocationSchema.methods.updateNextRebalanceDate = function() {
  if (this.rebalancingSettings.frequency !== 'manual') {
    this.nextRebalanceDate = calculateNextRebalanceDate(this.rebalancingSettings.frequency);
  }
  return this.save();
};

// Models
const TargetAllocation = mongoose.model('TargetAllocation', targetAllocationSchema);
const RebalancingHistory = mongoose.model('RebalancingHistory', rebalancingHistorySchema);
const RebalancingAlert = mongoose.model('RebalancingAlert', rebalancingAlertSchema);

module.exports = {
  TargetAllocation,
  RebalancingHistory,
  RebalancingAlert
};
