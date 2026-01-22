const SearchQuery = require('../models/SearchQuery');
const elasticsearchService = require('./elasticsearchService');
const natural = require('natural');

class SearchService {
  constructor() {
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
  }

  async executeSearch(userId, searchParams) {
    const { query, filters = {}, options = {} } = searchParams;

    // Track search query
    await this.trackSearchQuery(userId, query, filters);

    // Execute search
    const results = await elasticsearchService.search(userId, query, filters, options);

    // Process and enhance results
    return this.processSearchResults(results, query);
  }

  async trackSearchQuery(userId, query, filters) {
    if (!query || !process.env.SEARCH_ANALYTICS_ENABLED) return;

    try {
      const existingQuery = await SearchQuery.findOne({ userId, query });

      if (existingQuery) {
        existingQuery.executionCount += 1;
        existingQuery.lastExecuted = new Date();
        existingQuery.filters = filters;
        await existingQuery.save();
      } else {
        await SearchQuery.create({
          userId,
          query,
          filters,
          executionCount: 1
        });
      }
    } catch (error) {
      console.error('Failed to track search query:', error.message);
    }
  }

  processSearchResults(results, query) {
    if (!results.expenses) return results;

    // Add relevance scoring for fallback search
    if (!results.maxScore && query) {
      results.expenses = results.expenses.map(expense => {
        const score = this.calculateRelevanceScore(expense, query);
        return { ...expense, score };
      }).sort((a, b) => b.score - a.score);
    }

    return results;
  }

  calculateRelevanceScore(expense, query) {
    const queryTokens = this.tokenizer.tokenize(query.toLowerCase());
    const descTokens = this.tokenizer.tokenize(expense.description.toLowerCase());
    
    let score = 0;
    
    // Exact matches get higher score
    if (expense.description.toLowerCase().includes(query.toLowerCase())) {
      score += 10;
    }

    // Token matches
    queryTokens.forEach(token => {
      if (descTokens.includes(token)) {
        score += 5;
      }
      
      // Stemmed matches
      const stemmed = this.stemmer.stem(token);
      descTokens.forEach(descToken => {
        if (this.stemmer.stem(descToken) === stemmed) {
          score += 2;
        }
      });
    });

    // Category match
    if (expense.category && expense.category.toLowerCase().includes(query.toLowerCase())) {
      score += 8;
    }

    // Tag matches
    if (expense.tags) {
      expense.tags.forEach(tag => {
        if (tag.toLowerCase().includes(query.toLowerCase())) {
          score += 6;
        }
      });
    }

    return score;
  }

  async getSuggestions(userId, query) {
    if (!query || query.length < 2) return [];

    // Get Elasticsearch suggestions
    const esSuggestions = await elasticsearchService.getSuggestions(userId, query);

    // Get historical query suggestions
    const historicalSuggestions = await this.getHistoricalSuggestions(userId, query);

    // Combine and deduplicate
    const allSuggestions = [...esSuggestions, ...historicalSuggestions];
    const uniqueSuggestions = Array.from(
      new Map(allSuggestions.map(s => [s.text, s])).values()
    );

    return uniqueSuggestions
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, parseInt(process.env.SEARCH_SUGGESTIONS_LIMIT) || 10);
  }

  async getHistoricalSuggestions(userId, query) {
    try {
      const suggestions = await SearchQuery.find({
        userId,
        query: { $regex: query, $options: 'i' },
        executionCount: { $gt: 1 }
      })
      .sort({ executionCount: -1 })
      .limit(5)
      .select('query executionCount');

      return suggestions.map(s => ({
        text: s.query,
        score: s.executionCount
      }));
    } catch (error) {
      console.error('Failed to get historical suggestions:', error.message);
      return [];
    }
  }

  async saveSearchQuery(userId, queryData) {
    const { query, filters, name } = queryData;

    const savedQuery = await SearchQuery.create({
      userId,
      query,
      filters,
      name,
      isSaved: true
    });

    return savedQuery;
  }

  async getSavedQueries(userId) {
    return await SearchQuery.find({ userId, isSaved: true })
      .sort({ createdAt: -1 })
      .select('name query filters createdAt lastExecuted executionCount');
  }

  async deleteSavedQuery(userId, queryId) {
    return await SearchQuery.findOneAndDelete({ _id: queryId, userId });
  }

  async getSearchAnalytics(userId, dateRange) {
    return await elasticsearchService.getSearchAnalytics(userId, dateRange);
  }

  async getPopularQueries(userId, limit = 10) {
    return await elasticsearchService.getPopularQueries(userId, limit);
  }

  buildAdvancedFilters(filterParams) {
    const filters = {};

    if (filterParams.startDate || filterParams.endDate) {
      filters.dateRange = {
        start: filterParams.startDate || new Date('1970-01-01'),
        end: filterParams.endDate || new Date()
      };
    }

    if (filterParams.minAmount !== undefined || filterParams.maxAmount !== undefined) {
      filters.amountRange = {
        min: filterParams.minAmount || 0,
        max: filterParams.maxAmount || Number.MAX_SAFE_INTEGER
      };
    }

    if (filterParams.categories) {
      filters.categories = Array.isArray(filterParams.categories) 
        ? filterParams.categories 
        : [filterParams.categories];
    }

    if (filterParams.tags) {
      filters.tags = Array.isArray(filterParams.tags) 
        ? filterParams.tags 
        : [filterParams.tags];
    }

    return filters;
  }

  async getFilterOptions(userId) {
    const Expense = require('../models/Expense');

    const [categories, tags, amountRange, dateRange] = await Promise.all([
      Expense.distinct('category', { userId }),
      Expense.distinct('tags', { userId }),
      Expense.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            minAmount: { $min: '$amount' },
            maxAmount: { $max: '$amount' }
          }
        }
      ]),
      Expense.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' }
          }
        }
      ])
    ]);

    return {
      categories: categories.filter(Boolean),
      tags: tags.flat().filter(Boolean),
      amountRange: amountRange[0] || { minAmount: 0, maxAmount: 0 },
      dateRange: dateRange[0] || { minDate: new Date(), maxDate: new Date() }
    };
  }
}

module.exports = new SearchService();