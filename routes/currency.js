const express = require('express');
const currencyService = require('../services/currencyService');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// GET /api/currency/supported - Get list of supported currencies
router.get('/supported', (req, res) => {
    try {
        const currencies = currencyService.getSupportedCurrencies();
        res.json(currencies);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/currency/rates - Get current exchange rates
router.get('/rates', async (req, res) => {
    try {
        const baseCurrency = req.query.base || 'INR';
        const rates = await currencyService.getRates(baseCurrency);
        res.json(rates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/currency/convert - Convert amount between currencies
router.post('/convert', async (req, res) => {
    try {
        const { amount, from, to, base } = req.body;

        if (!amount || !from || !to) {
            return res.status(400).json({ error: 'Amount, from, and to currencies are required' });
        }

        const result = await currencyService.convert(amount, from, to, base || 'INR');
        res.json({
            originalAmount: amount,
            originalCurrency: from,
            convertedAmount: result.amount,
            targetCurrency: to,
            exchangeRate: result.rate
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /api/currency/refresh - Force refresh exchange rates
router.get('/refresh', async (req, res) => {
    try {
        const baseCurrency = req.query.base || 'INR';
        const rates = await currencyService.fetchRates(baseCurrency);
        res.json({ message: 'Rates refreshed successfully', rates });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT /api/currency/preference - Update user's base currency (requires auth)
router.put('/preference', auth, async (req, res) => {
    try {
        const { baseCurrency } = req.body;

        if (!baseCurrency) {
            return res.status(400).json({ error: 'Base currency is required' });
        }

        const supported = currencyService.getSupportedCurrencies();
        if (!supported[baseCurrency]) {
            return res.status(400).json({ error: 'Unsupported currency' });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { baseCurrency },
            { new: true }
        );

        res.json({
            message: 'Currency preference updated',
            baseCurrency: user.baseCurrency
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
