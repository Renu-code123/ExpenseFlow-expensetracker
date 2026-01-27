const { TargetAllocation, RebalancingHistory, RebalancingAlert } = require('../models/PortfolioRebalancing');
const Portfolio = require('../models/Portfolio');
const Asset = require('../models/Asset');
const AssetTransaction = require('../models/AssetTransaction');

class RebalancingService {
  // Create or update target allocation
  async setTargetAllocation(userId, portfolioId, allocationData) {
    // Validate portfolio ownership
    const portfolio = await Portfolio.findOne({ _id: portfolioId, user: userId });
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    // Validate total percentage equals 100
    const totalPercentage = allocationData.allocations.reduce((sum, alloc) => sum + alloc.targetPercentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error('Total target allocation must equal 100%');
    }

    // Check if target allocation already exists
    let targetAllocation = await TargetAllocation.findOne({ 
      user: userId, 
      portfolio: portfolioId,
      isActive: true 
    });

    if (targetAllocation) {
      // Update existing
      Object.assign(targetAllocation, allocationData);
      targetAllocation.updatedAt = Date.now();
    } else {
      // Create new
      targetAllocation = new TargetAllocation({
        user: userId,
        portfolio: portfolioId,
        ...allocationData
      });
    }

    await targetAllocation.save();
    return targetAllocation;
  }

  // Get target allocation
  async getTargetAllocation(userId, portfolioId) {
    const targetAllocation = await TargetAllocation.findOne({
      user: userId,
      portfolio: portfolioId,
      isActive: true
    }).populate('portfolio');

    return targetAllocation;
  }

  // Get current portfolio allocation
  async getCurrentAllocation(portfolioId) {
    const portfolio = await Portfolio.findById(portfolioId).populate('holdings.asset');
    
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const holdings = portfolio.holdings || [];
    let totalValue = 0;
    const allocationMap = {};

    // Calculate current values and group by asset type
    for (const holding of holdings) {
      const asset = holding.asset;
      if (!asset) continue;

      const currentValue = holding.currentValue || 0;
      totalValue += currentValue;

      const assetType = asset.assetType || asset.type || 'other';
      
      if (!allocationMap[assetType]) {
        allocationMap[assetType] = {
          assetType,
          currentValue: 0,
          assets: []
        };
      }

      allocationMap[assetType].currentValue += currentValue;
      allocationMap[assetType].assets.push({
        id: asset._id,
        symbol: asset.symbol,
        name: asset.name,
        quantity: holding.quantity,
        currentValue,
        currentPrice: asset.currentPrice || 0
      });
    }

    // Calculate percentages
    const allocations = Object.values(allocationMap).map(alloc => ({
      ...alloc,
      currentPercentage: totalValue > 0 ? (alloc.currentValue / totalValue) * 100 : 0
    }));

    return {
      totalValue,
      allocations
    };
  }

