const Joi = require('joi');

/**
 * Forecast Validation Middleware
 */

const validateForecastGeneration = (req, res, next) => {
    const schema = Joi.object({
        period_type: Joi.string()
            .valid('weekly', 'monthly', 'quarterly', 'yearly')
            .default('monthly'),
        category: Joi.string()
            .optional()
            .allow(null, ''),
        algorithm: Joi.string()
            .valid('linear_regression', 'moving_average', 'exponential_smoothing', 'arima', 'prophet')
            .default('moving_average'),
        confidence_level: Joi.number()
            .min(80)
            .max(99)
            .default(95)
    });
    
    const { error, value } = schema.validate(req.body);
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message)
        });
    }
    
    req.body = value;
    next();
};

const validateAnomalyDetection = (req, res, next) => {
    const schema = Joi.object({
        lookback_days: Joi.number()
            .min(7)
            .max(365)
            .default(90),
        sensitivity_level: Joi.string()
            .valid('low', 'medium', 'high')
            .default('medium')
    });
    
    const { error, value } = schema.validate(req.body);
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message)
        });
    }
    
    req.body = value;
    next();
};

const validateAnomalyReview = (req, res, next) => {
    const schema = Joi.object({
        action: Joi.string()
            .valid('mark_normal', 'mark_fraud', 'reviewed')
            .required(),
        notes: Joi.string()
            .optional()
            .allow(null, '')
    });
    
    const { error, value } = schema.validate(req.body);
    
    if (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: error.details.map(detail => detail.message)
        });
    }
    
    req.body = value;
    next();
};

module.exports = {
    validateForecastGeneration,
    validateAnomalyDetection,
    validateAnomalyReview
};
