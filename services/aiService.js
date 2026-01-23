const tf = require('@tensorflow/tfjs-node');
const brain = require('brain.js');
const natural = require('natural');
const ss = require('simple-statistics');
const AIPrediction = require('../models/AIPrediction');
const AITrainingData = require('../models/AITrainingData');

class AIService {
  constructor() {
    this.models = new Map();
    this.isInitialized = false;
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.init();
  }

  async init() {
    try {
      await this.loadModels();
      this.isInitialized = true;
      console.log('AI Service initialized');
    } catch (error) {
      console.error('AI Service initialization failed:', error.message);
    }
  }

  async loadModels() {
    // Initialize category classifier
    this.models.set('category_classifier', new brain.NeuralNetwork({
      hiddenLayers: [10, 5],
      activation: 'sigmoid'
    }));

    // Initialize fraud detector
    this.models.set('fraud_detector', new brain.NeuralNetwork({
      hiddenLayers: [15, 8, 3],
      activation: 'relu'
    }));

    // Load pre-trained models if they exist
    await this.loadPreTrainedModels();
  }

  async loadPreTrainedModels() {
    // Load saved models from database or file system
    // Implementation for model persistence
  }

  async predictExpenseCategory(userId, description, amount, merchant) {
    if (!this.isInitialized) return null;

    try {
      const features = this.extractCategoryFeatures(description, amount, merchant);
      const model = this.models.get('category_classifier');
      
      if (!model.run) {
        await this.trainCategoryModel(userId);
      }

      const prediction = model.run(features);
      const categories = ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other'];
      
      let maxConfidence = 0;
      let predictedCategory = 'other';
      
      Object.keys(prediction).forEach(key => {
        if (prediction[key] > maxConfidence) {
          maxConfidence = prediction[key];
          predictedCategory = categories[parseInt(key)] || 'other';
        }
      });

      await this.savePrediction(userId, 'category_prediction', {
        description, amount, merchant
      }, predictedCategory, maxConfidence);

      return {
        category: predictedCategory,
        confidence: maxConfidence,
        alternatives: this.getAlternativeCategories(prediction, categories)
      };
    } catch (error) {
      console.error('Category prediction error:', error);
      return null;
    }
  }

  extractCategoryFeatures(description, amount, merchant) {
    const tokens = this.tokenizer.tokenize(description.toLowerCase());
    const stemmed = tokens.map(token => this.stemmer.stem(token));
    
    // Create feature vector
    const features = {
      // Amount features
      amount_log: Math.log(amount + 1),
      amount_range: this.getAmountRange(amount),
      
      // Text features
      word_count: tokens.length,
      has_food_words: this.hasKeywords(stemmed, ['food', 'restaurant', 'cafe', 'lunch', 'dinner']),
      has_transport_words: this.hasKeywords(stemmed, ['uber', 'taxi', 'gas', 'fuel', 'parking']),
      has_entertainment_words: this.hasKeywords(stemmed, ['movie', 'game', 'music', 'entertainment']),
      has_shopping_words: this.hasKeywords(stemmed, ['store', 'shop', 'mall', 'amazon', 'purchase']),
      
      // Merchant features
      merchant_length: merchant ? merchant.length : 0,
      is_online: merchant ? merchant.includes('.com') || merchant.includes('online') : false
    };

    return features;
  }

  async detectFraud(userId, expense) {
    if (!this.isInitialized) return null;

    try {
      const userHistory = await this.getUserSpendingHistory(userId);
      const features = this.extractFraudFeatures(expense, userHistory);
      
      const model = this.models.get('fraud_detector');
      const prediction = model.run ? model.run(features) : { fraud: 0.1 };
      
      const isFraud = prediction.fraud > parseFloat(process.env.AI_PREDICTION_THRESHOLD || 0.7);
      
      await this.savePrediction(userId, 'anomaly_detection', expense, {
        isFraud,
        riskScore: prediction.fraud,
        reasons: this.getFraudReasons(features, prediction)
      }, prediction.fraud);

      return {
        isFraud,
        riskScore: prediction.fraud,
        reasons: this.getFraudReasons(features, prediction)
      };
    } catch (error) {
      console.error('Fraud detection error:', error);
      return null;
    }
  }

