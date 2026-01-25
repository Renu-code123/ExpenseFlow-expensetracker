const mongoose = require('mongoose');

const taxBracketSchema = new mongoose.Schema({
  minIncome: {
    type: Number,
    required: true,
    min: 0
  },
  maxIncome: {
    type: Number,
    default: null // null means no upper limit
  },
  rate: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  fixedAmount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const deductionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  maxLimit: {
    type: Number,
    default: null // null means no limit
  },
  description: String
}, { _id: false });

const taxProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taxYear: {
    type: Number,
    required: true
  },
  country: {
    type: String,
    required: true,
    default: 'IN',
    uppercase: true
  },
  region: {
    type: String,
    trim: true
  },
  regime: {
    type: String,
    enum: ['old', 'new', 'default'],
    default: 'new'
  },
  filingStatus: {
    type: String,
    enum: ['individual', 'married_jointly', 'married_separately', 'head_of_household', 'business'],
    default: 'individual'
  },
  employmentType: {
    type: String,
    enum: ['salaried', 'self_employed', 'business', 'freelancer', 'other'],
    default: 'salaried'
  },
  taxBrackets: [taxBracketSchema],
  standardDeduction: {
    type: Number,
    default: 50000 // Default for India
  },
  availableDeductions: [deductionSchema],
  customDeductions: [{
    name: String,
    amount: Number,
    section: String
  }],
  estimatedTaxCredits: {
    type: Number,
    default: 0
  },
  advanceTaxPaid: {
    type: Number,
    default: 0
  },
  tdsDeducted: {
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

// Compound index for user and tax year
taxProfileSchema.index({ user: 1, taxYear: 1 }, { unique: true });

// Initialize default Indian tax brackets (New Regime FY 2024-25)
taxProfileSchema.statics.getDefaultBrackets = function(country = 'IN', regime = 'new') {
  if (country === 'IN') {
    if (regime === 'new') {
      return [
        { minIncome: 0, maxIncome: 300000, rate: 0, fixedAmount: 0 },
        { minIncome: 300001, maxIncome: 700000, rate: 5, fixedAmount: 0 },
        { minIncome: 700001, maxIncome: 1000000, rate: 10, fixedAmount: 20000 },
        { minIncome: 1000001, maxIncome: 1200000, rate: 15, fixedAmount: 50000 },
        { minIncome: 1200001, maxIncome: 1500000, rate: 20, fixedAmount: 80000 },
        { minIncome: 1500001, maxIncome: null, rate: 30, fixedAmount: 140000 }
      ];
    } else {
      // Old Regime
      return [
        { minIncome: 0, maxIncome: 250000, rate: 0, fixedAmount: 0 },
        { minIncome: 250001, maxIncome: 500000, rate: 5, fixedAmount: 0 },
        { minIncome: 500001, maxIncome: 1000000, rate: 20, fixedAmount: 12500 },
        { minIncome: 1000001, maxIncome: null, rate: 30, fixedAmount: 112500 }
      ];
    }
  }
  
  // US Tax Brackets (2024) - Simplified
  if (country === 'US') {
    return [
      { minIncome: 0, maxIncome: 11600, rate: 10, fixedAmount: 0 },
      { minIncome: 11601, maxIncome: 47150, rate: 12, fixedAmount: 1160 },
      { minIncome: 47151, maxIncome: 100525, rate: 22, fixedAmount: 5426 },
      { minIncome: 100526, maxIncome: 191950, rate: 24, fixedAmount: 17168 },
      { minIncome: 191951, maxIncome: 243725, rate: 32, fixedAmount: 39110 },
      { minIncome: 243726, maxIncome: 609350, rate: 35, fixedAmount: 55678 },
      { minIncome: 609351, maxIncome: null, rate: 37, fixedAmount: 183647 }
    ];
  }
  
  // Default progressive brackets
  return [
    { minIncome: 0, maxIncome: 50000, rate: 10, fixedAmount: 0 },
    { minIncome: 50001, maxIncome: 100000, rate: 20, fixedAmount: 5000 },
    { minIncome: 100001, maxIncome: null, rate: 30, fixedAmount: 15000 }
  ];
};

// Get default deductions for a country
taxProfileSchema.statics.getDefaultDeductions = function(country = 'IN') {
  if (country === 'IN') {
    return [
      { name: 'Section 80C Investments', code: '80C', maxLimit: 150000, description: 'PPF, ELSS, Life Insurance, etc.' },
      { name: 'Health Insurance Premium', code: '80D', maxLimit: 75000, description: 'Self and family health insurance' },
      { name: 'Education Loan Interest', code: '80E', maxLimit: null, description: 'Interest on education loan' },
      { name: 'Home Loan Interest', code: '24B', maxLimit: 200000, description: 'Interest on home loan' },
      { name: 'Donations', code: '80G', maxLimit: null, description: 'Charitable donations' },
      { name: 'NPS Contribution', code: '80CCD', maxLimit: 50000, description: 'National Pension Scheme' },
      { name: 'Medical Expenses', code: '80DDB', maxLimit: 100000, description: 'Specified diseases treatment' },
      { name: 'Rent Paid (HRA)', code: '10(13A)', maxLimit: null, description: 'House Rent Allowance' }
    ];
  }
  
  if (country === 'US') {
    return [
      { name: 'Standard Deduction', code: 'STD', maxLimit: 14600, description: 'Standard deduction for single filers' },
      { name: 'Mortgage Interest', code: 'MORT', maxLimit: 750000, description: 'Interest on home mortgage' },
      { name: 'State and Local Taxes', code: 'SALT', maxLimit: 10000, description: 'State and local tax deduction' },
      { name: 'Charitable Contributions', code: 'CHAR', maxLimit: null, description: 'Donations to qualified organizations' },
      { name: 'Medical Expenses', code: 'MED', maxLimit: null, description: 'Exceeding 7.5% of AGI' },
      { name: 'Student Loan Interest', code: 'STUD', maxLimit: 2500, description: 'Interest on student loans' }
    ];
  }
  
  return [];
};

// Method to get tax brackets based on profile settings
taxProfileSchema.methods.getTaxBrackets = function() {
  if (this.taxBrackets && this.taxBrackets.length > 0) {
    return this.taxBrackets;
  }
  return TaxProfile.getDefaultBrackets(this.country, this.regime);
};

// Method to calculate tax bracket for given income
taxProfileSchema.methods.calculateTaxBracket = function(taxableIncome) {
  const brackets = this.getTaxBrackets();
  for (const bracket of brackets) {
    const max = bracket.maxIncome || Infinity;
    if (taxableIncome >= bracket.minIncome && taxableIncome <= max) {
      return {
        rate: bracket.rate,
        bracketMin: bracket.minIncome,
        bracketMax: bracket.maxIncome,
        fixedAmount: bracket.fixedAmount
      };
    }
  }
  return brackets[brackets.length - 1];
};

// Static method to get standard deduction by country and filing status
taxProfileSchema.statics.getStandardDeduction = function(country, filingStatus, year = 2024) {
  const deductions = {
    US: {
      2024: {
        individual: 14600,
        married_jointly: 29200,
        married_separately: 14600,
        head_of_household: 21900
      }
    },
    IN: {
      2024: {
        individual: 50000,
        salaried: 50000
      }
    },
    UK: {
      2024: {
        individual: 12570 // Personal allowance
      }
    }
  };
  
  const countryDeductions = deductions[country]?.[year] || deductions.US[2024];
  return countryDeductions[filingStatus] || countryDeductions.individual || 0;
};

const TaxProfile = mongoose.model('TaxProfile', taxProfileSchema);

module.exports = TaxProfile;
