const DataWarehouse = require('../models/DataWarehouse');
const CustomDashboard = require('../models/CustomDashboard');
const FinancialHealthScore = require('../models/FinancialHealthScore');
const Expense = require('../models/Expense');
const ss = require('simple-statistics');

class AdvancedAnalyticsService {
  constructor() {
    this.kpiCalculators = new Map();
    this.predictiveModels = new Map();
    this.benchmarkData = new Map();
    this.init();
  }

  async init() {
    this.initializeKPICalculators();
    this.initializePredictiveModels();
    await this.loadBenchmarkData();
    this.startDataWarehouseUpdates();
    console.log('Advanced Analytics service initialized');
  }

  initializeKPICalculators() {
    this.kpiCalculators.set('burnRate', this.calculateBurnRate.bind(this));
    this.kpiCalculators.set('runwayMonths', this.calculateRunwayMonths.bind(this));
    this.kpiCalculators.set('expenseRatio', this.calculateExpenseRatio.bind(this));
    this.kpiCalculators.set('diversificationIndex', this.calculateDiversificationIndex.bind(this));
    this.kpiCalculators.set('savingsRate', this.calculateSavingsRate.bind(this));
    this.kpiCalculators.set('volatility', this.calculateVolatility.bind(this));
  }

  initializePredictiveModels() {
    this.predictiveModels.set('expense_forecast', this.forecastExpenses.bind(this));
    this.predictiveModels.set('income_forecast', this.forecastIncome.bind(this));
    this.predictiveModels.set('budget_forecast', this.forecastBudget.bind(this));
    this.predictiveModels.set('anomaly_detection', this.detectAnomalies.bind(this));
  }

  async loadBenchmarkData() {
    // Load industry benchmarks (would typically come from external APIs)
    this.benchmarkData.set('industry_averages', {
      savingsRate: 0.20,
      expenseRatio: 0.75,
      volatility: 0.15,
      diversification: 0.60
    });
  }

  async updateDataWarehouse(userId, workspaceId = null) {
    const periods = [
      { granularity: 'daily', days: 30 },
      { granularity: 'weekly', days: 90 },
      { granularity: 'monthly', days: 365 },
      { granularity: 'quarterly', days: 1095 },
      { granularity: 'yearly', days: 2190 }
    ];

    for (const period of periods) {
      await this.updateWarehousePeriod(userId, workspaceId, period);
    }
  }

