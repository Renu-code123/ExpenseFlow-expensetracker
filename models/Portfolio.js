const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true
  },
  
  // Quantity held
  quantity: {
    type: Number,
    required: true,
    default: 0
  },
  
  // Cost basis tracking
  costBasis: {
    total: { type: Number, default: 0 },
    average: { type: Number, default: 0 },
    method: {
      type: String,
      enum: ['fifo', 'lifo', 'average'],
      default: 'average'
    }
  },
  
  // Tax lots for FIFO/LIFO
  taxLots: [{
    purchaseDate: Date,
    quantity: Number,
    costPerUnit: Number,
    totalCost: Number,
    remainingQuantity: Number
  }],
  
  // Current value (calculated)
  currentValue: {
    type: Number,
    default: 0
  },
  
  // Unrealized gain/loss
  unrealizedGain: {
    amount: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 }
  },
  
  // Realized gains (from sales)
  realizedGain: {
    shortTerm: { type: Number, default: 0 },
    longTerm: { type: Number, default: 0 }
  },
  
  // Target allocation
  targetAllocation: {
    type: Number,
    min: 0,
    max: 100
  },
  
  // Dividend info
  dividends: {
    totalReceived: { type: Number, default: 0 },
    lastDividendDate: Date,
    annualYield: Number
  },
  
  // Notes
  notes: String,
  
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const portfolioSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true,
    default: 'My Portfolio'
  },
  
  description: String,
  
  // Portfolio type
  type: {
    type: String,
    enum: ['investment', 'retirement', 'trading', 'savings', 'crypto', 'custom'],
    default: 'investment'
  },
  
  // Base currency
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  // Holdings
  holdings: [holdingSchema],
  
  // Cash balance
  cashBalance: {
    type: Number,
    default: 0
  },
  
  // Total values (calculated)
  totalValue: {
    type: Number,
    default: 0
  },
  
  totalCostBasis: {
    type: Number,
    default: 0
  },
  
  // Allocation breakdown
  allocation: {
    byAssetClass: {
      type: Map,
      of: Number
    },
    bySector: {
      type: Map,
      of: Number
    }
  },
  
  // Performance metrics
  performance: {
    totalReturn: { type: Number, default: 0 },
    totalReturnPercent: { type: Number, default: 0 },
    dayChange: { type: Number, default: 0 },
    dayChangePercent: { type: Number, default: 0 },
    weekChange: { type: Number, default: 0 },
    monthChange: { type: Number, default: 0 },
    yearChange: { type: Number, default: 0 },
    cagr: Number,
    sharpeRatio: Number,
    volatility: Number,
    beta: Number,
    maxDrawdown: Number,
    lastCalculated: Date
  },
  
  // Income tracking
  income: {
    totalDividends: { type: Number, default: 0 },
    totalInterest: { type: Number, default: 0 },
    ytdIncome: { type: Number, default: 0 }
  },
  
  // Realized gains
  realizedGains: {
    ytdShortTerm: { type: Number, default: 0 },
    ytdLongTerm: { type: Number, default: 0 },
    totalShortTerm: { type: Number, default: 0 },
    totalLongTerm: { type: Number, default: 0 }
  },
  
  // Target allocations
  targetAllocations: {
    stocks: { type: Number, default: 60 },
    bonds: { type: Number, default: 30 },
    cash: { type: Number, default: 10 },
    crypto: Number,
    realEstate: Number,
    commodities: Number,
    other: Number
  },
  
  // Rebalancing
  rebalancing: {
    enabled: { type: Boolean, default: false },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annually', 'threshold'],
      default: 'quarterly'
    },
    threshold: { type: Number, default: 5 }, // Percentage drift
    lastRebalanced: Date,
    nextRebalanceDate: Date
  },
  
  // Watchlist
  watchlist: [{
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'Asset' },
    addedAt: { type: Date, default: Date.now },
    targetPrice: Number,
    notes: String,
    alerts: [{
      type: { type: String, enum: ['above', 'below', 'percent_change'] },
      value: Number,
      triggered: { type: Boolean, default: false },
      triggeredAt: Date
    }]
  }],
  
  // Portfolio settings
  settings: {
    isDefault: { type: Boolean, default: false },
    privacy: { type: String, enum: ['private', 'shared'], default: 'private' },
    trackDividends: { type: Boolean, default: true },
    includeTaxes: { type: Boolean, default: false },
    costBasisMethod: {
      type: String,
      enum: ['fifo', 'lifo', 'average'],
      default: 'average'
    }
  },
  
  // Value snapshots for historical tracking
  snapshots: [{
    date: Date,
    totalValue: Number,
    totalCostBasis: Number,
    cashBalance: Number,
    holdings: [{
      asset: mongoose.Schema.Types.ObjectId,
      quantity: Number,
      value: Number
    }]
  }],
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
portfolioSchema.index({ user: 1, 'settings.isDefault': 1 });
portfolioSchema.index({ user: 1, name: 1 }, { unique: true });

