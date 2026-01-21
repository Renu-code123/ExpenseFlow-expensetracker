const CategoryPattern = require('../models/CategoryPattern');
const MerchantDatabase = require('../models/MerchantDatabase');
const Expense = require('../models/Expense');

class CategorizationService {
    constructor() {
        // Pre-defined keyword mappings for common terms
        this.keywordMappings = {
            food: [
                'food', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast',
                'pizza', 'burger', 'sandwich', 'meal', 'dining', 'delivery', 'takeout',
                'grocery', 'vegetables', 'fruits', 'meat', 'bakery', 'sweets', 'snacks'
            ],
            transport: [
                'uber', 'ola', 'cab', 'taxi', 'bus', 'train', 'metro', 'petrol', 'diesel',
                'fuel', 'parking', 'toll', 'auto', 'rickshaw', 'bike', 'car', 'vehicle',
                'flight', 'ticket', 'travel', 'commute'
            ],
            entertainment: [
                'netflix', 'prime', 'hotstar', 'spotify', 'movie', 'cinema', 'theatre',
                'concert', 'show', 'game', 'gaming', 'subscription', 'streaming', 'music',
                'youtube', 'amazon prime', 'disney', 'ticket', 'entertainment'
            ],
            utilities: [
                'electricity', 'water', 'gas', 'internet', 'wifi', 'broadband', 'mobile',
                'phone', 'recharge', 'bill', 'rent', 'maintenance', 'airtel', 'jio', 'vi'
            ],
            healthcare: [
                'doctor', 'hospital', 'clinic', 'medical', 'medicine', 'pharmacy', 'health',
                'checkup', 'appointment', 'lab', 'test', 'diagnosis', 'surgery', 'dentist',
                'apollo', 'fortis', 'pharmeasy', 'netmeds'
            ],
            shopping: [
                'amazon', 'flipkart', 'shopping', 'clothes', 'fashion', 'shoes', 'electronics',
                'gadget', 'mobile', 'laptop', 'myntra', 'ajio', 'nykaa', 'purchase', 'buy',
                'order', 'store', 'mall', 'retail'
            ]
        };
        
        // Confidence thresholds
        this.MERCHANT_CONFIDENCE_THRESHOLD = 0.8;
        this.PATTERN_CONFIDENCE_THRESHOLD = 0.6;
        this.KEYWORD_CONFIDENCE_THRESHOLD = 0.5;
    }

    /**
     * Suggest category for a description
     * @param {string} userId - User ID
     * @param {string} description - Expense description
     * @returns {Promise<Object>} Category suggestions with confidence scores
     */
    async suggestCategory(userId, description) {
        const suggestions = [];
        
        // 1. Check merchant database (highest priority)
        const merchantMatch = await this.checkMerchantDatabase(description);
        if (merchantMatch) {
            suggestions.push({
                category: merchantMatch.category,
                confidence: merchantMatch.confidence,
                source: 'merchant',
                reason: `Recognized merchant: ${merchantMatch.merchantName}`
            });
        }
        
        // 2. Check user's learned patterns
        const patternMatches = await this.checkUserPatterns(userId, description);
        if (patternMatches.length > 0) {
            patternMatches.forEach(match => {
                suggestions.push({
                    category: match.category,
                    confidence: match.confidence,
                    source: 'user_pattern',
                    reason: `Matched your pattern: "${match.pattern}"`
                });
            });
        }
        
        // 3. Check keyword mappings
        const keywordMatch = this.checkKeywordMappings(description);
        if (keywordMatch) {
            suggestions.push({
                category: keywordMatch.category,
                confidence: keywordMatch.confidence,
                source: 'keyword',
                reason: `Matched keyword: "${keywordMatch.keyword}"`
            });
        }
        
        // 4. Check historical expenses for similar descriptions
        const historicalMatch = await this.checkHistoricalExpenses(userId, description);
        if (historicalMatch) {
            suggestions.push({
                category: historicalMatch.category,
                confidence: historicalMatch.confidence,
                source: 'historical',
                reason: `Similar to past expenses`
            });
        }
        
        // Aggregate suggestions by category and pick highest confidence
        const categoryScores = {};
        suggestions.forEach(sugg => {
            if (!categoryScores[sugg.category] || categoryScores[sugg.category].confidence < sugg.confidence) {
                categoryScores[sugg.category] = sugg;
            }
        });
        
        // Sort by confidence
        const sortedSuggestions = Object.values(categoryScores)
            .sort((a, b) => b.confidence - a.confidence);
        
        // Return top suggestions
        return {
            suggestions: sortedSuggestions.slice(0, 3),
            primarySuggestion: sortedSuggestions[0] || {
                category: 'other',
                confidence: 0.1,
                source: 'default',
                reason: 'No pattern found'
            }
        };
    }

