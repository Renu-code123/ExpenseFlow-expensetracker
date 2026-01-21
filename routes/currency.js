const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const currencyService = require('../services/currencyService');
const User = require('../models/User');

/**
 * @route   GET /api/currency/rates
 * @desc    Get current exchange rates
 * @access  Private
 * @query   base - Base currency (optional, defaults to USD)
 */
router.get('/rates', auth, async (req, res) => {
    try {
        const baseCurrency = req.query.base || 'USD';

        if (!currencyService.isValidCurrency(baseCurrency)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid base currency code'
            });
        }

        const rates = await currencyService.getExchangeRates(baseCurrency);

        res.json({
            success: true,
            data: rates
        });
    } catch (error) {
        console.error('Get rates error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch exchange rates',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/currency/convert
 * @desc    Convert amount between currencies
 * @access  Private
 * @query   amount, from, to
 */
router.get('/convert', auth, async (req, res) => {
    try {
        const { amount, from, to } = req.query;

        // Validate inputs
        if (!amount || !from || !to) {
            return res.status(400).json({
                success: false,
                message: 'Missing required parameters: amount, from, to'
            });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount'
            });
        }

        if (!currencyService.isValidCurrency(from) || !currencyService.isValidCurrency(to)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid currency code'
            });
        }

        const conversion = await currencyService.convertCurrency(parsedAmount, from, to);

        res.json({
            success: true,
            data: conversion
        });
    } catch (error) {
        console.error('Currency conversion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to convert currency',
            error: error.message
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
            data: {
                currencies: currencies,
                count: currencies.length
            }
        });
    } catch (error) {
        console.error('Get supported currencies error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch supported currencies',
            error: error.message
        });
    }
});

/**
 * @route   PUT /api/currency/preference
 * @desc    Update user's preferred currency
 * @access  Private
 * @body    currency, locale (optional), decimalPlaces (optional)
 */
router.put('/preference', auth, async (req, res) => {
    try {
        const { currency, locale, decimalPlaces } = req.body;

        if (!currency) {
            return res.status(400).json({
                success: false,
                message: 'Currency code is required'
            });
        }

        if (!currencyService.isValidCurrency(currency)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid currency code'
            });
        }

        const updateData = {
            preferredCurrency: currency.toUpperCase()
        };

        if (locale) {
            updateData['currencySettings.locale'] = locale;
        }

        if (decimalPlaces !== undefined) {
            const places = parseInt(decimalPlaces);
            if (places < 0 || places > 4) {
                return res.status(400).json({
                    success: false,
                    message: 'Decimal places must be between 0 and 4'
                });
            }
            updateData['currencySettings.decimalPlaces'] = places;
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('-password');

        res.json({
            success: true,
            message: 'Currency preference updated successfully',
            data: {
                preferredCurrency: user.preferredCurrency,
                currencySettings: user.currencySettings
            }
        });
    } catch (error) {
        console.error('Update currency preference error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update currency preference',
            error: error.message
        });
    }
});

/**
 * @route   GET /api/currency/preference
 * @desc    Get user's current currency preference
 * @access  Private
 */
router.get('/preference', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('preferredCurrency currencySettings');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                preferredCurrency: user.preferredCurrency,
                currencySettings: user.currencySettings,
                currencySymbol: currencyService.getCurrencySymbol(user.preferredCurrency)
            }
        });
    } catch (error) {
        console.error('Get currency preference error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch currency preference',
            error: error.message
        });
    }
});

module.exports = router;