// Calculate total value
portfolioSchema.methods.calculateTotalValue = async function() {
  await this.populate('holdings.asset');
  
  let totalValue = this.cashBalance;
  let totalCostBasis = 0;
  
  for (const holding of this.holdings) {
    if (holding.asset && holding.quantity > 0) {
      const price = holding.asset.currentPrice?.price || 0;
      holding.currentValue = holding.quantity * price;
      totalValue += holding.currentValue;
      totalCostBasis += holding.costBasis.total;
      
      // Calculate unrealized gain
      holding.unrealizedGain.amount = holding.currentValue - holding.costBasis.total;
      holding.unrealizedGain.percentage = holding.costBasis.total > 0 
        ? (holding.unrealizedGain.amount / holding.costBasis.total) * 100 
        : 0;
      
      holding.lastUpdated = new Date();
    }
  }
  
  this.totalValue = totalValue;
  this.totalCostBasis = totalCostBasis;
  this.performance.totalReturn = totalValue - totalCostBasis;
  this.performance.totalReturnPercent = totalCostBasis > 0 
    ? (this.performance.totalReturn / totalCostBasis) * 100 
    : 0;
  
  return { totalValue, totalCostBasis };
};

// Calculate allocation breakdown
portfolioSchema.methods.calculateAllocation = async function() {
  await this.populate('holdings.asset');
  
  const byAssetClass = new Map();
  const bySector = new Map();
  
  for (const holding of this.holdings) {
    if (holding.asset && holding.currentValue > 0) {
      const percentage = (holding.currentValue / this.totalValue) * 100;
      
      // By asset class
      const assetClass = holding.asset.assetClass;
      byAssetClass.set(assetClass, (byAssetClass.get(assetClass) || 0) + percentage);
      
      // By sector
      if (holding.asset.sector) {
        bySector.set(holding.asset.sector, (bySector.get(holding.asset.sector) || 0) + percentage);
      }
    }
  }
  
  // Add cash allocation
  if (this.cashBalance > 0 && this.totalValue > 0) {
    const cashPercent = (this.cashBalance / this.totalValue) * 100;
    byAssetClass.set('cash', cashPercent);
  }
  
  this.allocation.byAssetClass = byAssetClass;
  this.allocation.bySector = bySector;
  
  return { byAssetClass: Object.fromEntries(byAssetClass), bySector: Object.fromEntries(bySector) };
};

// Get rebalancing suggestions
portfolioSchema.methods.getRebalancingSuggestions = function() {
  const suggestions = [];
  const currentAllocation = Object.fromEntries(this.allocation.byAssetClass || new Map());
  
  const assetClassMapping = {
    stock: 'stocks',
    etf: 'stocks',
    mutual_fund: 'stocks',
    bond: 'bonds',
    crypto: 'crypto',
    real_estate: 'realEstate',
    commodity: 'commodities',
    cash: 'cash'
  };
  
  // Group current allocation by target categories
  const groupedAllocation = {};
  for (const [assetClass, percentage] of Object.entries(currentAllocation)) {
    const targetKey = assetClassMapping[assetClass] || 'other';
    groupedAllocation[targetKey] = (groupedAllocation[targetKey] || 0) + percentage;
  }
  
  // Compare with targets
  for (const [category, target] of Object.entries(this.targetAllocations.toObject ? 
    this.targetAllocations.toObject() : this.targetAllocations)) {
    if (target === undefined || target === null) continue;
    
    const current = groupedAllocation[category] || 0;
    const drift = current - target;
    
    if (Math.abs(drift) > this.rebalancing.threshold) {
      suggestions.push({
        category,
        currentAllocation: Math.round(current * 100) / 100,
        targetAllocation: target,
        drift: Math.round(drift * 100) / 100,
        action: drift > 0 ? 'sell' : 'buy',
        amountToRebalance: Math.abs(drift / 100) * this.totalValue
      });
    }
  }
  
  return suggestions.sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift));
};

