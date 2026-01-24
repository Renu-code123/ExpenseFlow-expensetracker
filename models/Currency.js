const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
    base: {
        type: String,
        required: true,
        default: 'INR'
    },
    rates: {
        type: Map,
        of: Number,
        required: true
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Static method to get latest rates
currencySchema.statics.getLatestRates = async function (baseCurrency = 'INR') {
    const rates = await this.findOne({ base: baseCurrency }).sort({ createdAt: -1 });
    return rates;
};

// Static method to check if rates need refresh (older than 24 hours)
currencySchema.statics.needsRefresh = async function (baseCurrency = 'INR') {
    const rates = await this.findOne({ base: baseCurrency }).sort({ createdAt: -1 });
    if (!rates) return true;

    const hoursSinceUpdate = (Date.now() - rates.lastUpdated) / (1000 * 60 * 60);
    return hoursSinceUpdate > 24;
};

module.exports = mongoose.model('Currency', currencySchema);