  // Calculate rebalancing recommendations
  async calculateRebalancing(userId, portfolioId) {
    // Get target allocation
    const targetAllocation = await this.getTargetAllocation(userId, portfolioId);
    if (!targetAllocation) {
      throw new Error('No target allocation set for this portfolio');
    }

    // Get current allocation
    const currentAllocation = await this.getCurrentAllocation(portfolioId);
    const { totalValue, allocations: currentAllocations } = currentAllocation;

    if (totalValue === 0) {
      throw new Error('Portfolio has no value');
    }

    // Build comparison and calculate trades
    const recommendations = [];
    const preRebalanceState = [];
    const trades = [];

    for (const targetAlloc of targetAllocation.allocations) {
      const currentAlloc = currentAllocations.find(a => a.assetType === targetAlloc.assetType);
      const currentValue = currentAlloc ? currentAlloc.currentValue : 0;
      const currentPercentage = currentAlloc ? currentAlloc.currentPercentage : 0;
      const targetPercentage = targetAlloc.targetPercentage;
      const targetValue = (targetPercentage / 100) * totalValue;
      const deviation = currentPercentage - targetPercentage;
      const valueDeviation = currentValue - targetValue;

      preRebalanceState.push({
        assetType: targetAlloc.assetType,
        symbol: currentAlloc?.assets[0]?.symbol || '',
        name: currentAlloc?.assets[0]?.name || targetAlloc.assetType,
        currentValue,
        currentPercentage,
        targetPercentage,
        deviation
      });

      // Check if rebalancing is needed (outside tolerance band)
      const toleranceBand = targetAlloc.toleranceBand || 5;
      const needsRebalancing = Math.abs(deviation) > toleranceBand;

      if (needsRebalancing && Math.abs(valueDeviation) >= targetAllocation.rebalancingSettings.minTradeAmount) {
        // Determine action
        const action = valueDeviation > 0 ? 'sell' : 'buy';
        const tradeValue = Math.abs(valueDeviation);

        // Get assets of this type
        const assetsOfType = currentAlloc?.assets || [];
        
        if (action === 'sell' && assetsOfType.length > 0) {
          // Create sell trades
          let remainingValue = tradeValue;
          
          for (const asset of assetsOfType) {
            if (remainingValue <= 0) break;
            
            const sellValue = Math.min(remainingValue, asset.currentValue);
            const sharesToSell = asset.currentPrice > 0 ? sellValue / asset.currentPrice : 0;
            
            const tradingFee = sellValue * 0.001; // 0.1% trading fee
            const taxImpact = await this.calculateTaxImpact(userId, portfolioId, asset.id, sharesToSell, 'sell');
            
            trades.push({
              action: 'sell',
              asset: asset.id,
              symbol: asset.symbol,
              name: asset.name,
              assetType: targetAlloc.assetType,
              currentShares: asset.quantity,
              sharesToTrade: sharesToSell,
              tradeValue: sellValue,
              estimatedPrice: asset.currentPrice,
              estimatedFees: {
                tradingFee,
                exchangeFee: 0,
                totalFees: tradingFee
              },
              taxImpact,
              priority: Math.abs(deviation) > 15 ? 'high' : Math.abs(deviation) > 10 ? 'medium' : 'low'
            });
            
            remainingValue -= sellValue;
          }
        } else if (action === 'buy') {
          // Create buy trade (simplified - would need asset selection logic)
          const tradingFee = tradeValue * 0.001;
          
          trades.push({
            action: 'buy',
            asset: assetsOfType[0]?.id || null,
            symbol: assetsOfType[0]?.symbol || targetAlloc.assetType,
            name: assetsOfType[0]?.name || targetAlloc.assetType,
            assetType: targetAlloc.assetType,
            currentShares: 0,
            sharesToTrade: 0, // Would calculate based on selected asset price
            tradeValue,
            estimatedPrice: assetsOfType[0]?.currentPrice || 0,
            estimatedFees: {
              tradingFee,
              exchangeFee: 0,
              totalFees: tradingFee
            },
            taxImpact: {
              capitalGain: 0,
              holdingPeriod: 'n/a',
              estimatedTax: 0
            },
            priority: Math.abs(deviation) > 15 ? 'high' : Math.abs(deviation) > 10 ? 'medium' : 'low'
          });
        }
      }
    }

    // Calculate summary
    const summary = {
      totalTrades: trades.length,
      totalBuyValue: trades.filter(t => t.action === 'buy').reduce((sum, t) => sum + t.tradeValue, 0),
      totalSellValue: trades.filter(t => t.action === 'sell').reduce((sum, t) => sum + t.tradeValue, 0),
      totalFees: trades.reduce((sum, t) => sum + t.estimatedFees.totalFees, 0),
      totalTaxImpact: trades.reduce((sum, t) => sum + t.taxImpact.estimatedTax, 0),
      netCost: 0,
      deviationImprovement: 0
    };
    
    summary.netCost = summary.totalFees + summary.totalTaxImpact;
    
    // Calculate average deviation before rebalancing
    const avgDeviationBefore = preRebalanceState.reduce((sum, s) => sum + Math.abs(s.deviation), 0) / preRebalanceState.length;
    summary.deviationImprovement = avgDeviationBefore;

    return {
      preRebalance: {
        totalValue,
        allocations: preRebalanceState
      },
      recommendedTrades: trades,
      summary
    };
  }

  // Calculate tax impact for a trade
  async calculateTaxImpact(userId, portfolioId, assetId, quantity, action) {
    if (action !== 'sell') {
      return {
        capitalGain: 0,
        holdingPeriod: 'n/a',
        estimatedTax: 0
      };
    }

    // Get asset transactions to calculate cost basis
    const transactions = await AssetTransaction.find({
      user: userId,
      portfolio: portfolioId,
      asset: assetId,
      type: 'buy'
    }).sort({ date: 1 });

    let totalCostBasis = 0;
    let remainingQuantity = quantity;
    let hasLongTerm = false;
    let hasShortTerm = false;
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    for (const tx of transactions) {
      if (remainingQuantity <= 0) break;
      
      const txQuantity = Math.min(tx.quantity, remainingQuantity);
      totalCostBasis += txQuantity * tx.price;
      remainingQuantity -= txQuantity;
      
      if (tx.date < oneYearAgo) {
        hasLongTerm = true;
      } else {
        hasShortTerm = true;
      }
    }

    // Get current asset price
    const asset = await Asset.findById(assetId);
    const currentPrice = asset?.currentPrice || 0;
    const currentValue = quantity * currentPrice;
    const capitalGain = currentValue - totalCostBasis;

    // Estimate tax (simplified)
    const holdingPeriod = hasShortTerm ? 'short-term' : 'long-term';
    const taxRate = holdingPeriod === 'short-term' ? 0.25 : 0.15; // Simplified tax rates
    const estimatedTax = Math.max(0, capitalGain * taxRate);

    return {
      capitalGain,
      holdingPeriod,
      estimatedTax
    };
  }

