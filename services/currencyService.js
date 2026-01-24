// Simple currency service
class CurrencyService {
  constructor() {
    this.validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY'];
    this.exchangeRates = {
      'USD': 1,
      'EUR': 0.85,
      'GBP': 0.73,
      'INR': 83.12,
      'JPY': 110.25
    };
  }

  init() {
    console.log('Currency service initialized');
  }

  isValidCurrency(currency) {
    return this.validCurrencies.includes(currency);
  }

  async convertCurrency(amount, fromCurrency, toCurrency) {
    if (!this.isValidCurrency(fromCurrency) || !this.isValidCurrency(toCurrency)) {
      throw new Error('Invalid currency');
    }

    const fromRate = this.exchangeRates[fromCurrency];
    const toRate = this.exchangeRates[toCurrency];
    const convertedAmount = (amount / fromRate) * toRate;

    return {
      convertedAmount: Math.round(convertedAmount * 100) / 100,
      exchangeRate: toRate / fromRate,
      fromCurrency,
      toCurrency
    };
  }
}

module.exports = new CurrencyService();