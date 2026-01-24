const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const currencyService = require('../services/currencyService');
const Joi = require('joi');

/**
 * @route   GET /api/currency/rates
 * @desc    Get current exchange rates
 * @access  Private
 */
router.get('/rates', auth, async (req, res) => {
    try {
        const { base = 'USD', symbols } = req.query;

        // Validate base currency
        if (!currencyService.isValidCurrency(base)) {
            return res.status(400).json({
                error: 'Invalid base currency code'
            });
        }

        // Parse symbols if provided
        let targetCurrencies = null;
        if (symbols) {
            const symbolArray = symbols.split(',').map(s => s.trim().toUpperCase());
            const invalidSymbols = symbolArray.filter(s => !currencyService.isValidCurrency(s));
            if (invalidSymbols.length > 0) {
                return res.status(400).json({
                    error: `Invalid currency codes: ${invalidSymbols.join(', ')}`
                });
            }
            targetCurrencies = symbolArray;
        }

        const ratesData = await currencyService.getExchangeRates(base);

        // Filter rates if specific symbols requested
        let filteredRates = ratesData.rates;
        if (targetCurrencies) {
            filteredRates = {};
            targetCurrencies.forEach(symbol => {
                if (ratesData.rates[symbol]) {
                    filteredRates[symbol] = ratesData.rates[symbol];
                }
            });
        }

        res.json({
            success: true,
            data: {
                base: ratesData.baseCurrency,
                rates: filteredRates,
                lastUpdated: ratesData.lastUpdated,
                source: ratesData.source,
                cached: ratesData.cached
            }
        });
    } catch (error) {
        console.error('[Currency Routes] Get rates error:', error);
        res.status(500).json({
            error: 'Failed to fetch exchange rates'
        });
    }
});

/**
 * @route   POST /api/currency/convert
 * @desc    Convert amount between currencies
 * @access  Private
 */
router.post('/convert', auth, async (req, res) => {
    try {
        const { amount, from, to } = req.body;

        // Validation
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            return res.status(400).json({
                error: 'Valid amount is required'
            });
        }

        if (!from || !to) {
            return res.status(400).json({
                error: 'Both from and to currencies are required'
            });
        }

        if (!currencyService.isValidCurrency(from) || !currencyService.isValidCurrency(to)) {
            return res.status(400).json({
                error: 'Invalid currency code(s)'
            });
        }

        const conversion = await currencyService.convertCurrency(amount, from.toUpperCase(), to.toUpperCase());

        res.json({
            success: true,
            data: conversion
        });
    } catch (error) {
        console.error('[Currency Routes] Convert error:', error);
        res.status(500).json({
            error: 'Failed to convert currency'
        });
    }
});

/**
 * @route   GET /api/currency/supported
 * @desc    Get list of supported currencies
 * @access  Private
 */
router.get('/supported', auth, async (req, res) => {
    try {
        const currencies = currencyService.getSupportedCurrencies();

        res.json({
            success: true,
            count: currencies.length,
            data: currencies
        });
    } catch (error) {
        console.error('[Currency Routes] Get supported currencies error:', error);
        res.status(500).json({
            error: 'Failed to fetch supported currencies'
        });
    }
});

/**
 * @route   GET /api/currency/symbols
 * @desc    Get currency symbols mapping
 * @access  Private
 */
router.get('/symbols', auth, async (req, res) => {
    try {
        const currencies = currencyService.getSupportedCurrencies();
        const symbols = {};

        currencies.forEach(currency => {
            symbols[currency.code] = {
                name: currency.name,
                symbol: currency.symbol
            };
        });

        res.json({
            success: true,
            data: symbols
        });
    } catch (error) {
        console.error('[Currency Routes] Get symbols error:', error);
        res.status(500).json({
            error: 'Failed to fetch currency symbols'
        });
    }
});

module.exports = router;