  // Save rebalancing proposal
  async createRebalancingProposal(userId, portfolioId, rebalancingData) {
    const targetAllocation = await this.getTargetAllocation(userId, portfolioId);
    
    const rebalancing = new RebalancingHistory({
      user: userId,
      portfolio: portfolioId,
      targetAllocation: targetAllocation?._id,
      type: rebalancingData.type || 'manual',
      status: 'proposed',
      preRebalance: rebalancingData.preRebalance,
      recommendedTrades: rebalancingData.recommendedTrades,
      summary: rebalancingData.summary,
      notes: rebalancingData.notes
    });

    await rebalancing.save();
    return rebalancing;
  }

  // Get rebalancing history
  async getRebalancingHistory(userId, portfolioId, options = {}) {
    const query = { user: userId, portfolio: portfolioId };
    
    if (options.status) {
      query.status = options.status;
    }

    const history = await RebalancingHistory.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50)
      .populate('targetAllocation')
      .populate('portfolio');

    return history;
  }

  // Execute rebalancing
  async executeRebalancing(userId, rebalancingId) {
    const rebalancing = await RebalancingHistory.findOne({
      _id: rebalancingId,
      user: userId
    });

    if (!rebalancing) {
      throw new Error('Rebalancing not found');
    }

    if (rebalancing.status !== 'proposed' && rebalancing.status !== 'approved') {
      throw new Error('Rebalancing cannot be executed');
    }

    // Mark as executed (actual trade execution would happen here)
    rebalancing.status = 'executed';
    rebalancing.executedAt = Date.now();

    // Mark all trades as executed
    rebalancing.recommendedTrades.forEach(trade => {
      trade.executed = true;
      trade.executedAt = Date.now();
      trade.actualPrice = trade.estimatedPrice; // In real implementation, this would be the actual execution price
      trade.actualFees = trade.estimatedFees.totalFees;
    });

    // Calculate post-rebalance state
    const currentAllocation = await this.getCurrentAllocation(rebalancing.portfolio);
    rebalancing.postRebalance = {
      totalValue: currentAllocation.totalValue,
      allocations: currentAllocation.allocations.map(alloc => ({
        assetType: alloc.assetType,
        symbol: alloc.assets[0]?.symbol || '',
        name: alloc.assets[0]?.name || alloc.assetType,
        currentValue: alloc.currentValue,
        currentPercentage: alloc.currentPercentage,
        targetPercentage: 0, // Would match from target allocation
        deviation: 0
      }))
    };

    await rebalancing.save();

    // Update target allocation's next rebalance date
    if (rebalancing.targetAllocation) {
      const targetAllocation = await TargetAllocation.findById(rebalancing.targetAllocation);
      if (targetAllocation) {
        await targetAllocation.updateNextRebalanceDate();
      }
    }

    return rebalancing;
  }

  // Create rebalancing alert
  async createRebalancingAlert(userId, portfolioId, alertData) {
    const alert = new RebalancingAlert({
      user: userId,
      portfolio: portfolioId,
      ...alertData
    });

    await alert.save();
    return alert;
  }

  // Get pending alerts
  async getPendingAlerts(userId, portfolioId = null) {
    const query = {
      user: userId,
      read: false,
      dismissed: false
    };

    if (portfolioId) {
      query.portfolio = portfolioId;
    }

    const alerts = await RebalancingAlert.find(query)
      .sort({ createdAt: -1 })
      .populate('portfolio')
      .populate('targetAllocation');

    return alerts;
  }

  // Check if rebalancing is needed
  async checkRebalancingNeeded(userId, portfolioId) {
    const targetAllocation = await this.getTargetAllocation(userId, portfolioId);
    if (!targetAllocation) {
      return { needed: false, reason: 'No target allocation set' };
    }

    const currentAllocation = await this.getCurrentAllocation(portfolioId);
    let maxDeviation = 0;
    const deviations = [];

    for (const targetAlloc of targetAllocation.allocations) {
      const currentAlloc = currentAllocation.allocations.find(a => a.assetType === targetAlloc.assetType);
      const currentPercentage = currentAlloc ? currentAlloc.currentPercentage : 0;
      const deviation = Math.abs(currentPercentage - targetAlloc.targetPercentage);
      
      deviations.push({
        assetType: targetAlloc.assetType,
        deviation,
        exceedsTolerance: deviation > (targetAlloc.toleranceBand || 5)
      });

      if (deviation > maxDeviation) {
        maxDeviation = deviation;
      }
    }

    const exceedsTolerance = deviations.some(d => d.exceedsTolerance);

    return {
      needed: exceedsTolerance,
      maxDeviation,
      deviations,
      reason: exceedsTolerance ? 'Portfolio allocation exceeds tolerance bands' : 'Portfolio is within tolerance'
    };
  }
}

module.exports = new RebalancingService();
