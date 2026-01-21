const axios = require('axios');
const CurrencyRate = require('../models/CurrencyRate');

// Supported currencies (30+ major currencies)
const SUPPORTED_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD',
    'SEK', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL',
    'TWD', 'DKK', 'PLN', 'THB', 'IDR', 'HUF', 'CZK', 'ILS', 'CLP', 'PHP',
    'AED', 'SAR', 'MYR', 'RON'
];

// Cache duration: 1 hour
const CACHE_DURATION_MS = 60 * 60 * 1000;

// Primary API: exchangerate-api.com (free tier)
const PRIMARY_API_URL = 'https://api.exchangerate-api.com/v4/latest';

// Fallback API: frankfurter.app
const FALLBACK_API_URL = 'https://api.frankfurter.app/latest';

class CurrencyService {
    /**
     * Fetch latest exchange rates from external API
     * @param {string} baseCurrency - Base currency code (default: USD)
     * @returns {Promise<Object>} Exchange rates object
     */
    async fetchExchangeRates(baseCurrency = 'USD') {
        try {
            // Try primary API first
            const response = await axios.get(`${PRIMARY_API_URL}/${baseCurrency}`, {
                timeout: 5000
            });

            if (response.data && response.data.rates) {
                return {
                    rates: response.data.rates,
                    source: 'exchangerate-api.com'
                };
            }
        } catch (error) {
            console.error('Primary API failed, trying fallback:', error.message);
            
            // Try fallback API
            try {
                const response = await axios.get(`${FALLBACK_API_URL}?from=${baseCurrency}`, {
                    timeout: 5000
                });

                if (response.data && response.data.rates) {
                    // Add base currency rate (1.0)
                    const rates = { ...response.data.rates, [baseCurrency]: 1 };
                    return {
                        rates: rates,
                        source: 'frankfurter.app'
                    };
                }
            } catch (fallbackError) {
                console.error('Fallback API also failed:', fallbackError.message);
                throw new Error('Unable to fetch exchange rates from any source');
            }
        }

        throw new Error('Invalid response from currency API');
    }

    /**
     * Update exchange rates in database
     * @param {string} baseCurrency - Base currency code
     * @returns {Promise<Object>} Saved currency rate document
     */
    async updateExchangeRates(baseCurrency = 'USD') {
        try {
            const { rates, source } = await this.fetchExchangeRates(baseCurrency);

            const currencyRate = new CurrencyRate({
                baseCurrency: baseCurrency.toUpperCase(),
                rates: rates,
                lastUpdated: new Date(),
                source: source,
                expiresAt: new Date(Date.now() + CACHE_DURATION_MS)
            });

            await currencyRate.save();
            console.log(`Updated exchange rates for ${baseCurrency} from ${source}`);
            
            return currencyRate;
        } catch (error) {
            console.error('Error updating exchange rates:', error.message);
            throw error;
        }
    }

    /**
     * Get exchange rates (from cache or fetch new)
     * @param {string} baseCurrency - Base currency code
     * @returns {Promise<Object>} Currency rates object
     */
    async getExchangeRates(baseCurrency = 'USD') {
        try {
            // Try to get from cache first
            const cachedRates = await CurrencyRate.getLatestRates(baseCurrency);

            if (cachedRates && !cachedRates.isExpired()) {
                return {
                    baseCurrency: cachedRates.baseCurrency,
                    rates: Object.fromEntries(cachedRates.rates),
                    lastUpdated: cachedRates.lastUpdated,
                    source: cachedRates.source,
                    cached: true
                };
            }

            // Cache expired or not found, fetch new rates
            const newRates = await this.updateExchangeRates(baseCurrency);
            
            return {
                baseCurrency: newRates.baseCurrency,
                rates: Object.fromEntries(newRates.rates),
                lastUpdated: newRates.lastUpdated,
                source: newRates.source,
                cached: false
            };
        } catch (error) {
            // If fetch fails, try to return expired cache as fallback
            const expiredCache = await CurrencyRate.findOne({ 
                baseCurrency: baseCurrency.toUpperCase()
            }).sort({ lastUpdated: -1 });

            if (expiredCache) {
                console.warn('Using expired cache due to fetch failure');
                return {
                    baseCurrency: expiredCache.baseCurrency,
                    rates: Object.fromEntries(expiredCache.rates),
                    lastUpdated: expiredCache.lastUpdated,
                    source: expiredCache.source,
                    cached: true,
                    expired: true
                };
            }

            throw error;
        }
    }

