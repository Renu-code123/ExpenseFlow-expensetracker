const { Client } = require('@elastic/elasticsearch');
const Fuse = require('fuse.js');
const natural = require('natural');

class ElasticsearchService {
  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      auth: process.env.ELASTICSEARCH_USERNAME ? {
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD
      } : undefined
    });
    this.index = process.env.ELASTICSEARCH_INDEX || 'expenseflow';
    this.isConnected = false;
    this.initializeIndex();
  }

  async initializeIndex() {
    try {
      const exists = await this.client.indices.exists({ index: this.index });
      if (!exists) {
        await this.client.indices.create({
          index: this.index,
          body: {
            mappings: {
              properties: {
                userId: { type: 'keyword' },
                description: { 
                  type: 'text',
                  analyzer: 'standard',
                  fields: {
                    keyword: { type: 'keyword' },
                    suggest: { type: 'completion' }
                  }
                },
                amount: { type: 'double' },
                category: { type: 'keyword' },
                tags: { type: 'keyword' },
                date: { type: 'date' },
                type: { type: 'keyword' },
                createdAt: { type: 'date' }
              }
            }
          }
        });
      }
      this.isConnected = true;
    } catch (error) {
      console.error('Elasticsearch connection failed:', error.message);
      this.isConnected = false;
    }
  }

  async indexExpense(expense) {
    if (!this.isConnected) return;
    
    try {
      await this.client.index({
        index: this.index,
        id: expense._id.toString(),
        body: {
          userId: expense.userId.toString(),
          description: expense.description,
          amount: expense.amount,
          category: expense.category,
          tags: expense.tags || [],
          date: expense.date,
          type: expense.type,
          createdAt: expense.createdAt
        }
      });
    } catch (error) {
      console.error('Failed to index expense:', error.message);
    }
  }

  async updateExpense(expenseId, expense) {
    if (!this.isConnected) return;
    
    try {
      await this.client.update({
        index: this.index,
        id: expenseId,
        body: {
          doc: {
            description: expense.description,
            amount: expense.amount,
            category: expense.category,
            tags: expense.tags || [],
            date: expense.date,
            type: expense.type
          }
        }
      });
    } catch (error) {
      console.error('Failed to update expense:', error.message);
    }
  }

  async deleteExpense(expenseId) {
    if (!this.isConnected) return;
    
    try {
      await this.client.delete({
        index: this.index,
        id: expenseId
      });
    } catch (error) {
      console.error('Failed to delete expense:', error.message);
    }
  }

  async search(userId, query, filters = {}, options = {}) {
    if (!this.isConnected) {
      return this.fallbackSearch(userId, query, filters, options);
    }

    try {
      const must = [
        { term: { userId: userId.toString() } }
      ];

      if (query) {
        must.push({
          multi_match: {
            query,
            fields: ['description^2', 'category', 'tags'],
            fuzziness: 'AUTO'
          }
        });
      }

      if (filters.dateRange) {
        must.push({
          range: {
            date: {
              gte: filters.dateRange.start,
              lte: filters.dateRange.end
            }
          }
        });
      }

      if (filters.amountRange) {
        must.push({
          range: {
            amount: {
              gte: filters.amountRange.min,
              lte: filters.amountRange.max
            }
          }
        });
      }

      if (filters.categories?.length) {
        must.push({
          terms: { category: filters.categories }
        });
      }

      if (filters.tags?.length) {
        must.push({
          terms: { tags: filters.tags }
        });
      }

      const result = await this.client.search({
        index: this.index,
        body: {
          query: { bool: { must } },
          sort: [
            { _score: { order: 'desc' } },
            { date: { order: 'desc' } }
          ],
          from: options.skip || 0,
          size: options.limit || 50,
          highlight: {
            fields: {
              description: {},
              category: {},
              tags: {}
            }
          }
        }
      });

      return {
        expenses: result.body.hits.hits.map(hit => ({
          ...hit._source,
          _id: hit._id,
          score: hit._score,
          highlights: hit.highlight
        })),
        total: result.body.hits.total.value,
        maxScore: result.body.hits.max_score
      };
    } catch (error) {
      console.error('Elasticsearch search failed:', error.message);
      return this.fallbackSearch(userId, query, filters, options);
    }
  }

  async getSuggestions(userId, query) {
    if (!this.isConnected) return [];

    try {
      const result = await this.client.search({
        index: this.index,
        body: {
          suggest: {
            description_suggest: {
              prefix: query,
              completion: {
                field: 'description.suggest',
                size: parseInt(process.env.SEARCH_SUGGESTIONS_LIMIT) || 10
              }
            }
          },
          query: {
            term: { userId: userId.toString() }
          }
        }
      });

      return result.body.suggest.description_suggest[0].options.map(option => ({
        text: option.text,
        score: option._score
      }));
    } catch (error) {
      console.error('Failed to get suggestions:', error.message);
      return [];
    }
  }

  async fallbackSearch(userId, query, filters, options) {
    const Expense = require('../models/Expense');
    
    let mongoQuery = { userId };

    if (query) {
      mongoQuery.$text = { $search: query };
    }

    if (filters.dateRange) {
      mongoQuery.date = {
        $gte: new Date(filters.dateRange.start),
        $lte: new Date(filters.dateRange.end)
      };
    }

    if (filters.amountRange) {
      mongoQuery.amount = {
        $gte: filters.amountRange.min,
        $lte: filters.amountRange.max
      };
    }

    if (filters.categories?.length) {
      mongoQuery.category = { $in: filters.categories };
    }

    if (filters.tags?.length) {
      mongoQuery.tags = { $in: filters.tags };
    }

    const expenses = await Expense.find(mongoQuery)
      .sort({ createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 50);

    const total = await Expense.countDocuments(mongoQuery);

    return { expenses, total, maxScore: null };
  }

  async getPopularQueries(userId, limit = 10) {
    const SearchQuery = require('../models/SearchQuery');
    
    return await SearchQuery.find({ userId })
      .sort({ executionCount: -1 })
      .limit(limit)
      .select('query executionCount lastExecuted');
  }

  async getSearchAnalytics(userId, dateRange) {
    const SearchQuery = require('../models/SearchQuery');
    
    const match = { userId };
    if (dateRange) {
      match.createdAt = {
        $gte: new Date(dateRange.start),
        $lte: new Date(dateRange.end)
      };
    }

    const analytics = await SearchQuery.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalSearches: { $sum: 1 },
          uniqueQueries: { $addToSet: '$query' },
          avgExecutionCount: { $avg: '$executionCount' }
        }
      },
      {
        $project: {
          totalSearches: 1,
          uniqueQueriesCount: { $size: '$uniqueQueries' },
          avgExecutionCount: { $round: ['$avgExecutionCount', 2] }
        }
      }
    ]);

    const topQueries = await SearchQuery.find(match)
      .sort({ executionCount: -1 })
      .limit(10)
      .select('query executionCount');

    return {
      summary: analytics[0] || { totalSearches: 0, uniqueQueriesCount: 0, avgExecutionCount: 0 },
      topQueries
    };
  }
}

module.exports = new ElasticsearchService();