  extractFraudFeatures(expense, userHistory) {
    const avgAmount = ss.mean(userHistory.map(e => e.amount));
    const stdAmount = ss.standardDeviation(userHistory.map(e => e.amount));
    
    return {
      amount_zscore: (expense.amount - avgAmount) / (stdAmount || 1),
      is_weekend: new Date(expense.date).getDay() % 6 === 0,
      hour_of_day: new Date(expense.date).getHours(),
      is_unusual_time: this.isUnusualTime(expense.date, userHistory),
      amount_percentile: this.getAmountPercentile(expense.amount, userHistory),
      category_frequency: this.getCategoryFrequency(expense.category, userHistory),
      location_anomaly: this.detectLocationAnomaly(expense, userHistory)
    };
  }

  async predictCashFlow(userId, days = 30) {
    try {
      const expenses = await this.getUserExpenses(userId, 90);
      const patterns = this.analyzeSpendingPatterns(expenses);
      
      const prediction = {
        totalExpected: patterns.dailyAverage * days,
        categoryBreakdown: patterns.categoryAverages,
        confidence: patterns.confidence,
        trends: patterns.trends
      };

      await this.savePrediction(userId, 'cash_flow_forecast', { days }, prediction, patterns.confidence);
      
      return prediction;
    } catch (error) {
      console.error('Cash flow prediction error:', error);
      return null;
    }
  }

  analyzeSpendingPatterns(expenses) {
    const dailyTotals = this.groupByDay(expenses);
    const categoryTotals = this.groupByCategory(expenses);
    
    return {
      dailyAverage: ss.mean(Object.values(dailyTotals)),
      categoryAverages: Object.fromEntries(
        Object.entries(categoryTotals).map(([cat, amounts]) => [cat, ss.mean(amounts)])
      ),
      confidence: this.calculatePatternConfidence(dailyTotals),
      trends: this.detectTrends(dailyTotals)
    };
  }

  async generateRecommendations(userId) {
    try {
      const expenses = await this.getUserExpenses(userId, 60);
      const patterns = this.analyzeSpendingPatterns(expenses);
      const anomalies = await this.detectSpendingAnomalies(userId, expenses);
      
      const recommendations = [];
      
      // Budget recommendations
      if (patterns.trends.increasing) {
        recommendations.push({
          type: 'budget_alert',
          message: 'Your spending is trending upward. Consider setting stricter budgets.',
          priority: 'high'
        });
      }
      
      // Category-specific recommendations
      Object.entries(patterns.categoryAverages).forEach(([category, avg]) => {
        if (avg > this.getCategoryBenchmark(category)) {
          recommendations.push({
            type: 'category_optimization',
            category,
            message: `Your ${category} spending is above average. Look for savings opportunities.`,
            priority: 'medium'
          });
        }
      });
      
      // Anomaly-based recommendations
      anomalies.forEach(anomaly => {
        recommendations.push({
          type: 'anomaly_alert',
          message: `Unusual ${anomaly.category} expense detected: $${anomaly.amount}`,
          priority: 'high'
        });
      });

      return recommendations;
    } catch (error) {
      console.error('Recommendation generation error:', error);
      return [];
    }
  }

  async trainCategoryModel(userId) {
    try {
      const trainingData = await AITrainingData.find({
        userId,
        modelType: 'category_classifier',
        isValidated: true
      });

      if (trainingData.length < 10) return;

      const formattedData = trainingData.map(data => ({
        input: this.formatFeatures(data.features),
        output: this.formatCategoryOutput(data.label)
      }));

      const model = this.models.get('category_classifier');
      await model.trainAsync(formattedData, {
        iterations: 2000,
        errorThresh: 0.005,
        learningRate: 0.3
      });

      console.log(`Category model trained for user ${userId}`);
    } catch (error) {
      console.error('Model training error:', error);
    }
  }

  async savePrediction(userId, type, inputData, prediction, confidence) {
    try {
      await AIPrediction.create({
        userId,
        type,
        inputData,
        prediction,
        confidence,
        modelVersion: '1.0'
      });
    } catch (error) {
      console.error('Save prediction error:', error);
    }
  }

  // Helper methods
  hasKeywords(tokens, keywords) {
    return keywords.some(keyword => tokens.includes(keyword));
  }

