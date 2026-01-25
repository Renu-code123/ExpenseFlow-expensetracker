const mongoose = require('mongoose');

/**
 * Tax Category Schema
 * Defines deductible expense categories and their tax treatment
 */
const taxCategorySchema = new mongoose.Schema({
  // Category name
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Machine-readable code
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  
  // Description of what expenses qualify
  description: {
    type: String,
    required: true
  },
  
  // Tax jurisdiction this category applies to
  jurisdiction: {
    type: String,
    enum: ['US', 'UK', 'IN', 'CA', 'AU', 'DE', 'FR', 'ALL'],
    default: 'ALL'
  },
  
  // IRS/Tax form references
  formReferences: [{
    form: String, // e.g., 'Schedule C', 'Schedule E', 'Form 8829'
    line: String,
    description: String
  }],
  
  // Category type
  categoryType: {
    type: String,
    enum: [
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
    ],
    required: true
  },
  
  // Deduction type
  deductionType: {
    type: String,
    enum: ['above_the_line', 'itemized', 'business', 'credit'],
    required: true
  },
  
  // Deduction limits
  limits: {
    hasLimit: { type: Boolean, default: false },
    maxAmount: Number,
    maxPercentageOfIncome: Number,
    perItem: Boolean,
    annualLimit: Number
  },
  
  // Eligibility requirements
  eligibility: {
    requiresSelfEmployment: { type: Boolean, default: false },
    requiresItemization: { type: Boolean, default: false },
    requiresBusinessUse: { type: Boolean, default: false },
    incomeThreshold: Number,
    filingStatusRestrictions: [String]
  },
  
  // Documentation requirements
  documentation: {
    receiptRequired: { type: Boolean, default: true },
    minimumAmountForReceipt: { type: Number, default: 75 },
    additionalDocsRequired: [String],
    retentionYears: { type: Number, default: 7 }
  },
  
  // Keywords for AI categorization
  keywords: [String],
  
  // Merchant patterns for auto-categorization
  merchantPatterns: [String],
  
  // Expense category mappings
  expenseCategoryMappings: [{
    expenseCategory: String,
    confidence: { type: Number, min: 0, max: 1, default: 0.8 }
  }],
  
  // Whether this is a standard system category or custom
  isSystem: {
    type: Boolean,
    default: true
  },
  
  // For custom user categories
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Display order
  displayOrder: {
    type: Number,
    default: 0
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
taxCategorySchema.index({ code: 1 });
taxCategorySchema.index({ jurisdiction: 1 });
taxCategorySchema.index({ categoryType: 1 });
taxCategorySchema.index({ keywords: 1 });
taxCategorySchema.index({ user: 1 });

// Static method to get default tax categories
taxCategorySchema.statics.getDefaultCategories = function() {
  return [
    // Business Expenses
    {
      name: 'Office Supplies',
      code: 'BUS_OFFICE',
      description: 'Office supplies and materials used for business',
      jurisdiction: 'ALL',
      categoryType: 'business_expense',
      deductionType: 'business',
      formReferences: [{ form: 'Schedule C', line: '18', description: 'Office expense' }],
      keywords: ['office', 'supplies', 'stationery', 'printer', 'paper'],
      expenseCategoryMappings: [{ expenseCategory: 'shopping', confidence: 0.6 }],
      documentation: { receiptRequired: true, minimumAmountForReceipt: 75 }
    },
    {
      name: 'Business Travel',
      code: 'BUS_TRAVEL',
      description: 'Travel expenses for business purposes',
      jurisdiction: 'ALL',
      categoryType: 'business_expense',
      deductionType: 'business',
      formReferences: [{ form: 'Schedule C', line: '24a', description: 'Travel' }],
      keywords: ['flight', 'hotel', 'airfare', 'lodging', 'business trip'],
      expenseCategoryMappings: [{ expenseCategory: 'transport', confidence: 0.7 }],
      documentation: { receiptRequired: true, additionalDocsRequired: ['itinerary', 'business purpose'] }
    },
    {
      name: 'Business Meals',
      code: 'BUS_MEALS',
      description: 'Meals with business purpose (50% deductible)',
      jurisdiction: 'US',
      categoryType: 'business_expense',
      deductionType: 'business',
      formReferences: [{ form: 'Schedule C', line: '24b', description: 'Meals (50%)' }],
      limits: { hasLimit: true, maxPercentageOfIncome: 50 },
      keywords: ['client dinner', 'business lunch', 'meeting meal'],
      expenseCategoryMappings: [{ expenseCategory: 'food', confidence: 0.5 }],
      documentation: { receiptRequired: true, additionalDocsRequired: ['attendees', 'business purpose'] }
    },
    {
      name: 'Professional Services',
      code: 'BUS_PROFESSIONAL',
      description: 'Legal, accounting, and consulting fees',
      jurisdiction: 'ALL',
      categoryType: 'business_expense',
      deductionType: 'business',
      formReferences: [{ form: 'Schedule C', line: '17', description: 'Legal and professional services' }],
      keywords: ['lawyer', 'attorney', 'accountant', 'cpa', 'consultant'],
      documentation: { receiptRequired: true }
    },
    {
      name: 'Software & Subscriptions',
      code: 'BUS_SOFTWARE',
      description: 'Business software, SaaS subscriptions',
      jurisdiction: 'ALL',
      categoryType: 'business_expense',
      deductionType: 'business',
      formReferences: [{ form: 'Schedule C', line: '18', description: 'Office expense' }],
      keywords: ['software', 'subscription', 'saas', 'cloud', 'license'],
      expenseCategoryMappings: [{ expenseCategory: 'subscriptions', confidence: 0.8 }],
      documentation: { receiptRequired: true }
    },
    {
      name: 'Equipment & Tools',
      code: 'BUS_EQUIPMENT',
      description: 'Business equipment, tools, and machinery',
      jurisdiction: 'ALL',
      categoryType: 'business_expense',
      deductionType: 'business',
      formReferences: [{ form: 'Form 4562', line: '1', description: 'Depreciation/Section 179' }],
      keywords: ['equipment', 'tools', 'machinery', 'computer', 'laptop'],
      documentation: { receiptRequired: true, retentionYears: 10 }
    },
    
    // Home Office
    {
      name: 'Home Office Expense',
      code: 'HOME_OFFICE',
      description: 'Portion of home expenses used for business',
      jurisdiction: 'US',
      categoryType: 'home_office',
      deductionType: 'business',
      formReferences: [{ form: 'Form 8829', line: '36', description: 'Home office deduction' }],
      eligibility: { requiresSelfEmployment: true, requiresBusinessUse: true },
      keywords: ['rent', 'mortgage', 'utilities', 'home office'],
      documentation: { receiptRequired: true, additionalDocsRequired: ['square footage calculation'] }
    },
    
    // Vehicle/Mileage
    {
      name: 'Business Mileage',
      code: 'VEH_MILEAGE',
      description: 'Vehicle mileage for business purposes',
      jurisdiction: 'US',
      categoryType: 'vehicle_mileage',
      deductionType: 'business',
      formReferences: [{ form: 'Schedule C', line: '9', description: 'Car and truck expenses' }],
      eligibility: { requiresBusinessUse: true },
      keywords: ['mileage', 'gas', 'fuel', 'driving', 'vehicle'],
      expenseCategoryMappings: [{ expenseCategory: 'transport', confidence: 0.6 }],
      documentation: { receiptRequired: false, additionalDocsRequired: ['mileage log'] }
    },
    
    // Healthcare
    {
      name: 'Health Insurance Premiums',
      code: 'HEALTH_PREMIUM',
      description: 'Health insurance premiums (self-employed)',
      jurisdiction: 'US',
      categoryType: 'healthcare',
      deductionType: 'above_the_line',
      formReferences: [{ form: 'Form 1040', line: '17', description: 'Self-employed health insurance' }],
      eligibility: { requiresSelfEmployment: true },
      keywords: ['health insurance', 'medical insurance', 'premium'],
      expenseCategoryMappings: [{ expenseCategory: 'healthcare', confidence: 0.9 }]
    },
    {
      name: 'Medical Expenses',
      code: 'HEALTH_MEDICAL',
      description: 'Unreimbursed medical and dental expenses',
      jurisdiction: 'US',
      categoryType: 'healthcare',
      deductionType: 'itemized',
      formReferences: [{ form: 'Schedule A', line: '4', description: 'Medical and dental' }],
      limits: { hasLimit: true, maxPercentageOfIncome: 7.5 }, // Must exceed 7.5% of AGI
      keywords: ['doctor', 'hospital', 'prescription', 'dental', 'medical'],
      expenseCategoryMappings: [{ expenseCategory: 'healthcare', confidence: 0.9 }],
      eligibility: { requiresItemization: true }
    },
    {
      name: 'HSA Contributions',
      code: 'HEALTH_HSA',
      description: 'Health Savings Account contributions',
      jurisdiction: 'US',
      categoryType: 'healthcare',
      deductionType: 'above_the_line',
      formReferences: [{ form: 'Form 8889', line: '13', description: 'HSA deduction' }],
      limits: { hasLimit: true, annualLimit: 4150 }, // 2024 individual limit
      keywords: ['hsa', 'health savings']
    },
    
    // Education
    {
      name: 'Education Expenses',
      code: 'EDU_EXPENSE',
      description: 'Qualified education expenses',
      jurisdiction: 'US',
      categoryType: 'education',
      deductionType: 'credit',
      formReferences: [{ form: 'Form 8863', line: '19', description: 'Education credits' }],
      keywords: ['tuition', 'education', 'course', 'training', 'certification'],
      expenseCategoryMappings: [{ expenseCategory: 'education', confidence: 0.9 }]
    },
    {
      name: 'Student Loan Interest',
      code: 'EDU_STUDENT_LOAN',
      description: 'Interest paid on student loans',
      jurisdiction: 'US',
      categoryType: 'education',
      deductionType: 'above_the_line',
      formReferences: [{ form: 'Form 1040', line: '21', description: 'Student loan interest' }],
      limits: { hasLimit: true, maxAmount: 2500 },
      keywords: ['student loan', 'education loan', 'loan interest']
    },
    
    // Charitable
    {
      name: 'Charitable Donations',
      code: 'CHAR_DONATION',
      description: 'Donations to qualified charitable organizations',
      jurisdiction: 'US',
      categoryType: 'charitable',
      deductionType: 'itemized',
      formReferences: [{ form: 'Schedule A', line: '14', description: 'Gifts to charity' }],
      limits: { hasLimit: true, maxPercentageOfIncome: 60 },
      keywords: ['donation', 'charity', 'nonprofit', 'contribution'],
      eligibility: { requiresItemization: true },
      documentation: { receiptRequired: true, minimumAmountForReceipt: 250 }
    },
    
    // Retirement
    {
      name: 'IRA Contributions',
      code: 'RET_IRA',
      description: 'Traditional IRA contributions',
      jurisdiction: 'US',
      categoryType: 'retirement',
      deductionType: 'above_the_line',
      formReferences: [{ form: 'Form 1040', line: '20', description: 'IRA deduction' }],
      limits: { hasLimit: true, annualLimit: 7000 }, // 2024 limit
      keywords: ['ira', 'retirement', 'traditional ira']
    },
    {
      name: 'SEP IRA Contributions',
      code: 'RET_SEP',
      description: 'SEP IRA contributions for self-employed',
      jurisdiction: 'US',
      categoryType: 'retirement',
      deductionType: 'above_the_line',
      formReferences: [{ form: 'Form 1040', line: '16', description: 'Self-employed SEP' }],
      eligibility: { requiresSelfEmployment: true },
      limits: { hasLimit: true, maxPercentageOfIncome: 25 },
      keywords: ['sep', 'sep ira', 'self employed retirement']
    },
    
    // Property
    {
      name: 'Mortgage Interest',
      code: 'PROP_MORTGAGE',
      description: 'Interest paid on home mortgage',
      jurisdiction: 'US',
      categoryType: 'mortgage_interest',
      deductionType: 'itemized',
      formReferences: [{ form: 'Schedule A', line: '8a', description: 'Home mortgage interest' }],
      limits: { hasLimit: true, maxAmount: 750000 }, // Loan limit
      keywords: ['mortgage', 'home loan', 'interest'],
      eligibility: { requiresItemization: true }
    },
    {
      name: 'Property Taxes',
      code: 'PROP_TAX',
      description: 'State and local property taxes',
      jurisdiction: 'US',
      categoryType: 'property_tax',
      deductionType: 'itemized',
      formReferences: [{ form: 'Schedule A', line: '5b', description: 'Real estate taxes' }],
      limits: { hasLimit: true, maxAmount: 10000 }, // SALT cap
      keywords: ['property tax', 'real estate tax'],
      eligibility: { requiresItemization: true }
    },
    
    // State & Local Taxes
    {
      name: 'State Income Tax',
      code: 'SALT_INCOME',
      description: 'State and local income taxes paid',
      jurisdiction: 'US',
      categoryType: 'state_local_tax',
      deductionType: 'itemized',
      formReferences: [{ form: 'Schedule A', line: '5a', description: 'State income taxes' }],
      limits: { hasLimit: true, maxAmount: 10000 }, // SALT cap
      keywords: ['state tax', 'local tax', 'income tax'],
      eligibility: { requiresItemization: true }
    },
    
    // Childcare
    {
      name: 'Childcare Expenses',
      code: 'CHILD_CARE',
      description: 'Childcare and dependent care expenses',
      jurisdiction: 'US',
      categoryType: 'childcare',
      deductionType: 'credit',
      formReferences: [{ form: 'Form 2441', line: '11', description: 'Child and dependent care credit' }],
      limits: { hasLimit: true, maxAmount: 3000, perItem: true }, // Per child
      keywords: ['daycare', 'childcare', 'babysitter', 'nanny'],
      documentation: { receiptRequired: true, additionalDocsRequired: ['provider tax ID'] }
    }
  ];
};

// Method to match expense to tax category
taxCategorySchema.statics.findMatchingCategory = async function(expense, jurisdiction = 'US') {
  const categories = await this.find({
    $or: [{ jurisdiction }, { jurisdiction: 'ALL' }],
    isActive: true
  });
  
  let bestMatch = null;
  let highestConfidence = 0;
  
  for (const category of categories) {
    let confidence = 0;
    
    // Check expense category mapping
    const mapping = category.expenseCategoryMappings.find(
      m => m.expenseCategory === expense.category
    );
    if (mapping) {
      confidence += mapping.confidence * 0.4;
    }
    
    // Check keywords in description
    const description = (expense.description || '').toLowerCase();
    const merchant = (expense.merchant || '').toLowerCase();
    
    for (const keyword of category.keywords) {
      if (description.includes(keyword.toLowerCase()) || merchant.includes(keyword.toLowerCase())) {
        confidence += 0.2;
      }
    }
    
    // Check merchant patterns
    for (const pattern of category.merchantPatterns || []) {
      if (new RegExp(pattern, 'i').test(merchant)) {
        confidence += 0.3;
      }
    }
    
    if (confidence > highestConfidence) {
      highestConfidence = confidence;
      bestMatch = { category, confidence: Math.min(confidence, 1) };
    }
  }
  
  return bestMatch;
};

module.exports = mongoose.model('TaxCategory', taxCategorySchema);
