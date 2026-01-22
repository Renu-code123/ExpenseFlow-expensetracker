const axios = require('axios');
const Investment = require('../models/Investment');
const mongoose = require('mongoose');

class InvestmentService {
    constructor() {
        this.COINGECKO_API = 'https://api.coingecko.com/api/v3';
        // Cache price data for 5 minutes
        this.priceCache = new Map();
        this.CACHE_TTL = 5 * 60 * 1000;
    }

    /**
     * Get user's investment portfolio with real-time valuations
     */
    async getPortfolio(userId) {
        const investments = await Investment.find({ user: userId });

        if (investments.length === 0) {
            return {
                holdings: [],
                summary: {
                    totalValue: 0,
                    totalCost: 0,
                    totalProfitLoss: 0,
                    totalProfitLossPercent: 0
                }
            };
        }

        // Update prices if needed (mostly for crypto)
        // For simplicity in this demo, we'll focus on Crypto updating via CoinGecko
        // Stocks would require a different API key (Alpha Vantage/Finnhub)
        await this.updatePrices(investments);

        const holdings = investments.map(inv => {
            const currentVal = inv.quantity * (inv.currentPrice || inv.buyPrice);
            const costBasis = inv.quantity * inv.buyPrice;
            const pl = currentVal - costBasis;
            const plPercent = costBasis > 0 ? (pl / costBasis) * 100 : 0;

            return {
                id: inv._id,
                type: inv.type,
                symbol: inv.symbol,
                name: inv.name,
                quantity: inv.quantity,
                buyPrice: inv.buyPrice,
                currentPrice: inv.currentPrice,
                currentValue: currentVal,
                profitLoss: pl,
                profitLossPercent: plPercent,
                lastUpdated: inv.lastUpdated
            };
        });

        const totalValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
        const totalCost = holdings.reduce((sum, h) => sum + (h.quantity * h.buyPrice), 0);
        const totalProfitLoss = totalValue - totalCost;
        const totalProfitLossPercent = totalCost > 0 ? (totalProfitLoss / totalCost) * 100 : 0;

        return {
            holdings,
            summary: {
                totalValue: Math.round(totalValue * 100) / 100,
                totalCost: Math.round(totalCost * 100) / 100,
                totalProfitLoss: Math.round(totalProfitLoss * 100) / 100,
                totalProfitLossPercent: Math.round(totalProfitLossPercent * 100) / 100
            }
        };
    }

    /**
     * Update prices for crypto assets
     */
    async updatePrices(investments) {
        const cryptoItems = investments.filter(i => i.type === 'crypto');
        if (cryptoItems.length === 0) return;

        // Map common symbols to CoinGecko IDs (simplified list)
        // In a real app, you'd store the CoinGecko ID in the DB
        const symbolMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'SOL': 'solana',
            'DOGE': 'dogecoin',
            'ADA': 'cardano',
            'XRP': 'ripple',
            'DOT': 'polkadot',
            'MATIC': 'matic-network'
        };

        const idsToFetch = [...new Set(cryptoItems
            .map(i => symbolMap[i.symbol.toUpperCase()])
            .filter(id => id))];

        if (idsToFetch.length === 0) return;

        try {
            // Check cache first
            const now = Date.now();
            const idsNeeded = idsToFetch.filter(id => {
                const cached = this.priceCache.get(id);
                return !cached || (now - cached.timestamp > this.CACHE_TTL);
            });

            if (idsNeeded.length > 0) {
                const response = await axios.get(`${this.COINGECKO_API}/simple/price`, {
                    params: {
                        ids: idsNeeded.join(','),
                        vs_currencies: 'inr' // Assuming INR base for ExpenseFlow
                    }
                });

                // Update cache
                Object.entries(response.data).forEach(([id, data]) => {
                    this.priceCache.set(id, {
                        price: data.inr,
                        timestamp: now
                    });
                });
            }

            // Update investments in DB (and in memory object for return)
            const updates = [];
            for (const inv of cryptoItems) {
                const coingeckoId = symbolMap[inv.symbol.toUpperCase()];
                if (coingeckoId) {
                    const cached = this.priceCache.get(coingeckoId);
                    if (cached) {
                        inv.currentPrice = cached.price;
                        inv.lastUpdated = new Date();
                        updates.push(inv.save());
                    }
                }
            }
            await Promise.all(updates);

        } catch (error) {
            console.error('Failed to fetch crypto prices:', error.message);
            // Continue with old prices if API fails
        }
    }

    /**
     * Add a new holding
     */
    async addHolding(userId, data) {
        const investment = new Investment({
            user: userId,
            ...data
        });

        // Try to fetch initial price if crypto
        if (data.type === 'crypto') {
            // Basic attempt to set current price immediately
            // This uses the updatePrices logic but just for this one (if we implemented single fetch)
            // For now, let it be 0 or user provided, auto-update on next getPortfolio call
            investment.currentPrice = data.currentPrice || data.buyPrice;
        }

        await investment.save();
        return investment;
    }

    /**
     * Remove a holding
     */
    async removeHolding(userId, investmentId) {
        return await Investment.findOneAndDelete({ _id: investmentId, user: userId });
    }
}

module.exports = new InvestmentService();
