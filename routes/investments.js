const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const investmentService = require('../services/investmentService');

/**
 * @route   GET /api/investments
 * @desc    Get complete investment portfolio
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
    try {
        const portfolio = await investmentService.getPortfolio(req.user._id);
        res.json({
            success: true,
            data: portfolio
        });
    } catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch investment portfolio' });
    }
});

/**
 * @route   POST /api/investments
 * @desc    Add a new investment holding
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
    try {
        const { type, symbol, name, quantity, buyPrice } = req.body;

        if (!type || !symbol || !name || !quantity || !buyPrice) {
            return res.status(400).json({ error: 'Please provide all required fields' });
        }

        const investment = await investmentService.addHolding(req.user._id, {
            type,
            symbol,
            name,
            quantity: Number(quantity),
            buyPrice: Number(buyPrice)
        });

        res.status(201).json({
            success: true,
            data: investment
        });
    } catch (error) {
        console.error('Error adding investment:', error);
        res.status(500).json({ error: 'Failed to add investment' });
    }
});

/**
 * @route   DELETE /api/investments/:id
 * @desc    Remove a holding
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
    try {
        const result = await investmentService.removeHolding(req.user._id, req.params.id);
        if (!result) {
            return res.status(404).json({ error: 'Investment not found' });
        }
        res.json({ success: true, message: 'Investment removed' });
    } catch (error) {
        console.error('Error removing investment:', error);
        res.status(500).json({ error: 'Failed to remove investment' });
    }
});

module.exports = router;