    /**
     * Check merchant database for matches
     */
    async checkMerchantDatabase(description) {
        try {
            const merchant = await MerchantDatabase.searchMerchant(description);
            
            if (merchant && merchant.confidence >= this.MERCHANT_CONFIDENCE_THRESHOLD) {
                // Increment global usage
                merchant.globalUsageCount += 1;
                await merchant.save();
                
                return {
                    category: merchant.category,
                    confidence: merchant.confidence,
                    merchantName: merchant.merchantName
                };
            }
        } catch (error) {
            console.error('Merchant database check error:', error);
        }
        
        return null;
    }

    /**
     * Check user's learned patterns
     */
    async checkUserPatterns(userId, description) {
        try {
            const patterns = await CategoryPattern.findPatternsForDescription(userId, description);
            
            return patterns
                .filter(p => p.confidence >= this.PATTERN_CONFIDENCE_THRESHOLD)
                .map(p => ({
                    category: p.category,
                    confidence: p.confidence,
                    pattern: p.pattern
                }));
        } catch (error) {
            console.error('User pattern check error:', error);
            return [];
        }
    }

    /**
     * Check keyword mappings
     */
    checkKeywordMappings(description) {
        const descriptionLower = description.toLowerCase();
        const words = descriptionLower.split(/\s+/);
        
        let bestMatch = null;
        let highestScore = 0;
        
        for (const [category, keywords] of Object.entries(this.keywordMappings)) {
            for (const keyword of keywords) {
                // Check if keyword is in description
                if (descriptionLower.includes(keyword)) {
                    // Calculate TF-IDF like score
                    const wordCount = words.filter(w => w === keyword).length;
                    const score = (wordCount / words.length) * 0.8; // Base confidence for keyword match
                    
                    if (score > highestScore && score >= this.KEYWORD_CONFIDENCE_THRESHOLD) {
                        highestScore = score;
                        bestMatch = {
                            category,
                            confidence: Math.min(score, 0.85), // Cap at 0.85 for keyword matches
                            keyword
                        };
                    }
                }
            }
        }
        
        return bestMatch;
    }

    /**
     * Check historical expenses for similar descriptions
     */
    async checkHistoricalExpenses(userId, description) {
        try {
            const descriptionLower = description.toLowerCase();
            const words = new Set(descriptionLower.split(/\s+/).filter(w => w.length > 2));
            
            if (words.size === 0) return null;
            
            // Find recent expenses with similar descriptions
            const recentExpenses = await Expense.find({
                user: userId,
                category: { $ne: 'other' }
            })
            .sort({ createdAt: -1 })
            .limit(100);
            
            const categoryCounts = {};
            let totalMatches = 0;
            
            recentExpenses.forEach(expense => {
                const expenseWords = new Set(
                    expense.description.toLowerCase().split(/\s+/).filter(w => w.length > 2)
                );
                
                // Calculate word overlap
                const intersection = new Set([...words].filter(w => expenseWords.has(w)));
                const similarity = intersection.size / Math.max(words.size, expenseWords.size);
                
                if (similarity > 0.3) { // At least 30% word overlap
                    categoryCounts[expense.category] = (categoryCounts[expense.category] || 0) + similarity;
                    totalMatches += similarity;
                }
            });
            
            if (totalMatches === 0) return null;
            
            // Find category with highest score
            const topCategory = Object.entries(categoryCounts)
                .sort(([, a], [, b]) => b - a)[0];
            
            if (topCategory) {
                return {
                    category: topCategory[0],
                    confidence: Math.min((topCategory[1] / totalMatches) * 0.7, 0.75) // Cap at 0.75
                };
            }
        } catch (error) {
            console.error('Historical check error:', error);
        }
        
        return null;
    }

