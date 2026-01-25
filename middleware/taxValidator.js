const Joi = require('joi');

// Tax profile schema
const taxProfileSchema = Joi.object({
  country: Joi.string().valid('IN', 'US', 'UK', 'CA', 'AU').default('IN'),
  regime: Joi.string().valid('old', 'new').default('new'),
  filingStatus: Joi.string().valid('single', 'married_joint', 'married_separate', 'head_of_household').default('single'),
  standardDeduction: Joi.number().min(0),
  tdsDeducted: Joi.number().min(0).default(0),
  advanceTaxPaid: Joi.number().min(0).default(0),
  customDeductions: Joi.array().items(
    Joi.object({
      name: Joi.string().required().max(100),
      section: Joi.string().required().max(20),
      amount: Joi.number().min(0).required(),
      description: Joi.string().max(500)
    })
  )
});

// Tax calculation options
const taxCalculationSchema = Joi.object({
  taxYear: Joi.number().integer().min(2020).max(new Date().getFullYear() + 1),
  customDeductions: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      section: Joi.string(),
      amount: Joi.number().min(0).required()
    })
  )
});

// Report generation schema
const reportGenerationSchema = Joi.object({
  reportType: Joi.string().valid(
    'income_statement',
    'expense_summary',
    'profit_loss',
    'tax_report',
    'category_breakdown',
    'monthly_comparison',
    'annual_summary'
  ).required(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  currency: Joi.string().valid('INR', 'USD', 'EUR', 'GBP').default('INR'),
  includeForecasts: Joi.boolean().default(false),
  workspaceId: Joi.string().regex(/^[a-fA-F0-9]{24}$/)
});

// Report list query schema
const reportListSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  reportType: Joi.string().valid(
    'income_statement',
    'expense_summary',
    'profit_loss',
    'tax_report',
    'category_breakdown',
    'monthly_comparison',
    'annual_summary'
  ),
  status: Joi.string().valid('ready', 'processing', 'failed')
});

// Deduction category schema
const deductionCategorySchema = Joi.object({
  code: Joi.string().required().max(20),
  name: Joi.string().required().max(100),
  description: Joi.string().max(500),
  section: Joi.string().max(20),
  maxDeductionLimit: Joi.number().min(0),
  type: Joi.string().valid('deductible', 'partially_deductible', 'non_deductible').default('deductible'),
  deductiblePercentage: Joi.number().min(0).max(100).default(100),
  keywords: Joi.array().items(Joi.string()),
  categoryMappings: Joi.array().items(
    Joi.object({
      expenseCategory: Joi.string().required(),
      deductiblePercentage: Joi.number().min(0).max(100).default(100)
    })
  )
});

// Expense tax tagging schema
const expenseTaxTagSchema = Joi.object({
  expenseId: Joi.string().regex(/^[a-fA-F0-9]{24}$/).required(),
  isTaxDeductible: Joi.boolean().required(),
  taxCategory: Joi.string().max(50),
  section: Joi.string().max(20),
  deductiblePercentage: Joi.number().min(0).max(100)
});

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }
    
    req[property] = value;
    next();
  };
};

// Middleware exports
module.exports = {
  validateTaxProfile: validate(taxProfileSchema),
  validateTaxCalculation: validate(taxCalculationSchema),
  validateReportGeneration: validate(reportGenerationSchema),
  validateReportList: validate(reportListSchema, 'query'),
  validateDeductionCategory: validate(deductionCategorySchema),
  validateExpenseTaxTag: validate(expenseTaxTagSchema),
  
  // Alternative validation function
  validateRequest: validate,
  
  // Schema exports for reuse
  schemas: {
    taxProfileSchema,
    taxCalculationSchema,
    reportGenerationSchema,
    reportListSchema,
    deductionCategorySchema,
    expenseTaxTagSchema
  },
  
  // Alias for compatibility
  taxSchemas: {
    createProfile: taxProfileSchema,
    updateProfile: taxProfileSchema,
    createCategory: deductionCategorySchema
  }
};
