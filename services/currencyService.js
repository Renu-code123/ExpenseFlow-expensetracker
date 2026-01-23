const fetch = require('node-fetch');
const Currency = require('../models/Currency');

class CurrencyService {
  constructor() {
    this.exchangeRateAPI = 'https://api.exchangerate-api.com/v4/latest/';
    this.fallbackAPI = 'https://api.fixer.io/latest';
    this.cache = new Map();
    this.cacheExpiry = 60 * 60 * 1000; // 1 hour
    this.supportedCurrencies = new Set();
    this.init();
  }

  async init() {
    await this.loadSupportedCurrencies();
    await this.updateExchangeRates();
    // Update rates every hour
    setInterval(() => this.updateExchangeRates(), this.cacheExpiry);
  }

  async loadSupportedCurrencies() {
    const currencies = await Currency.find({ isActive: true });
    currencies.forEach(currency => {
      this.supportedCurrencies.add(currency.code);
    });

    // Add default currencies if none exist
    if (this.supportedCurrencies.size === 0) {
      await this.initializeDefaultCurrencies();
    }
  }

  async initializeDefaultCurrencies() {
    const defaultCurrencies = [
      { code: 'USD', name: 'US Dollar', symbol: '$', countries: ['US'] },
      { code: 'EUR', name: 'Euro', symbol: '€', countries: ['DE', 'FR', 'IT', 'ES'] },
      { code: 'GBP', name: 'British Pound', symbol: '£', countries: ['GB'] },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', countries: ['JP'], decimalPlaces: 0 },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', countries: ['IN'] },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', countries: ['CA'] },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', countries: ['AU'] },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', countries: ['CH'] },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', countries: ['CN'] },
      { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', countries: ['SG'] }
    ];

    for (const currencyData of defaultCurrencies) {
      await Currency.findOneAndUpdate(
        { code: currencyData.code },
        currencyData,
        { upsert: true, new: true }
      );
      this.supportedCurrencies.add(currencyData.code);
    }
  }

  async updateExchangeRates() {
    try {
      const baseCurrency = 'USD';
      const response = await fetch(`${this.exchangeRateAPI}${baseCurrency}`);
      
      if (!response.ok) {
        throw new Error('Primary API failed');
      }

      const data = await response.json();
      const rates = data.rates;

      // Update cache
      this.cache.set('rates', {
        data: rates,
        timestamp: Date.now(),
        base: baseCurrency
      });

      // Update database
      await this.updateDatabaseRates(rates, baseCurrency);
      
      console.log('Exchange rates updated successfully');
    } catch (error) {
      console.error('Failed to update exchange rates:', error.message);
      await this.tryFallbackAPI();
    }
  }

  async tryFallbackAPI() {
    try {
      const response = await fetch(`${this.fallbackAPI}?access_key=${process.env.FIXER_API_KEY}`);
      const data = await response.json();
      
      if (data.success) {
        this.cache.set('rates', {
          data: data.rates,
          timestamp: Date.now(),
          base: data.base
        });
        await this.updateDatabaseRates(data.rates, data.base);
      }
    } catch (error) {
      console.error('Fallback API also failed:', error.message);
    }
  }

  async updateDatabaseRates(rates, baseCurrency) {
    const updatePromises = Object.entries(rates).map(async ([currency, rate]) => {
      if (this.supportedCurrencies.has(currency)) {
        const exchangeRates = new Map();
        exchangeRates.set(baseCurrency, { rate: 1 / rate, lastUpdated: new Date() });
        
        await Currency.findOneAndUpdate(
          { code: currency },
          { $set: { [`exchangeRates.${baseCurrency}`]: { rate: 1 / rate, lastUpdated: new Date() } } }
        );
      }
    });

    await Promise.all(updatePromises);
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return {
        originalAmount: amount,
        convertedAmount: amount,
        fromCurrency,
        toCurrency,
        exchangeRate: 1,
        timestamp: new Date()
      };
    }

    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = parseFloat((amount * rate).toFixed(2));

    return {
      originalAmount: amount,
      convertedAmount,
      fromCurrency,
      toCurrency,
      exchangeRate: rate,
      timestamp: new Date()
    };
  }

  async getExchangeRate(fromCurrency, toCurrency) {
    // Check cache first
    const cached = this.cache.get('rates');
    if (cached && (Date.now() - cached.timestamp) < this.cacheExpiry) {
      const fromRate = cached.data[fromCurrency] || 1;
      const toRate = cached.data[toCurrency] || 1;
      return toRate / fromRate;
    }

    // Fallback to database
    const fromCurrencyDoc = await Currency.findOne({ code: fromCurrency });
    const toCurrencyDoc = await Currency.findOne({ code: toCurrency });

    if (!fromCurrencyDoc || !toCurrencyDoc) {
      throw new Error('Currency not supported');
    }

    const exchangeRateData = fromCurrencyDoc.exchangeRates.get(toCurrency);
    if (exchangeRateData) {
      return exchangeRateData.rate;
    }

    // If direct rate not available, use USD as base
    const usdFromRate = fromCurrencyDoc.exchangeRates.get('USD')?.rate || 1;
    const usdToRate = toCurrencyDoc.exchangeRates.get('USD')?.rate || 1;
    
    return usdToRate / usdFromRate;
  }

  async getCurrencyTrends(currency, days = 30) {
    // This would typically fetch historical data from an API
    // For now, return mock trend data
    const trends = [];
    const baseRate = await this.getExchangeRate('USD', currency);
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Generate mock trend data with some volatility
      const volatility = (Math.random() - 0.5) * 0.1;
      const rate = baseRate * (1 + volatility);
      
      trends.push({
        date: date.toISOString().split('T')[0],
        rate: parseFloat(rate.toFixed(4)),
        change: i === days ? 0 : parseFloat((rate - trends[trends.length - 1]?.rate || rate).toFixed(4))
      });
    }

    return {
      currency,
      baseCurrency: 'USD',
      trends,
      summary: {
        currentRate: trends[trends.length - 1].rate,
        highestRate: Math.max(...trends.map(t => t.rate)),
        lowestRate: Math.min(...trends.map(t => t.rate)),
        averageRate: trends.reduce((sum, t) => sum + t.rate, 0) / trends.length,
        totalChange: trends[trends.length - 1].rate - trends[0].rate
      }
    };
  }

  async getHedgingRecommendations(userId, exposures) {
    const recommendations = [];
    
    for (const exposure of exposures) {
      const trends = await this.getCurrencyTrends(exposure.currency, 30);
      const volatility = this.calculateVolatility(trends.trends);
      
      if (volatility > 0.05 && exposure.amount > 1000) {
        recommendations.push({
          currency: exposure.currency,
          exposure: exposure.amount,
          recommendation: volatility > 0.1 ? 'HEDGE_IMMEDIATELY' : 'CONSIDER_HEDGING',
          reason: `High volatility detected (${(volatility * 100).toFixed(2)}%)`,
          suggestedActions: [
            'Consider forward contracts',
            'Use currency options',
            'Diversify currency exposure'
          ],
          riskLevel: volatility > 0.1 ? 'HIGH' : 'MEDIUM'
        });
      }
    }

    return recommendations;
  }

  calculateVolatility(trends) {
    const changes = trends.slice(1).map((trend, i) => 
      Math.abs(trend.rate - trends[i].rate) / trends[i].rate
    );
    
    const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    return avgChange;
  }

  isValidCurrency(currencyCode) {
    return this.supportedCurrencies.has(currencyCode.toUpperCase());
  }

  async getSupportedCurrencies() {
    return await Currency.find({ isActive: true }).select('code name symbol countries decimalPlaces');
  }

  formatAmount(amount, currency) {
    const currencyInfo = this.getCurrencyInfo(currency);
    const decimalPlaces = currencyInfo?.decimalPlaces || 2;
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    }).format(amount);
  }

  getCurrencyInfo(currencyCode) {
    // This would typically come from the database
    const currencyMap = {
      'USD': { symbol: '$', decimalPlaces: 2 },
      'EUR': { symbol: '€', decimalPlaces: 2 },
      'GBP': { symbol: '£', decimalPlaces: 2 },
      'JPY': { symbol: '¥', decimalPlaces: 0 },
      'INR': { symbol: '₹', decimalPlaces: 2 }
    };
    
    return currencyMap[currencyCode.toUpperCase()];
  }
}

module.exports = new CurrencyService();