const mongoose = require('mongoose');

/**
 * Tax Profile Schema
 * Stores user's tax configuration and filing information
 */
const taxProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Tax jurisdiction
  jurisdiction: {
    type: String,
    enum: ['US', 'UK', 'IN', 'CA', 'AU', 'DE', 'FR', 'OTHER'],
    required: true,
    default: 'US'
  },
  
  // US-specific state
  state: {
    type: String,
    maxlength: 50
  },
  
  // Filing status
  filingStatus: {
    type: String,
    enum: [
      'single',
      'married_filing_jointly',
      'married_filing_separately',
      'head_of_household',
      'qualifying_widow',
      'self_employed',
      'business_owner'
    ],
    required: true,
    default: 'single'
  },
  
  // Employment type
  employmentType: {
    type: String,
    enum: ['employed', 'self_employed', 'freelancer', 'business_owner', 'retired', 'mixed'],
    default: 'employed'
  },
  
  // Tax year settings
  currentTaxYear: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  
  fiscalYearEnd: {
    month: { type: Number, min: 1, max: 12, default: 12 },
    day: { type: Number, min: 1, max: 31, default: 31 }
  },
  
  // Income information
  estimatedAnnualIncome: {
    type: Number,
    default: 0
  },
  
  additionalIncomeSources: [{
    type: {
      type: String,
      enum: ['salary', 'freelance', 'rental', 'investment', 'business', 'pension', 'other']
    },
    description: String,
    estimatedAmount: Number,
    frequency: {
      type: String,
      enum: ['one_time', 'monthly', 'quarterly', 'annually']
    }
  }],
  
  // Tax bracket info (calculated)
  estimatedTaxBracket: {
    rate: Number,
    bracketMin: Number,
    bracketMax: Number
  },
  
  // Withholding information
  w4Allowances: {
    type: Number,
    default: 0
  },
  
  additionalWithholding: {
    type: Number,
    default: 0
  },
  
  // Business information (for self-employed)
  businessInfo: {
    name: String,
    ein: String, // Employer Identification Number
    businessType: {
      type: String,
      enum: ['sole_proprietorship', 'llc', 'partnership', 's_corp', 'c_corp', 'other']
    },
    industryCode: String, // NAICS code
    homeOffice: {
      enabled: { type: Boolean, default: false },
      squareFootage: Number,
      totalHomeSquareFootage: Number,
      method: { type: String, enum: ['simplified', 'regular'], default: 'simplified' }
    }
  },
  
  // Vehicle/mileage tracking
  vehicleTracking: {
    enabled: { type: Boolean, default: false },
    vehicles: [{
      name: String,
      businessUsePercentage: Number,
      method: { type: String, enum: ['standard_mileage', 'actual_expense'], default: 'standard_mileage' }
    }]
  },
  
  // Retirement accounts
  retirementAccounts: [{
    type: {
      type: String,
      enum: ['401k', 'traditional_ira', 'roth_ira', 'sep_ira', 'simple_ira', '403b', 'pension', 'other']
    },
    contribution: Number,
    employerMatch: Number
  }],
  
  // Health savings
  hsaAccount: {
    enabled: { type: Boolean, default: false },
    contribution: { type: Number, default: 0 },
    coverageType: { type: String, enum: ['self', 'family'], default: 'self' }
  },
  
  // Dependents
  dependents: [{
    name: String,
    relationship: {
      type: String,
      enum: ['child', 'parent', 'sibling', 'other']
    },
    dateOfBirth: Date,
    ssn: String, // Encrypted in production
    monthsLived: { type: Number, min: 0, max: 12, default: 12 },
    qualifiesForChildTaxCredit: { type: Boolean, default: false }
  }],
  
  // Prior year info for comparisons
  priorYearData: [{
    year: Number,
    totalIncome: Number,
    totalDeductions: Number,
    taxableIncome: Number,
    taxPaid: Number,
    refundOrOwed: Number
  }],
  
  // Notification preferences
  notifications: {
    quarterlyReminders: { type: Boolean, default: true },
    deductionAlerts: { type: Boolean, default: true },
    yearEndReminders: { type: Boolean, default: true },
    documentReminders: { type: Boolean, default: true }
  },
  
  // Integration settings
  integrations: {
    turbotax: { enabled: Boolean, lastSync: Date },
    hrblock: { enabled: Boolean, lastSync: Date },
    quickbooks: { enabled: Boolean, lastSync: Date }
  },
  
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
taxProfileSchema.index({ user: 1 });
taxProfileSchema.index({ jurisdiction: 1 });
taxProfileSchema.index({ currentTaxYear: 1 });

