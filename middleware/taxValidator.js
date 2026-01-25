const Joi = require('joi');

/**
 * Validation schemas for Tax API endpoints
 */
const taxSchemas = {
  // Create/Update tax profile
  createProfile: Joi.object({
    jurisdiction: Joi.string()
      .valid('US', 'UK', 'IN', 'CA', 'AU', 'DE', 'FR', 'OTHER')
      .required(),
    state: Joi.string().max(50),
    filingStatus: Joi.string()
      .valid(
        'single',
        'married_filing_jointly',
        'married_filing_separately',
        'head_of_household',
        'qualifying_widow',
        'self_employed',
        'business_owner'
      )
      .required(),
    employmentType: Joi.string()
      .valid('employed', 'self_employed', 'freelancer', 'business_owner', 'retired', 'mixed')
      .default('employed'),
    currentTaxYear: Joi.number().integer().min(2000).max(2100),
    estimatedAnnualIncome: Joi.number().min(0),
    additionalIncomeSources: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('salary', 'freelance', 'rental', 'investment', 'business', 'pension', 'other'),
        description: Joi.string().max(200),
        estimatedAmount: Joi.number().min(0),
        frequency: Joi.string().valid('one_time', 'monthly', 'quarterly', 'annually')
      })
    ),
    businessInfo: Joi.object({
      name: Joi.string().max(200),
      ein: Joi.string().pattern(/^[0-9]{2}-[0-9]{7}$/),
      businessType: Joi.string().valid('sole_proprietorship', 'llc', 'partnership', 's_corp', 'c_corp', 'other'),
      industryCode: Joi.string().max(10),
      homeOffice: Joi.object({
        enabled: Joi.boolean(),
        squareFootage: Joi.number().min(0),
        totalHomeSquareFootage: Joi.number().min(0),
        method: Joi.string().valid('simplified', 'regular')
      })
    }),
    vehicleTracking: Joi.object({
      enabled: Joi.boolean(),
      vehicles: Joi.array().items(
        Joi.object({
          name: Joi.string().max(100),
          businessUsePercentage: Joi.number().min(0).max(100),
          method: Joi.string().valid('standard_mileage', 'actual_expense')
        })
      )
    }),
    retirementAccounts: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('401k', 'traditional_ira', 'roth_ira', 'sep_ira', 'simple_ira', '403b', 'pension', 'other'),
        contribution: Joi.number().min(0),
        employerMatch: Joi.number().min(0)
      })
    ),
    hsaAccount: Joi.object({
      enabled: Joi.boolean(),
      contribution: Joi.number().min(0),
      coverageType: Joi.string().valid('self', 'family')
    }),
    dependents: Joi.array().items(
      Joi.object({
        name: Joi.string().max(100).required(),
        relationship: Joi.string().valid('child', 'parent', 'sibling', 'other').required(),
        dateOfBirth: Joi.date(),
        monthsLived: Joi.number().min(0).max(12),
        qualifiesForChildTaxCredit: Joi.boolean()
      })
    ),
    notifications: Joi.object({
      quarterlyReminders: Joi.boolean(),
      deductionAlerts: Joi.boolean(),
      yearEndReminders: Joi.boolean(),
      documentReminders: Joi.boolean()
    })
  }),

  // Update profile (partial)
  updateProfile: Joi.object({
    jurisdiction: Joi.string().valid('US', 'UK', 'IN', 'CA', 'AU', 'DE', 'FR', 'OTHER'),
    state: Joi.string().max(50),
    filingStatus: Joi.string().valid(
      'single',
      'married_filing_jointly',
      'married_filing_separately',
      'head_of_household',
      'qualifying_widow',
      'self_employed',
      'business_owner'
    ),
    employmentType: Joi.string().valid('employed', 'self_employed', 'freelancer', 'business_owner', 'retired', 'mixed'),
    estimatedAnnualIncome: Joi.number().min(0),
    additionalIncomeSources: Joi.array().items(Joi.object()),
    businessInfo: Joi.object(),
    vehicleTracking: Joi.object(),
    retirementAccounts: Joi.array(),
    hsaAccount: Joi.object(),
    dependents: Joi.array(),
    notifications: Joi.object()
  }),

  // Create custom tax category
  createCategory: Joi.object({
    name: Joi.string().required().max(100),
    code: Joi.string().required().uppercase().max(20),
    description: Joi.string().required().max(500),
    jurisdiction: Joi.string().valid('US', 'UK', 'IN', 'CA', 'AU', 'DE', 'FR', 'ALL').default('ALL'),
    categoryType: Joi.string()
      .valid(
        'business_expense',
        'home_office',
        'vehicle_mileage',
        'healthcare',
        'education',
        'charitable',
        'investment',
        'retirement',
        'state_local_tax',
        'mortgage_interest',
        'property_tax',
        'childcare',
        'moving_expense',
        'other_deduction'
      )
      .required(),
    deductionType: Joi.string().valid('above_the_line', 'itemized', 'business', 'credit').required(),
    keywords: Joi.array().items(Joi.string().max(50)),
    limits: Joi.object({
      hasLimit: Joi.boolean(),
      maxAmount: Joi.number().min(0),
      maxPercentageOfIncome: Joi.number().min(0).max(100),
      annualLimit: Joi.number().min(0)
    }),
    documentation: Joi.object({
      receiptRequired: Joi.boolean(),
      minimumAmountForReceipt: Joi.number().min(0),
      retentionYears: Joi.number().min(1).max(20)
    })
  }),

  // Create deduction
  createDeduction: Joi.object({
    taxCategory: Joi.string().required(),
    description: Joi.string().required().max(500),
    merchant: Joi.string().max(200),
    amount: Joi.number().required().min(0),
    currency: Joi.string().length(3).uppercase().default('USD'),
    date: Joi.date().required(),
    deductiblePercentage: Joi.number().min(0).max(100).default(100),
    businessPurpose: Joi.string().max(500),
    taxYear: Joi.number().integer().min(2000).max(2100),
    mileage: Joi.object({
      miles: Joi.number().min(0),
      ratePerMile: Joi.number().min(0),
      startLocation: Joi.string().max(200),
      endLocation: Joi.string().max(200),
      roundTrip: Joi.boolean()
    }),
    homeOffice: Joi.object({
      squareFootage: Joi.number().min(0),
      method: Joi.string().valid('simplified', 'regular')
    }),
    mealDetails: Joi.object({
      attendees: Joi.array().items(Joi.string().max(100)),
      businessDiscussion: Joi.string().max(500),
      restaurantName: Joi.string().max(200)
    }),
    documentation: Joi.object({
      hasReceipt: Joi.boolean(),
      receiptUrls: Joi.array().items(Joi.string().uri())
    }),
    tags: Joi.array().items(Joi.string().max(50)),
    notes: Joi.string().max(1000),
    isRecurring: Joi.boolean(),
    recurringInfo: Joi.object({
      frequency: Joi.string().valid('weekly', 'biweekly', 'monthly', 'quarterly', 'annually')
    })
  }),

  // Create deduction from expense
  deductionFromExpense: Joi.object({
    taxCategoryId: Joi.string().required(),
    deductiblePercentage: Joi.number().min(0).max(100),
    businessPurpose: Joi.string().max(500)
  }),

  // Update deduction
  updateDeduction: Joi.object({
    taxCategory: Joi.string(),
    description: Joi.string().max(500),
    merchant: Joi.string().max(200),
    amount: Joi.number().min(0),
    date: Joi.date(),
    deductiblePercentage: Joi.number().min(0).max(100),
    businessPurpose: Joi.string().max(500),
    status: Joi.string().valid('pending', 'verified', 'flagged', 'rejected', 'needs_documentation'),
    mileage: Joi.object(),
    homeOffice: Joi.object(),
    mealDetails: Joi.object(),
    documentation: Joi.object({
      hasReceipt: Joi.boolean(),
      receiptUrls: Joi.array().items(Joi.string().uri())
    }),
    tags: Joi.array().items(Joi.string().max(50)),
    notes: Joi.string().max(1000)
  }),

  // Record estimated tax payment
  recordPayment: Joi.object({
    quarter: Joi.number().integer().min(1).max(4).required(),
    amount: Joi.number().required().min(0),
    taxYear: Joi.number().integer().min(2000).max(2100),
    paymentDate: Joi.date()
  })
};

/**
 * Middleware to validate request based on schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} location - Where to find data: 'body', 'query', 'params'
 */
const validateRequest = (schema, location = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[location];

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, "'")
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Replace with validated and converted values
    req[location] = value;
    next();
  };
};

module.exports = {
  validateRequest,
  taxSchemas
};