  getAmountRange(amount) {
    if (amount < 10) return 0;
    if (amount < 50) return 1;
    if (amount < 100) return 2;
    if (amount < 500) return 3;
    return 4;
  }

  isUnusualTime(date, history) {
    const hour = new Date(date).getHours();
    const historicalHours = history.map(e => new Date(e.date).getHours());
    const avgHour = ss.mean(historicalHours);
    return Math.abs(hour - avgHour) > 6;
  }

  getAmountPercentile(amount, history) {
    const amounts = history.map(e => e.amount).sort((a, b) => a - b);
    const index = amounts.findIndex(a => a >= amount);
    return index / amounts.length;
  }

  getCategoryFrequency(category, history) {
    const categoryCount = history.filter(e => e.category === category).length;
    return categoryCount / history.length;
  }

  detectLocationAnomaly(expense, history) {
    // Simplified location anomaly detection
    return 0.1; // Low anomaly score by default
  }

  groupByDay(expenses) {
    const groups = {};
    expenses.forEach(expense => {
      const day = new Date(expense.date).toDateString();
      groups[day] = (groups[day] || 0) + expense.amount;
    });
    return groups;
  }

  groupByCategory(expenses) {
    const groups = {};
    expenses.forEach(expense => {
      if (!groups[expense.category]) groups[expense.category] = [];
      groups[expense.category].push(expense.amount);
    });
    return groups;
  }

  calculatePatternConfidence(dailyTotals) {
    const values = Object.values(dailyTotals);
    const cv = ss.standardDeviation(values) / ss.mean(values);
    return Math.max(0, 1 - cv); // Lower coefficient of variation = higher confidence
  }

  detectTrends(dailyTotals) {
    const values = Object.values(dailyTotals);
    const slope = ss.linearRegressionLine(ss.linearRegression(
      values.map((v, i) => [i, v])
    ));
    
    return {
      increasing: slope(values.length) > slope(0),
      slope: slope(values.length) - slope(0)
    };
  }

  getCategoryBenchmark(category) {
    const benchmarks = {
      food: 300,
      transport: 200,
      entertainment: 150,
      utilities: 250,
      healthcare: 100,
      shopping: 200,
      other: 100
    };
    return benchmarks[category] || 100;
  }

  async getUserExpenses(userId, days) {
    const Expense = require('../models/Expense');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    return await Expense.find({
      userId,
      date: { $gte: startDate }
    }).sort({ date: -1 });
  }

  async getUserSpendingHistory(userId) {
    return await this.getUserExpenses(userId, 30);
  }

  async detectSpendingAnomalies(userId, expenses) {
    const anomalies = [];
    const threshold = parseFloat(process.env.AI_ANOMALY_THRESHOLD || 2.5);
    
    const amounts = expenses.map(e => e.amount);
    const mean = ss.mean(amounts);
    const std = ss.standardDeviation(amounts);
    
    expenses.forEach(expense => {
      const zscore = Math.abs((expense.amount - mean) / std);
      if (zscore > threshold) {
        anomalies.push({
          ...expense,
          zscore,
          severity: zscore > 3 ? 'high' : 'medium'
        });
      }
    });
    
    return anomalies;
  }

  formatFeatures(features) {
    const formatted = {};
    features.forEach(feature => {
      formatted[feature.name] = feature.value;
    });
    return formatted;
  }

  formatCategoryOutput(category) {
    const categories = ['food', 'transport', 'entertainment', 'utilities', 'healthcare', 'shopping', 'other'];
    const output = {};
    categories.forEach((cat, index) => {
      output[index] = cat === category ? 1 : 0;
    });
    return output;
  }

  getAlternativeCategories(prediction, categories) {
    return Object.entries(prediction)
      .map(([index, confidence]) => ({
        category: categories[parseInt(index)],
        confidence
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(1, 4);
  }

  getFraudReasons(features, prediction) {
    const reasons = [];
    if (features.amount_zscore > 2) reasons.push('Unusually high amount');
    if (features.is_unusual_time) reasons.push('Unusual transaction time');
    if (features.location_anomaly > 0.5) reasons.push('Unusual location');
    return reasons;
  }
}

module.exports = new AIService();