// Virtual for total retirement contributions
taxProfileSchema.virtual('totalRetirementContributions').get(function() {
  return this.retirementAccounts.reduce((sum, acc) => sum + (acc.contribution || 0), 0);
});

// Method to get tax brackets based on jurisdiction
taxProfileSchema.methods.getTaxBrackets = function() {
  const brackets = {
    US: {
      single: [
        { min: 0, max: 11600, rate: 0.10 },
        { min: 11600, max: 47150, rate: 0.12 },
        { min: 47150, max: 100525, rate: 0.22 },
        { min: 100525, max: 191950, rate: 0.24 },
        { min: 191950, max: 243725, rate: 0.32 },
        { min: 243725, max: 609350, rate: 0.35 },
        { min: 609350, max: Infinity, rate: 0.37 }
      ],
      married_filing_jointly: [
        { min: 0, max: 23200, rate: 0.10 },
        { min: 23200, max: 94300, rate: 0.12 },
        { min: 94300, max: 201050, rate: 0.22 },
        { min: 201050, max: 383900, rate: 0.24 },
        { min: 383900, max: 487450, rate: 0.32 },
        { min: 487450, max: 731200, rate: 0.35 },
        { min: 731200, max: Infinity, rate: 0.37 }
      ]
    },
    IN: {
      single: [
        { min: 0, max: 300000, rate: 0 },
        { min: 300000, max: 600000, rate: 0.05 },
        { min: 600000, max: 900000, rate: 0.10 },
        { min: 900000, max: 1200000, rate: 0.15 },
        { min: 1200000, max: 1500000, rate: 0.20 },
        { min: 1500000, max: Infinity, rate: 0.30 }
      ]
    },
    UK: {
      single: [
        { min: 0, max: 12570, rate: 0 },
        { min: 12570, max: 50270, rate: 0.20 },
        { min: 50270, max: 125140, rate: 0.40 },
        { min: 125140, max: Infinity, rate: 0.45 }
      ]
    }
  };
  
  const jurisdictionBrackets = brackets[this.jurisdiction] || brackets.US;
  return jurisdictionBrackets[this.filingStatus] || jurisdictionBrackets.single;
};

// Method to calculate estimated tax bracket
taxProfileSchema.methods.calculateTaxBracket = function(taxableIncome) {
  const brackets = this.getTaxBrackets();
  for (const bracket of brackets) {
    if (taxableIncome >= bracket.min && taxableIncome < bracket.max) {
      return {
        rate: bracket.rate,
        bracketMin: bracket.min,
        bracketMax: bracket.max
      };
    }
  }
  return brackets[brackets.length - 1];
};

// Static method to get standard deduction
taxProfileSchema.statics.getStandardDeduction = function(jurisdiction, filingStatus, year = 2024) {
  const deductions = {
    US: {
      2024: {
        single: 14600,
        married_filing_jointly: 29200,
        married_filing_separately: 14600,
        head_of_household: 21900
      }
    },
    IN: {
      2024: {
        single: 50000 // Standard deduction for salaried
      }
    },
    UK: {
      2024: {
        single: 12570 // Personal allowance
      }
    }
  };
  
  const jurisdictionDeductions = deductions[jurisdiction]?.[year] || deductions.US[2024];
  return jurisdictionDeductions[filingStatus] || jurisdictionDeductions.single;
};

module.exports = mongoose.model('TaxProfile', taxProfileSchema);
