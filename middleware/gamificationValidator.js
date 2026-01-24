const Joi = require('joi');

// Schema for creating a challenge
const createChallengeSchema = Joi.object({
    title: Joi.string().trim().max(100).required()
        .messages({
            'string.empty': 'Challenge title is required',
            'string.max': 'Title must be less than 100 characters'
        }),
    description: Joi.string().trim().max(500).required()
        .messages({
            'string.empty': 'Description is required',
            'string.max': 'Description must be less than 500 characters'
        }),
    type: Joi.string().valid(
        'no_spend', 'savings_target', 'budget_under', 
        'category_limit', 'streak', 'reduction', 'custom'
    ).required()
        .messages({
            'any.only': 'Invalid challenge type'
        }),
    scope: Joi.string().valid('personal', 'friends', 'public', 'workspace').default('personal'),
    config: Joi.object({
        targetAmount: Joi.number().min(0).optional(),
        targetPercentage: Joi.number().min(0).max(100).optional(),
        category: Joi.string().valid(
            'food', 'transport', 'entertainment', 'utilities', 
            'healthcare', 'shopping', 'other', 'all'
        ).optional(),
        comparisonPeriod: Joi.number().min(1).max(365).default(30),
        streakDays: Joi.number().min(1).max(365).optional()
    }).optional(),
    startDate: Joi.date().required()
        .messages({
            'date.base': 'Valid start date is required'
        }),
    endDate: Joi.date().greater(Joi.ref('startDate')).required()
        .messages({
            'date.greater': 'End date must be after start date',
            'date.base': 'Valid end date is required'
        }),
    rewards: Joi.object({
        points: Joi.number().min(0).max(10000).default(100)
    }).optional(),
    icon: Joi.string().max(10).default('🎯'),
    difficulty: Joi.string().valid('easy', 'medium', 'hard', 'extreme').default('medium'),
    tags: Joi.array().items(Joi.string().trim().max(30)).max(10).optional(),
    showOnLeaderboard: Joi.boolean().default(true)
});

// Schema for updating challenge progress
const updateProgressSchema = Joi.object({
    increment: Joi.number().optional(),
    set: Joi.number().optional(),
    dailyValue: Joi.number().optional(),
    achieved: Joi.boolean().optional()
}).or('increment', 'set', 'achieved')
    .messages({
        'object.missing': 'At least one of increment, set, or achieved must be provided'
    });

// Middleware for validating challenge create request
const validateChallengeCreate = (req, res, next) => {
    const { error, value } = createChallengeSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    req.validatedBody = value;
    next();
};

// Middleware for validating progress update request
const validateProgressUpdate = (req, res, next) => {
    const { error, value } = updateProgressSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true
    });

    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        return res.status(400).json({
            error: 'Validation failed',
            details: errors
        });
    }

    req.validatedBody = value;
    next();
};

// Validate MongoDB ObjectId
const validateObjectId = (req, res, next) => {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({ error: 'Invalid ID format' });
    }

    next();
};

module.exports = {
    validateChallengeCreate,
    validateProgressUpdate,
    validateObjectId,
    createChallengeSchema,
    updateProgressSchema
};
