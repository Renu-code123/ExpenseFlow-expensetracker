const Joi = require('joi');

/* =========================
   COMMON HELPERS
========================= */

const objectId = Joi.string().regex(/^[0-9a-fA-F]{24}$/);
const currencyCode = Joi.string().length(3).uppercase();
const positiveNumber = Joi.number().positive();

const assetTypes = [
  'stock',
  'crypto',
  'bond',
  'mutual_fund',
  'etf',
  'real_estate',
  'commodity',
  'cash',
  'other'
];

const transactionTypes = [
  'buy',
  'sell',
  'dividend',
  'split',
  'transfer_in',
  'transfer_out',
  'fee',
  'interest'
];

const costBasisMethods = ['fifo', 'lifo', 'average'];

/* =========================
   PORTFOLIO SCHEMAS
========================= */

const createPortfolioSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().allow(''),
  baseCurrency: currencyCode.default('USD'),
  costBasisMethod: Joi.string().valid(...costBasisMethods).default('fifo'),
  isDefault: Joi.boolean().default(false)
});

const updatePortfolioSchema = Joi.object({
  name: Joi.string().min(1).max(100),
  description: Joi.string().allow(''),
  baseCurrency: currencyCode,
  costBasisMethod: Joi.string().valid(...costBasisMethods),
  isDefault: Joi.boolean()
}).min(1);

/* =========================
   TRANSACTION SCHEMAS
========================= */

const buyTransactionSchema = Joi.object({
  portfolioId: objectId.required(),
  symbol: Joi.string().uppercase().required(),
  assetType: Joi.string().valid(...assetTypes).default('stock'),
  quantity: positiveNumber.required(),
  price: positiveNumber.required(),
  currency: currencyCode.default('USD'),
  date: Joi.date().default(Date.now),
  notes: Joi.string().allow('')
});

const sellTransactionSchema = Joi.object({
  portfolioId: objectId.required(),
  symbol: Joi.string().uppercase().required(),
  quantity: positiveNumber.required(),
  price: positiveNumber.required(),
  currency: currencyCode.default('USD'),
  date: Joi.date().default(Date.now),
  notes: Joi.string().allow('')
});

const dividendSchema = Joi.object({
  portfolioId: objectId.required(),
  symbol: Joi.string().uppercase().required(),
  totalAmount: positiveNumber.required(),
  currency: currencyCode.default('USD'),
  date: Joi.date().default(Date.now)
});

const transferSchema = Joi.object({
  fromPortfolioId: objectId,
  toPortfolioId: objectId,
  symbol: Joi.string().uppercase().required(),
  quantity: positiveNumber.required(),
  costBasis: positiveNumber.required(),
  purchaseDate: Joi.date().required(),
  notes: Joi.string().allow('')
}).or('fromPortfolioId', 'toPortfolioId');

/* =========================
   ASSET SCHEMAS
========================= */

const searchAssetsSchema = Joi.object({
  query: Joi.string().required(),
  type: Joi.string().valid(...assetTypes),
  limit: Joi.number().min(1).max(100).default(20)
});

const priceHistorySchema = Joi.object({
  assetId: objectId.required(),
  interval: Joi.string().default('daily'),
  days: Joi.number().default(365)
});

const manualPriceUpdateSchema = Joi.object({
  assetId: objectId.required(),
  price: positiveNumber.required()
});

/* =========================
   WATCHLIST SCHEMAS
========================= */

const addToWatchlistSchema = Joi.object({
  symbol: Joi.string().required(),
  type: Joi.string().valid('stock', 'crypto', 'etf').default('stock')
});

const removeFromWatchlistSchema = Joi.object({
  assetId: objectId.required()
});

/* =========================
   HISTORY SCHEMAS
========================= */

const portfolioHistorySchema = Joi.object({
  portfolioId: objectId.required(),
  days: Joi.number().default(365)
});

const transactionHistorySchema = Joi.object({
  portfolioId: objectId,
  assetId: objectId,
  type: Joi.string().valid(...transactionTypes),
  page: Joi.number().default(1),
  limit: Joi.number().default(50)
});

/* =========================
   EXTRA SCHEMAS (FIXED)
========================= */

const getPortfoliosSchema = Joi.object({});

const snapshotSchema = Joi.object({
  portfolioId: objectId.required()
});

const rebalanceSchema = Joi.object({
  portfolioId: objectId.required()
});

/* =========================
   VALIDATOR MIDDLEWARE
========================= */

const validate = (schema) => {
  return (req, res, next) => {
    const data = {
      ...req.body,
      ...req.params,
      ...req.query
    };

    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    req.validated = value;
    next();
  };
};

/* =========================
   EXPORTS
========================= */

module.exports = {

  // schemas
  createPortfolioSchema,
  updatePortfolioSchema,
  buyTransactionSchema,
  sellTransactionSchema,
  dividendSchema,
  transferSchema,
  searchAssetsSchema,
  priceHistorySchema,
  manualPriceUpdateSchema,
  addToWatchlistSchema,
  removeFromWatchlistSchema,
  portfolioHistorySchema,
  transactionHistorySchema,

  // middleware
  validate,

  validateCreatePortfolio: validate(createPortfolioSchema),
  validateUpdatePortfolio: validate(updatePortfolioSchema),
  validateBuyTransaction: validate(buyTransactionSchema),
  validateSellTransaction: validate(sellTransactionSchema),
  validateDividend: validate(dividendSchema),
  validateTransfer: validate(transferSchema),
  validateSearchAssets: validate(searchAssetsSchema),
  validatePriceHistory: validate(priceHistorySchema),
  validateManualPriceUpdate: validate(manualPriceUpdateSchema),
  validateAddToWatchlist: validate(addToWatchlistSchema),
  validateRemoveFromWatchlist: validate(removeFromWatchlistSchema),
  validatePortfolioHistory: validate(portfolioHistorySchema),
  validateTransactionHistory: validate(transactionHistorySchema),

  validateGetPortfolios: validate(getPortfoliosSchema),
  validateSnapshot: validate(snapshotSchema),
  validateRebalance: validate(rebalanceSchema)
};
