const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const currencyService = require('../services/currencyService');
const User = require('../models/User');

// Get supported currencies
router.get('/supported', (req, res) => {
  try {
    const currencies = currencyService.getSupportedCurrencies();
    res.json({ success: true, data: { currencies } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get latest exchange rates
router.get('/rates', async (req, res) => {
  try {
    const base = req.query.base || 'USD';
    const ratesData = await currencyService.getExchangeRates(base);
    res.json({ success: true, data: ratesData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get user currency preference
router.get('/preference', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: { preferredCurrency: user.preferredCurrency || 'INR' }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user currency preference
router.put('/preference', auth, async (req, res) => {
  try {
    const { currency } = req.body;
    if (!currencyService.isValidCurrency(currency)) {
      return res.status(400).json({ success: false, error: 'Invalid currency code' });
    }

    await User.findByIdAndUpdate(req.user._id, { preferredCurrency: currency });
    res.json({ success: true, message: 'Currency preference updated' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