    /**
     * Learn from user correction
     * @param {string} userId - User ID
     * @param {string} description - Expense description
     * @param {string} suggestedCategory - Category that was suggested
     * @param {string} actualCategory - Category user selected
     */
    async trainFromCorrection(userId, description, suggestedCategory, actualCategory) {
        try {
            // If suggestion was correct, boost confidence
            if (suggestedCategory === actualCategory) {
                // Update patterns with positive feedback
                const patterns = await CategoryPattern.findPatternsForDescription(userId, description);
                for (const pattern of patterns) {
                    if (pattern.category === actualCategory) {
                        await pattern.updateUsage(true);
                    }
                }
            } else {
                // Correction needed - learn new patterns
                const patterns = await CategoryPattern.learnFromExpense(userId, description, actualCategory);
                
                // Reduce confidence of incorrect patterns
                const incorrectPatterns = await CategoryPattern.findPatternsForDescription(userId, description);
                for (const pattern of incorrectPatterns) {
                    if (pattern.category === suggestedCategory && pattern.category !== actualCategory) {
                        await pattern.updateUsage(false);
                    }
                }
                
                return {
                    patternsLearned: patterns.length,
                    message: 'Learned from your correction'
                };
            }
            
            return {
                message: 'Pattern confidence updated'
            };
        } catch (error) {
            console.error('Training error:', error);
            throw error;
        }
    }

    /**
     * Auto-learn from user's expense
     */
    async autoLearnFromExpense(userId, description, category) {
        if (category === 'other') return; // Don't learn from "other" category
        
        try {
            await CategoryPattern.learnFromExpense(userId, description, category);
        } catch (error) {
            console.error('Auto-learn error:', error);
        }
    }

    /**
     * Bulk categorize expenses
     * @param {string} userId - User ID
     * @param {Array} expenses - Array of expense objects with descriptions
     * @returns {Promise<Array>} Array of categorized expenses
     */
    async bulkCategorize(userId, expenses) {
        const results = [];
        
        for (const expense of expenses) {
            const suggestion = await this.suggestCategory(userId, expense.description);
            
            results.push({
                expenseId: expense._id || expense.id,
                description: expense.description,
                suggestedCategory: suggestion.primarySuggestion.category,
                confidence: suggestion.primarySuggestion.confidence,
                reason: suggestion.primarySuggestion.reason,
                alternatives: suggestion.suggestions.slice(1)
            });
        }
        
        return results;
    }

    /**
     * Get user's categorization statistics
     */
    async getUserStats(userId) {
        try {
            const patterns = await CategoryPattern.find({ user: userId, isActive: true });
            
            const stats = {
                totalPatterns: patterns.length,
                averageConfidence: patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length || 0,
                categoryCounts: {},
                topPatterns: []
            };
            
            // Count by category
            patterns.forEach(p => {
                stats.categoryCounts[p.category] = (stats.categoryCounts[p.category] || 0) + 1;
            });
            
            // Get top patterns
            stats.topPatterns = patterns
                .sort((a, b) => b.confidence - a.confidence)
                .slice(0, 10)
                .map(p => ({
                    pattern: p.pattern,
                    category: p.category,
                    confidence: p.confidence,
                    usageCount: p.usageCount
                }));
            
            return stats;
        } catch (error) {
            console.error('Stats error:', error);
            throw error;
        }
    }
}

module.exports = new CategorizationService();
