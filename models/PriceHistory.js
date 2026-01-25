const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  asset: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Asset',
    required: true,
    index: true
  },
  
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    index: true
  },
  
  // Price data
  date: {
    type: Date,
    required: true,
    index: true
  },
  
  open: {
    type: Number,
    required: true
  },
  
  high: {
    type: Number,
    required: true
  },
  
  low: {
    type: Number,
    required: true
  },
  
  close: {
    type: Number,
    required: true
  },
  
  adjustedClose: Number,
  
  volume: Number,
  
  // Change from previous close
  change: Number,
  changePercent: Number,
  
  // Time frame
  interval: {
    type: String,
    enum: ['1min', '5min', '15min', '30min', '1hour', '4hour', 'daily', 'weekly', 'monthly'],
    default: 'daily'
  },
  
  // Data source
  source: {
    type: String,
    enum: ['alpha_vantage', 'coingecko', 'yahoo', 'manual', 'other'],
    default: 'alpha_vantage'
  },
  
  // For crypto - additional metrics
  crypto: {
    marketCap: Number,
    totalVolume: Number,
    circulatingSupply: Number,
    totalSupply: Number
  },
  
  // Technical indicators (calculated)
  indicators: {
    sma20: Number,
    sma50: Number,
    sma200: Number,
    ema12: Number,
    ema26: Number,
    rsi14: Number,
    macd: Number,
    macdSignal: Number,
    macdHistogram: Number,
    bollingerUpper: Number,
    bollingerLower: Number,
    bollingerMiddle: Number
  },
  
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Compound indexes
priceHistorySchema.index({ asset: 1, date: -1, interval: 1 });
priceHistorySchema.index({ symbol: 1, date: -1, interval: 1 });
priceHistorySchema.index({ asset: 1, interval: 1, date: -1 }, { unique: true });

// Calculate change
priceHistorySchema.pre('save', async function(next) {
  if (this.isNew && !this.change) {
    // Get previous close
    const previous = await this.constructor.findOne({
      asset: this.asset,
      interval: this.interval,
      date: { $lt: this.date }
    }).sort({ date: -1 });
    
    if (previous) {
      this.change = this.close - previous.close;
      this.changePercent = (this.change / previous.close) * 100;
    }
  }
  next();
});

// Get OHLC data
priceHistorySchema.methods.getOHLC = function() {
  return {
    date: this.date,
    open: this.open,
    high: this.high,
    low: this.low,
    close: this.close,
    volume: this.volume
  };
};

// Static: Get price history for charting
priceHistorySchema.statics.getChartData = async function(assetId, options = {}) {
  const { interval = 'daily', days = 365, startDate, endDate } = options;
  
  const query = { asset: assetId, interval };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  } else if (days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    query.date = { $gte: cutoff };
  }
  
  const history = await this.find(query)
    .sort({ date: 1 })
    .select('date open high low close volume change changePercent')
    .lean();
  
  return history;
};

// Static: Get latest price
priceHistorySchema.statics.getLatestPrice = async function(assetId) {
  return this.findOne({ asset: assetId })
    .sort({ date: -1 })
    .select('close date change changePercent')
    .lean();
};

// Static: Calculate returns
priceHistorySchema.statics.calculateReturns = async function(assetId, periods = [7, 30, 90, 365]) {
  const latest = await this.findOne({ asset: assetId, interval: 'daily' })
    .sort({ date: -1 });
  
  if (!latest) return null;
  
  const returns = {};
  
  for (const days of periods) {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    
    const pastPrice = await this.findOne({
      asset: assetId,
      interval: 'daily',
      date: { $lte: pastDate }
    }).sort({ date: -1 });
    
    if (pastPrice) {
      const returnPct = ((latest.close - pastPrice.close) / pastPrice.close) * 100;
      returns[`${days}d`] = Math.round(returnPct * 100) / 100;
    }
  }
  
  return returns;
};

// Static: Calculate volatility
priceHistorySchema.statics.calculateVolatility = async function(assetId, days = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const prices = await this.find({
    asset: assetId,
    interval: 'daily',
    date: { $gte: cutoff }
  })
    .sort({ date: 1 })
    .select('close changePercent')
    .lean();
  
  if (prices.length < 2) return null;
  
  // Calculate daily returns
  const returns = prices
    .filter(p => p.changePercent !== undefined)
    .map(p => p.changePercent / 100);
  
  if (returns.length < 2) return null;
  
  // Calculate standard deviation
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const squaredDiffs = returns.map(r => Math.pow(r - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  const dailyVolatility = Math.sqrt(avgSquaredDiff);
  
  // Annualize (assuming 252 trading days)
  const annualizedVolatility = dailyVolatility * Math.sqrt(252);
  
  return {
    daily: Math.round(dailyVolatility * 10000) / 100,
    annualized: Math.round(annualizedVolatility * 10000) / 100
  };
};

// Static: Get high/low for period
priceHistorySchema.statics.getHighLow = async function(assetId, days = 365) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  
  const result = await this.aggregate([
    {
      $match: {
        asset: mongoose.Types.ObjectId(assetId),
        interval: 'daily',
        date: { $gte: cutoff }
      }
    },
    {
      $group: {
        _id: null,
        high: { $max: '$high' },
        low: { $min: '$low' },
        avgVolume: { $avg: '$volume' }
      }
    }
  ]);
  
  return result[0] || { high: null, low: null, avgVolume: null };
};

// Static: Calculate moving averages
priceHistorySchema.statics.calculateMovingAverages = async function(assetId) {
  const periods = [20, 50, 200];
  const maxPeriod = Math.max(...periods);
  
  const prices = await this.find({
    asset: assetId,
    interval: 'daily'
  })
    .sort({ date: -1 })
    .limit(maxPeriod)
    .select('close')
    .lean();
  
  if (prices.length < 20) return null;
  
  const closes = prices.map(p => p.close).reverse();
  const averages = {};
  
  for (const period of periods) {
    if (closes.length >= period) {
      const sum = closes.slice(-period).reduce((a, b) => a + b, 0);
      averages[`sma${period}`] = Math.round((sum / period) * 100) / 100;
    }
  }
  
  return averages;
};

// Static: Bulk insert price history
priceHistorySchema.statics.bulkInsert = async function(assetId, symbol, priceData, interval = 'daily') {
  const operations = priceData.map(data => ({
    updateOne: {
      filter: { asset: assetId, date: new Date(data.date), interval },
      update: {
        $set: {
          asset: assetId,
          symbol: symbol.toUpperCase(),
          date: new Date(data.date),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          adjustedClose: data.adjustedClose,
          volume: data.volume,
          interval
        }
      },
      upsert: true
    }
  }));
  
  return this.bulkWrite(operations, { ordered: false });
};

// Static: Clean old data (keep last N years)
priceHistorySchema.statics.cleanOldData = async function(years = 5) {
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - years);
  
  const result = await this.deleteMany({ date: { $lt: cutoff } });
  return result.deletedCount;
};

module.exports = mongoose.model('PriceHistory', priceHistorySchema);