  async updateWarehousePeriod(userId, workspaceId, period) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period.days);

    const expenses = await this.getExpensesForPeriod(userId, workspaceId, startDate, endDate);
    const groupedData = this.groupDataByPeriod(expenses, period.granularity);

    for (const [periodKey, periodExpenses] of groupedData.entries()) {
      const metrics = await this.calculateMetrics(periodExpenses);
      const trends = await this.calculateTrends(userId, workspaceId, periodKey, period.granularity);
      const kpis = await this.calculateKPIs(periodExpenses, userId, workspaceId);
      const benchmarks = await this.calculateBenchmarks(metrics, userId);
      const anomalies = await this.detectAnomalies(periodExpenses, userId, period.granularity);
      const predictions = await this.generatePredictions(userId, workspaceId, period.granularity);

      await DataWarehouse.findOneAndUpdate(
        {
          userId,
          workspaceId,
          period: this.parsePeriodKey(periodKey, period.granularity),
          granularity: period.granularity
        },
        {
          metrics,
          trends,
          kpis,
          benchmarks,
          anomalies,
          predictions,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
    }
  }

  async calculateMetrics(expenses) {
    const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    const transactionCount = expenses.length;

    const categoryBreakdown = this.calculateCategoryBreakdown(expenses);

    return {
      totalExpenses,
      totalIncome,
      netCashFlow: totalIncome - totalExpenses,
      transactionCount,
      averageTransactionSize: transactionCount > 0 ? (totalExpenses + totalIncome) / transactionCount : 0,
      categoryBreakdown,
      budgetUtilization: await this.calculateBudgetUtilization(expenses),
      savingsRate: totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0
    };
  }

  calculateCategoryBreakdown(expenses) {
    const categoryTotals = {};
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    expenses.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = { amount: 0, count: 0 };
      }
      categoryTotals[expense.category].amount += expense.amount;
      categoryTotals[expense.category].count += 1;
    });

    return Object.entries(categoryTotals).map(([category, data]) => ({
      category,
      amount: data.amount,
      percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
      transactionCount: data.count
    }));
  }

  async calculateTrends(userId, workspaceId, currentPeriod, granularity) {
    const previousPeriods = await this.getPreviousPeriods(userId, workspaceId, granularity, 3);
    
    if (previousPeriods.length < 2) {
      return { expenseGrowth: 0, incomeGrowth: 0, volatility: 0, seasonality: 0 };
    }

    const expenseValues = previousPeriods.map(p => p.metrics.totalExpenses);
    const incomeValues = previousPeriods.map(p => p.metrics.totalIncome);

    return {
      expenseGrowth: this.calculateGrowthRate(expenseValues),
      incomeGrowth: this.calculateGrowthRate(incomeValues),
      volatility: this.calculateVolatility(expenseValues),
      seasonality: this.calculateSeasonality(expenseValues)
    };
  }

  async calculateKPIs(expenses, userId, workspaceId) {
    const kpis = {};
    
    for (const [kpiName, calculator] of this.kpiCalculators.entries()) {
      try {
        kpis[kpiName] = await calculator(expenses, userId, workspaceId);
      } catch (error) {
        console.error(`Failed to calculate KPI ${kpiName}:`, error);
        kpis[kpiName] = 0;
      }
    }

    return kpis;
  }

  calculateBurnRate(expenses) {
    const monthlyExpenses = expenses.filter(e => e.type === 'expense');
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }

  calculateRunwayMonths(expenses, userId, workspaceId) {
    const burnRate = this.calculateBurnRate(expenses);
    const currentBalance = 10000; // Would get from actual balance
    return burnRate > 0 ? currentBalance / burnRate : Infinity;
  }

  calculateExpenseRatio(expenses) {
    const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    return totalIncome > 0 ? totalExpenses / totalIncome : 0;
  }

  calculateDiversificationIndex(expenses) {
    const categoryBreakdown = this.calculateCategoryBreakdown(expenses.filter(e => e.type === 'expense'));
    const totalExpenses = categoryBreakdown.reduce((sum, c) => sum + c.amount, 0);
    
    if (totalExpenses === 0) return 0;
    
    const proportions = categoryBreakdown.map(c => c.amount / totalExpenses);
    const herfindahlIndex = proportions.reduce((sum, p) => sum + p * p, 0);
    
    return 1 - herfindahlIndex; // Higher value means more diversified
  }

  calculateSavingsRate(expenses) {
    const totalExpenses = expenses.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = expenses.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0);
    return totalIncome > 0 ? (totalIncome - totalExpenses) / totalIncome : 0;
  }

  calculateVolatility(values) {
    if (values.length < 2) return 0;
    return ss.standardDeviation(values) / ss.mean(values);
  }

  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    return firstValue > 0 ? (lastValue - firstValue) / firstValue : 0;
  }

  calculateSeasonality(values) {
    if (values.length < 12) return 0;
    // Simplified seasonality calculation
    const quarters = [];
    for (let i = 0; i < values.length; i += 3) {
      const quarterSum = values.slice(i, i + 3).reduce((sum, v) => sum + v, 0);
      quarters.push(quarterSum);
    }
    return this.calculateVolatility(quarters);
  }

  async calculateBenchmarks(metrics, userId) {
    const industryBenchmarks = this.benchmarkData.get('industry_averages');
    const userHistory = await this.getUserHistoricalPerformance(userId);

    return {
      industryAverage: this.compareToIndustry(metrics, industryBenchmarks),
      peerComparison: await this.compareToPeers(metrics, userId),
      historicalPerformance: this.compareToHistory(metrics, userHistory)
    };
  }

  compareToIndustry(metrics, benchmarks) {
    const userSavingsRate = metrics.savingsRate;
    const industrySavingsRate = benchmarks.savingsRate;
    return industrySavingsRate > 0 ? userSavingsRate / industrySavingsRate : 0;
  }

  async compareToPeers(metrics, userId) {
    // Simplified peer comparison
    return Math.random() * 2; // Would implement actual peer comparison
  }

  compareToHistory(metrics, history) {
    if (!history || history.length === 0) return 1;
    const historicalAverage = ss.mean(history.map(h => h.savingsRate));
    return historicalAverage > 0 ? metrics.savingsRate / historicalAverage : 1;
  }

  async detectAnomalies(expenses, userId, granularity) {
    const anomalies = [];
    const historicalData = await this.getHistoricalData(userId, granularity, 12);
    
    if (historicalData.length < 3) return anomalies;

    const currentTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const historicalTotals = historicalData.map(d => d.metrics.totalExpenses);
    const mean = ss.mean(historicalTotals);
    const stdDev = ss.standardDeviation(historicalTotals);
    
    const zScore = Math.abs((currentTotal - mean) / stdDev);
    
    if (zScore > 2) {
      anomalies.push({
        type: currentTotal > mean ? 'spike' : 'drop',
        severity: zScore > 3 ? 'critical' : zScore > 2.5 ? 'high' : 'medium',
        description: `Unusual ${currentTotal > mean ? 'increase' : 'decrease'} in spending`,
        value: currentTotal,
        expectedValue: mean,
        confidence: Math.min(zScore / 3, 1)
      });
    }

    return anomalies;
  }

  async forecastExpenses(userId, workspaceId, periods = 3) {
    const historicalData = await this.getHistoricalData(userId, 'monthly', 12);
    
    if (historicalData.length < 3) {
      return { forecast: [], confidence: 0 };
    }

    const values = historicalData.map(d => d.metrics.totalExpenses);
    const trend = this.calculateTrend(values);
    const seasonality = this.calculateSeasonalityFactors(values);
    
    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      const baseValue = values[values.length - 1];
      const trendAdjustment = trend * i;
      const seasonalAdjustment = seasonality[i % seasonality.length] || 1;
      
      forecasts.push({
        period: i,
        value: (baseValue + trendAdjustment) * seasonalAdjustment,
        confidence: Math.max(0.9 - (i * 0.1), 0.3)
      });
    }

    return {
      forecast: forecasts,
      confidence: ss.mean(forecasts.map(f => f.confidence))
    };
  }

  async forecastIncome(userId, workspaceId, periods = 3) {
    // Similar to expense forecasting but for income
    return this.forecastExpenses(userId, workspaceId, periods);
  }

  async forecastBudget(userId, workspaceId, periods = 3) {
    const [expenseForecast, incomeForecast] = await Promise.all([
      this.forecastExpenses(userId, workspaceId, periods),
      this.forecastIncome(userId, workspaceId, periods)
    ]);

    return {
      periods: periods,
      forecasts: expenseForecast.forecast.map((exp, i) => ({
        period: i + 1,
        expectedExpenses: exp.value,
        expectedIncome: incomeForecast.forecast[i]?.value || 0,
        netCashFlow: (incomeForecast.forecast[i]?.value || 0) - exp.value,
        confidence: Math.min(exp.confidence, incomeForecast.forecast[i]?.confidence || 0)
      }))
    };
  }

  async calculateFinancialHealthScore(userId, workspaceId = null) {
    const currentPeriod = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };
    const expenses = await this.getExpensesForCurrentMonth(userId, workspaceId);
    const metrics = await this.calculateMetrics(expenses);
    const kpis = await this.calculateKPIs(expenses, userId, workspaceId);

    const scoreComponents = {
      cashFlowHealth: this.calculateCashFlowHealthScore(metrics, kpis),
      budgetCompliance: await this.calculateBudgetComplianceScore(userId, workspaceId),
      spendingPatterns: this.calculateSpendingPatternsScore(metrics),
      savingsRate: this.calculateSavingsRateScore(metrics.savingsRate),
      riskManagement: this.calculateRiskManagementScore(kpis)
    };

    const overallScore = this.calculateWeightedScore(scoreComponents);
    const riskAssessment = this.assessFinancialRisk(scoreComponents, metrics);
    const insights = this.generateFinancialInsights(scoreComponents, metrics, kpis);

    const healthScore = await FinancialHealthScore.findOneAndUpdate(
      { userId, workspaceId, period: currentPeriod },
      {
        overallScore,
        scoreComponents,
        riskAssessment,
        insights,
        benchmarks: await this.calculateBenchmarks(metrics, userId),
        calculationMetadata: {
          dataPoints: expenses.length,
          confidence: this.calculateConfidence(expenses.length),
          lastCalculated: new Date()
        }
      },
      { upsert: true, new: true }
    );

    return healthScore;
  }

  calculateCashFlowHealthScore(metrics, kpis) {
    const consistency = metrics.netCashFlow > 0 ? 100 : 0;
    const growth = Math.max(0, Math.min(100, (kpis.expenseRatio - 0.7) * 200));
    const volatility = Math.max(0, 100 - (kpis.volatility * 200));

    return {
      score: (consistency * 0.4 + growth * 0.3 + volatility * 0.3),
      weight: 25,
      factors: { consistency, growth, volatility }
    };
  }

  calculateWeightedScore(components) {
    const totalWeight = Object.values(components).reduce((sum, comp) => sum + comp.weight, 0);
    const weightedSum = Object.values(components).reduce((sum, comp) => sum + (comp.score * comp.weight), 0);
    return Math.round(weightedSum / totalWeight);
  }

  assessFinancialRisk(components, metrics) {
    const avgScore = Object.values(components).reduce((sum, comp) => sum + comp.score, 0) / Object.keys(components).length;
    
    let level;
    if (avgScore >= 80) level = 'very_low';
    else if (avgScore >= 60) level = 'low';
    else if (avgScore >= 40) level = 'moderate';
    else if (avgScore >= 20) level = 'high';
    else level = 'very_high';

    return {
      level,
      factors: this.identifyRiskFactors(components, metrics),
      recommendations: this.generateRiskRecommendations(level, components)
    };
  }

  identifyRiskFactors(components, metrics) {
    const factors = [];
    
    if (components.cashFlowHealth.score < 50) {
      factors.push({
        category: 'cash_flow',
        risk: 'Negative cash flow trend',
        impact: 'high',
        probability: 'likely',
        mitigation: 'Reduce expenses or increase income'
      });
    }

    return factors;
  }

  generateRiskRecommendations(level, components) {
    const recommendations = [];
    
    if (level === 'high' || level === 'very_high') {
      recommendations.push('Create an emergency budget plan');
      recommendations.push('Review and reduce non-essential expenses');
    }

    return recommendations;
  }

  generateFinancialInsights(components, metrics, kpis) {
    const insights = [];

    if (components.savingsRate.score > 80) {
      insights.push({
        type: 'strength',
        category: 'savings',
        description: 'Excellent savings rate above industry average',
        impact: 'high',
        actionable: false,
        recommendation: 'Continue current savings strategy'
      });
    }

    return insights;
  }

  // Helper methods
  async getExpensesForPeriod(userId, workspaceId, startDate, endDate) {
    const query = {
      userId,
      date: { $gte: startDate, $lte: endDate }
    };
    if (workspaceId) query.workspaceId = workspaceId;
    
    return await Expense.find(query).sort({ date: 1 });
  }

  groupDataByPeriod(expenses, granularity) {
    const grouped = new Map();
    
    expenses.forEach(expense => {
      const key = this.getPeriodKey(expense.date, granularity);
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(expense);
    });

    return grouped;
  }

  getPeriodKey(date, granularity) {
    const d = new Date(date);
    switch (granularity) {
      case 'daily':
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      case 'weekly':
        const week = Math.ceil(d.getDate() / 7);
        return `${d.getFullYear()}-${d.getMonth() + 1}-W${week}`;
      case 'monthly':
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
      case 'quarterly':
        const quarter = Math.ceil((d.getMonth() + 1) / 3);
        return `${d.getFullYear()}-Q${quarter}`;
      case 'yearly':
        return `${d.getFullYear()}`;
      default:
        return `${d.getFullYear()}-${d.getMonth() + 1}`;
    }
  }

  parsePeriodKey(key, granularity) {
    const parts = key.split('-');
    const period = { year: parseInt(parts[0]) };
    
    if (granularity !== 'yearly') {
      period.month = parseInt(parts[1]);
    }
    
    if (granularity === 'daily') {
      period.day = parseInt(parts[2]);
    } else if (granularity === 'weekly') {
      period.week = parseInt(parts[2].substring(1));
    }

    return period;
  }

  calculateConfidence(dataPoints) {
    return Math.min(dataPoints / 30, 1); // Full confidence with 30+ data points
  }

  startDataWarehouseUpdates() {
    // Update data warehouse every hour
    setInterval(async () => {
      console.log('Running scheduled data warehouse updates...');
      // Would implement batch updates for all users
    }, 60 * 60 * 1000);
  }
}

module.exports = new AdvancedAnalyticsService();