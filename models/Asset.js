const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  // Asset identification
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    index: true
  },
  
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Asset classification
  assetClass: {
    type: String,
    enum: ['stock', 'crypto', 'bond', 'mutual_fund', 'etf', 'real_estate', 'commodity', 'cash', 'other'],
    required: true,
    index: true
  },
  
  subClass: {
    type: String,
    enum: [
      // Stocks
      'large_cap', 'mid_cap', 'small_cap', 'growth', 'value', 'dividend',
      // Crypto
      'bitcoin', 'altcoin', 'stablecoin', 'defi', 'nft',
      // Bonds
      'government', 'corporate', 'municipal', 'high_yield',
      // Real Estate
      'residential', 'commercial', 'reit',
      // Commodities
      'precious_metals', 'energy', 'agriculture',
      // Other
      'other'
    ]
  },
  
  // Market information
  exchange: {
    type: String,
    trim: true
  },
  
  currency: {
    type: String,
    default: 'USD',
    uppercase: true
  },
  
  country: {
    type: String,
    default: 'US'
  },
  
  sector: String,
  industry: String,
  
  // Current price data
  currentPrice: {
    price: {
      type: Number,
      default: 0
    },
    change: Number,
    changePercent: Number,
    previousClose: Number,
    open: Number,
    high: Number,
    low: Number,
    volume: Number,
    marketCap: Number,
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // Historical stats
  stats: {
    week52High: Number,
    week52Low: Number,
    avgVolume: Number,
    beta: Number,
    peRatio: Number,
    eps: Number,
    dividendYield: Number,
    dividendPerShare: Number,
    exDividendDate: Date
  },
  
  // Data source
  dataSource: {
    type: String,
    enum: ['alpha_vantage', 'coingecko', 'yahoo', 'manual', 'other'],
    default: 'manual'
  },
  
  externalId: String, // ID from external API
  
  // Display info
  logo: String,
  description: String,
  website: String,
  
  // Tracking
  isActive: {
    type: Boolean,
    default: true
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes
assetSchema.index({ symbol: 1, assetClass: 1 }, { unique: true });
assetSchema.index({ 'currentPrice.lastUpdated': 1 });

// Check if price is stale (older than 15 minutes)
assetSchema.methods.isPriceStale = function() {
  if (!this.currentPrice.lastUpdated) return true;
  const fifteenMinutes = 15 * 60 * 1000;
  return (Date.now() - this.currentPrice.lastUpdated) > fifteenMinutes;
};

// Update price
assetSchema.methods.updatePrice = function(priceData) {
  this.currentPrice = {
    ...this.currentPrice,
    ...priceData,
    lastUpdated: new Date()
  };
};

// Get price change color
assetSchema.methods.getPriceChangeColor = function() {
  if (!this.currentPrice.change) return 'neutral';
  return this.currentPrice.change >= 0 ? 'positive' : 'negative';
};

// Static: Find by symbol and class
assetSchema.statics.findBySymbol = function(symbol, assetClass) {
  const query = { symbol: symbol.toUpperCase() };
  if (assetClass) query.assetClass = assetClass;
  return this.findOne(query);
};

// Static: Get or create asset
assetSchema.statics.getOrCreate = async function(symbol, assetClass, name) {
  let asset = await this.findOne({ symbol: symbol.toUpperCase(), assetClass });
  
  if (!asset) {
    asset = await this.create({
      symbol: symbol.toUpperCase(),
      assetClass,
      name: name || symbol
    });
  }
  
  return asset;
};

// Static: Search assets
assetSchema.statics.search = function(query, assetClass) {
  const searchQuery = {
    $or: [
      { symbol: { $regex: query, $options: 'i' } },
      { name: { $regex: query, $options: 'i' } }
    ],
    isActive: true
  };
  
  if (assetClass) {
    searchQuery.assetClass = assetClass;
  }
  
  return this.find(searchQuery).limit(20);
};

// Static: Get assets needing price update
assetSchema.statics.getNeedingPriceUpdate = function(minutes = 15) {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return this.find({
    isActive: true,
    $or: [
      { 'currentPrice.lastUpdated': { $lt: cutoff } },
      { 'currentPrice.lastUpdated': { $exists: false } }
    ]
  });
};

module.exports = mongoose.model('Asset', assetSchema);