// Add holding
portfolioSchema.methods.addHolding = async function(assetId, quantity, costPerUnit, purchaseDate) {
  let holding = this.holdings.find(h => h.asset.toString() === assetId.toString());
  
  const totalCost = quantity * costPerUnit;
  
  if (holding) {
    // Update existing holding
    const newTotalQuantity = holding.quantity + quantity;
    const newTotalCost = holding.costBasis.total + totalCost;
    
    holding.quantity = newTotalQuantity;
    holding.costBasis.total = newTotalCost;
    holding.costBasis.average = newTotalCost / newTotalQuantity;
    
    // Add tax lot
    holding.taxLots.push({
      purchaseDate: purchaseDate || new Date(),
      quantity,
      costPerUnit,
      totalCost,
      remainingQuantity: quantity
    });
  } else {
    // Create new holding
    this.holdings.push({
      asset: assetId,
      quantity,
      costBasis: {
        total: totalCost,
        average: costPerUnit,
        method: this.settings.costBasisMethod
      },
      taxLots: [{
        purchaseDate: purchaseDate || new Date(),
        quantity,
        costPerUnit,
        totalCost,
        remainingQuantity: quantity
      }]
    });
  }
  
  return this;
};

// Remove holding (sell)
portfolioSchema.methods.removeHolding = function(assetId, quantity, salePrice) {
  const holding = this.holdings.find(h => h.asset.toString() === assetId.toString());
  if (!holding) throw new Error('Holding not found');
  if (holding.quantity < quantity) throw new Error('Insufficient quantity');
  
  let realizedGain = 0;
  let costBasisUsed = 0;
  let remainingToSell = quantity;
  const now = new Date();
  const oneYearAgo = new Date(now.setFullYear(now.getFullYear() - 1));
  
  const method = holding.costBasis.method;
  const lots = method === 'lifo' 
    ? [...holding.taxLots].reverse() 
    : holding.taxLots;
  
  for (const lot of lots) {
    if (remainingToSell <= 0) break;
    if (lot.remainingQuantity <= 0) continue;
    
    const sellFromLot = Math.min(lot.remainingQuantity, remainingToSell);
    const lotCostBasis = sellFromLot * lot.costPerUnit;
    const lotProceeds = sellFromLot * salePrice;
    const lotGain = lotProceeds - lotCostBasis;
    
    costBasisUsed += lotCostBasis;
    realizedGain += lotGain;
    
    // Determine if short-term or long-term gain
    const isLongTerm = lot.purchaseDate < oneYearAgo;
    if (isLongTerm) {
      holding.realizedGain.longTerm += lotGain;
      this.realizedGains.ytdLongTerm += lotGain;
      this.realizedGains.totalLongTerm += lotGain;
    } else {
      holding.realizedGain.shortTerm += lotGain;
      this.realizedGains.ytdShortTerm += lotGain;
      this.realizedGains.totalShortTerm += lotGain;
    }
    
    lot.remainingQuantity -= sellFromLot;
    remainingToSell -= sellFromLot;
  }
  
  // Update holding
  holding.quantity -= quantity;
  holding.costBasis.total -= costBasisUsed;
  
  if (holding.quantity > 0) {
    holding.costBasis.average = holding.costBasis.total / holding.quantity;
  } else {
    // Remove empty holding
    this.holdings = this.holdings.filter(h => h.asset.toString() !== assetId.toString());
  }
  
  // Clean up empty tax lots
  holding.taxLots = holding.taxLots.filter(lot => lot.remainingQuantity > 0);
  
  return { realizedGain, costBasisUsed };
};

// Take snapshot
portfolioSchema.methods.takeSnapshot = function() {
  const snapshot = {
    date: new Date(),
    totalValue: this.totalValue,
    totalCostBasis: this.totalCostBasis,
    cashBalance: this.cashBalance,
    holdings: this.holdings.map(h => ({
      asset: h.asset,
      quantity: h.quantity,
      value: h.currentValue
    }))
  };
  
  this.snapshots.push(snapshot);
  
  // Keep last 365 days of daily snapshots
  if (this.snapshots.length > 365) {
    this.snapshots = this.snapshots.slice(-365);
  }
  
  return snapshot;
};

// Static: Get user's default portfolio
portfolioSchema.statics.getDefault = async function(userId) {
  let portfolio = await this.findOne({ user: userId, 'settings.isDefault': true });
  
  if (!portfolio) {
    portfolio = await this.findOne({ user: userId });
  }
  
  if (!portfolio) {
    portfolio = await this.create({
      user: userId,
      name: 'My Portfolio',
      'settings.isDefault': true
    });
  }
  
  return portfolio;
};

// Static: Get net worth
portfolioSchema.statics.getNetWorth = async function(userId) {
  const portfolios = await this.find({ user: userId });
  
  let totalAssets = 0;
  let totalInvested = 0;
  
  for (const portfolio of portfolios) {
    totalAssets += portfolio.totalValue;
    totalInvested += portfolio.totalCostBasis;
  }
  
  return {
    totalAssets,
    totalInvested,
    totalGain: totalAssets - totalInvested,
    portfolioCount: portfolios.length
  };
};

module.exports = mongoose.model('Portfolio', portfolioSchema);
