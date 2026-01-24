const Currency = require('../models/Currency');

// Supported currencies with their symbols
const SUPPORTED_CURRENCIES = {
    USD: { symbol: '$', name: 'US Dollar' },
    EUR: { symbol: '€', name: 'Euro' },
    GBP: { symbol: '£', name: 'British Pound' },
    INR: { symbol: '₹', name: 'Indian Rupee' },
    JPY: { symbol: '¥', name: 'Japanese Yen' },
    AUD: { symbol: 'A$', name: 'Australian Dollar' },
    CAD: { symbol: 'C$', name: 'Canadian Dollar' },
    CHF: { symbol: 'CHF', name: 'Swiss Franc' },
    CNY: { symbol: '¥', name: 'Chinese Yuan' },
    AED: { symbol: 'د.إ', name: 'UAE Dirham' },
    SGD: { symbol: 'S$', name: 'Singapore Dollar' },
    HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
    KRW: { symbol: '₩', name: 'South Korean Won' },
    MXN: { symbol: '$', name: 'Mexican Peso' },
    BRL: { symbol: 'R$', name: 'Brazilian Real' }
};

// Fallback rates (INR base) - used when API is unavailable
const FALLBACK_RATES = {
    USD: 0.012,
    EUR: 0.011,
    GBP: 0.0095,
    INR: 1,
    JPY: 1.79,
    AUD: 0.018,
    CAD: 0.016,
    CHF: 0.011,
    CNY: 0.087,
    AED: 0.044,
    SGD: 0.016,
    HKD: 0.094,
    KRW: 16.5,
    MXN: 0.21,
    BRL: 0.059
};

class CurrencyService {
    constructor() {
        // Using exchangerate-api.io free tier
        this.apiUrl = 'https://api.exchangerate-api.com/v4/latest';
    }

    /**
     * Fetch exchange rates from external API
     */
    async fetchRates(baseCurrency = 'INR') {
        try {
            const response = await fetch(`${this.apiUrl}/${baseCurrency}`);
            if (!response.ok) {
                throw new Error('Failed to fetch exchange rates');
            }

            const data = await response.json();

            // Filter to only supported currencies
            const filteredRates = {};
            Object.keys(SUPPORTED_CURRENCIES).forEach(currency => {
                if (data.rates[currency]) {
                    filteredRates[currency] = data.rates[currency];
                }
            });

            // Save to database
            await Currency.create({
                base: baseCurrency,
                rates: filteredRates,
                lastUpdated: new Date()
            });

            return {
                base: baseCurrency,
                rates: filteredRates,
                lastUpdated: new Date()
            };
        } catch (error) {
            console.error('Error fetching exchange rates:', error);
            // Return fallback rates
            return {
                base: 'INR',
                rates: FALLBACK_RATES,
                lastUpdated: null,
                isFallback: true
            };
        }
    }

    /**
     * Get exchange rates (from cache or fetch new)
     */
    async getRates(baseCurrency = 'INR') {
        try {
            const needsRefresh = await Currency.needsRefresh(baseCurrency);

            if (needsRefresh) {
                return await this.fetchRates(baseCurrency);
            }

            const cached = await Currency.getLatestRates(baseCurrency);
            return {
                base: cached.base,
                rates: Object.fromEntries(cached.rates),
                lastUpdated: cached.lastUpdated
            };
        } catch (error) {
            console.error('Error getting rates:', error);
            return {
                base: 'INR',
                rates: FALLBACK_RATES,
                lastUpdated: null,
                isFallback: true
            };
        }
    }

    /**
     * Convert amount between currencies
     */
    async convert(amount, fromCurrency, toCurrency, baseCurrency = 'INR') {
        const ratesData = await this.getRates(baseCurrency);
        const rates = ratesData.rates;

        // If same currency, no conversion needed
        if (fromCurrency === toCurrency) {
            return { amount, rate: 1 };
        }

        // Convert via base currency
        let rate;
        if (fromCurrency === baseCurrency) {
            rate = rates[toCurrency];
        } else if (toCurrency === baseCurrency) {
            rate = 1 / rates[fromCurrency];
        } else {
            // Cross rate: from -> base -> to
            const fromToBase = 1 / rates[fromCurrency];
            const baseToTarget = rates[toCurrency];
            rate = fromToBase * baseToTarget;
        }

        return {
            amount: amount * rate,
            rate
        };
    }

    /**
     * Get supported currencies list
     */
    getSupportedCurrencies() {
        return SUPPORTED_CURRENCIES;
    }

    /**
     * Format amount with currency symbol
     */
    formatAmount(amount, currency) {
        const currencyInfo = SUPPORTED_CURRENCIES[currency] || { symbol: currency };
        return `${currencyInfo.symbol}${amount.toFixed(2)}`;
    }
}

module.exports = new CurrencyService();
module.exports.SUPPORTED_CURRENCIES = SUPPORTED_CURRENCIES;
