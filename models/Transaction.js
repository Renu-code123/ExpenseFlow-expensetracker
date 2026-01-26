const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    portfolio: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Portfolio',
        required: true,
        index: true
    },
    asset: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Asset',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    transaction_type: {
        type: String,
        enum: ['buy', 'sell', 'dividend', 'split', 'transfer', 'fee', 'interest'],
        required: true
    },
    symbol: {
        type: String,
        required: true,
        uppercase: true
    },
    asset_type: {
        type: String,
        enum: ['stock', 'crypto', 'etf', 'mutual_fund', 'bond', 'cash']
    },
    transaction_date: {
        type: Date,
        required: true,
        default: Date.now
    },
    quantity: {
        type: Number,
        default: 0
    },
    price: {
        type: Number,
        default: 0
    },
    total_amount: {
        type: Number,
        required: true
    },
    fees: {
        type: Number,
        default: 0
    },
    currency: {
        type: String,
        default: 'USD',
        uppercase: true
    },
    exchange_rate: {
        type: Number,
        default: 1
    },
    amount_in_base_currency: Number,
    notes: String,
    tax_info: {
        is_taxable: {
            type: Boolean,
            default: true
        },
        tax_year: Number,
        cost_basis: Number,
        gain_loss: Number,
        holding_period: {
            type: String,
            enum: ['short_term', 'long_term', 'n/a'],
            default: 'n/a'
        }
    },
    split_info: {
        split_ratio: String,
        pre_split_quantity: Number,
        post_split_quantity: Number
    },
    transfer_info: {
        from_portfolio: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Portfolio'
        },
        to_portfolio: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Portfolio'
        }
    },
    broker: String,
    order_id: String,
    confirmation_number: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled', 'failed'],
        default: 'completed'
    },
    attached_documents: [{
        filename: String,
        url: String,
        file_type: String
    }]
}, {
    timestamps: true
});

// Indexes
transactionSchema.index({ portfolio: 1, transaction_date: -1 });
transactionSchema.index({ user: 1, transaction_date: -1 });
transactionSchema.index({ asset: 1, transaction_date: -1 });
transactionSchema.index({ transaction_type: 1, transaction_date: -1 });

// Virtuals
transactionSchema.virtual('net_amount').get(function() {
    return this.total_amount - this.fees;
});

transactionSchema.virtual('is_recent').get(function() {
    const daysDiff = (new Date() - this.transaction_date) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
});

// Methods
transactionSchema.methods.calculateGainLoss = function(costBasis) {
    if (this.transaction_type === 'sell') {
        this.tax_info.cost_basis = costBasis;
        this.tax_info.gain_loss = this.total_amount - costBasis - this.fees;
        
        // Determine holding period (simplified - should use actual purchase date)
        const monthsHeld = 12; // This should be calculated from tax lot
        this.tax_info.holding_period = monthsHeld > 12 ? 'long_term' : 'short_term';
    }
    
    return this.save();
};

transactionSchema.methods.cancel = function(reason) {
    this.status = 'cancelled';
    this.notes = (this.notes || '') + ` | Cancelled: ${reason}`;
    return this.save();
};

// Static methods
transactionSchema.statics.getPortfolioTransactions = function(portfolioId, options = {}) {
    const query = { portfolio: portfolioId };
    
    if (options.transaction_type) {
        query.transaction_type = options.transaction_type;
    }
    
    if (options.asset) {
        query.asset = options.asset;
    }
    
    if (options.start_date || options.end_date) {
        query.transaction_date = {};
        if (options.start_date) query.transaction_date.$gte = options.start_date;
        if (options.end_date) query.transaction_date.$lte = options.end_date;
    }
    
    return this.find(query)
        .populate('asset')
        .sort({ transaction_date: -1 });
};

transactionSchema.statics.getUserTransactions = function(userId, limit = 50) {
    return this.find({ user: userId })
        .populate('asset')
        .populate('portfolio')
        .sort({ transaction_date: -1 })
        .limit(limit);
};

transactionSchema.statics.getDividendHistory = function(portfolioId, year = null) {
    const query = {
        portfolio: portfolioId,
        transaction_type: 'dividend'
    };
    
    if (year) {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        query.transaction_date = { $gte: startDate, $lte: endDate };
    }
    
    return this.find(query).sort({ transaction_date: -1 });
};

transactionSchema.statics.getTaxReport = function(userId, taxYear) {
    const startDate = new Date(taxYear, 0, 1);
    const endDate = new Date(taxYear, 11, 31, 23, 59, 59);
    
    return this.find({
        user: userId,
        transaction_type: { $in: ['sell', 'dividend'] },
        transaction_date: { $gte: startDate, $lte: endDate },
        'tax_info.is_taxable': true
    }).sort({ transaction_date: 1 });
};

transactionSchema.statics.getTransactionSummary = async function(portfolioId, period = 'all') {
    let matchQuery = { portfolio: portfolioId };
    
    if (period !== 'all') {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'today':
                startDate = new Date(now.setHours(0, 0, 0, 0));
                break;
            case 'week':
                startDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                startDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                startDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
        }
        
        if (startDate) {
            matchQuery.transaction_date = { $gte: startDate };
        }
    }
    
    const summary = await this.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: '$transaction_type',
                count: { $sum: 1 },
                total_amount: { $sum: '$total_amount' },
                total_fees: { $sum: '$fees' }
            }
        }
    ]);
    
    return summary;
};

module.exports = mongoose.model('Transaction', transactionSchema);
