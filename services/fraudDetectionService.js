// Simple fraud detection service
const statistics = require('simple-statistics');

class FraudDetectionService {
  constructor() {
    this.riskThresholds = {
      amount: 2.5,
      frequency: 10,
      timeWindow: 24 * 60 * 60 * 1000
    };
  }

  init() {
    console.log('Fraud Detection Service initialized (simplified version)');
  }

  analyzeTransaction(transaction, userHistory = []) {
    const riskFactors = [];
    let riskScore = 0;

    // Amount analysis
    if (userHistory.length > 0) {
      const amounts = userHistory.map(t => t.amount);
      const mean = statistics.mean(amounts);
      const stdDev = statistics.standardDeviation(amounts);
      const zScore = Math.abs((transaction.amount - mean) / stdDev);
      
      if (zScore > this.riskThresholds.amount) {
        riskFactors.push('unusual_amount');
        riskScore += 0.3;
      }
    }

    // Time analysis
    const hour = new Date(transaction.date).getHours();
    if (hour < 6 || hour > 22) {
      riskFactors.push('unusual_time');
      riskScore += 0.2;
    }

    // Frequency analysis
    const recentTransactions = userHistory.filter(t => 
      new Date(t.date) > new Date(Date.now() - this.riskThresholds.timeWindow)
    );
    
    if (recentTransactions.length > this.riskThresholds.frequency) {
      riskFactors.push('high_frequency');
      riskScore += 0.4;
    }

    return {
      riskScore: Math.min(riskScore, 1),
      riskFactors,
      isSuspicious: riskScore > 0.7,
      recommendations: this.generateRecommendations(riskScore)
    };
  }

  generateRecommendations(riskScore) {
    if (riskScore > 0.8) return ['block_transaction', 'verify_identity'];
    if (riskScore > 0.5) return ['verify_transaction', 'monitor_activity'];
    return ['continue_monitoring'];
  }
}

module.exports = new FraudDetectionService();