    /**
     * Convert amount from one currency to another
     * @param {number} amount - Amount to convert
     * @param {string} fromCurrency - Source currency code
     * @param {string} toCurrency - Target currency code
     * @returns {Promise<Object>} Conversion result
     */
    async convertCurrency(amount, fromCurrency, toCurrency) {
        if (fromCurrency === toCurrency) {
            return {
                originalAmount: amount,
                originalCurrency: fromCurrency,
                convertedAmount: amount,
                convertedCurrency: toCurrency,
                exchangeRate: 1,
                lastUpdated: new Date()
            };
        }

        try {
            // Get rates with fromCurrency as base
            const ratesData = await this.getExchangeRates(fromCurrency);
            
            const rate = ratesData.rates[toCurrency.toUpperCase()];
            
            if (!rate) {
                throw new Error(`Exchange rate not available for ${toCurrency}`);
            }

            const convertedAmount = parseFloat((amount * rate).toFixed(4));

            return {
                originalAmount: amount,
                originalCurrency: fromCurrency.toUpperCase(),
                convertedAmount: convertedAmount,
                convertedCurrency: toCurrency.toUpperCase(),
                exchangeRate: rate,
                lastUpdated: ratesData.lastUpdated
            };
        } catch (error) {
            console.error('Currency conversion error:', error.message);
            throw error;
        }
    }

    /**
     * Get list of supported currencies
     * @returns {Array<Object>} Array of currency objects
     */
    getSupportedCurrencies() {
        const currencyNames = {
            'USD': 'US Dollar',
            'EUR': 'Euro',
            'GBP': 'British Pound',
            'JPY': 'Japanese Yen',
            'AUD': 'Australian Dollar',
            'CAD': 'Canadian Dollar',
            'CHF': 'Swiss Franc',
            'CNY': 'Chinese Yuan',
            'HKD': 'Hong Kong Dollar',
            'NZD': 'New Zealand Dollar',
            'SEK': 'Swedish Krona',
            'KRW': 'South Korean Won',
            'SGD': 'Singapore Dollar',
            'NOK': 'Norwegian Krone',
            'MXN': 'Mexican Peso',
            'INR': 'Indian Rupee',
            'RUB': 'Russian Ruble',
            'ZAR': 'South African Rand',
            'TRY': 'Turkish Lira',
            'BRL': 'Brazilian Real',
            'TWD': 'Taiwan Dollar',
            'DKK': 'Danish Krone',
            'PLN': 'Polish Zloty',
            'THB': 'Thai Baht',
            'IDR': 'Indonesian Rupiah',
            'HUF': 'Hungarian Forint',
            'CZK': 'Czech Koruna',
            'ILS': 'Israeli Shekel',
            'CLP': 'Chilean Peso',
            'PHP': 'Philippine Peso',
            'AED': 'UAE Dirham',
            'SAR': 'Saudi Riyal',
            'MYR': 'Malaysian Ringgit',
            'RON': 'Romanian Leu'
        };

        return SUPPORTED_CURRENCIES.map(code => ({
            code: code,
            name: currencyNames[code] || code,
            symbol: this.getCurrencySymbol(code)
        }));
    }

    /**
     * Get currency symbol for a given currency code
     * @param {string} currencyCode - Currency code
     * @returns {string} Currency symbol
     */
    getCurrencySymbol(currencyCode) {
        const symbols = {
            'USD': '$', 'EUR': '€', 'GBP': '£', 'JPY': '¥', 'AUD': 'A$',
            'CAD': 'C$', 'CHF': 'CHF', 'CNY': '¥', 'HKD': 'HK$', 'NZD': 'NZ$',
            'SEK': 'kr', 'KRW': '₩', 'SGD': 'S$', 'NOK': 'kr', 'MXN': '$',
            'INR': '₹', 'RUB': '₽', 'ZAR': 'R', 'TRY': '₺', 'BRL': 'R$',
            'TWD': 'NT$', 'DKK': 'kr', 'PLN': 'zł', 'THB': '฿', 'IDR': 'Rp',
            'HUF': 'Ft', 'CZK': 'Kč', 'ILS': '₪', 'CLP': '$', 'PHP': '₱',
            'AED': 'د.إ', 'SAR': '﷼', 'MYR': 'RM', 'RON': 'lei'
        };

        return symbols[currencyCode] || currencyCode;
    }

    /**
     * Validate currency code
     * @param {string} currencyCode - Currency code to validate
     * @returns {boolean} True if valid
     */
    isValidCurrency(currencyCode) {
        return SUPPORTED_CURRENCIES.includes(currencyCode.toUpperCase());
    }
}

module.exports = new CurrencyService();
