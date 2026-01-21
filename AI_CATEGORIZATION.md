# AI-Powered Smart Expense Categorization

## Overview
ExpenseFlow now features an intelligent AI-powered expense categorization system that automatically suggests categories based on expense descriptions. The system learns from user behavior and improves over time, making expense tracking faster and more accurate.

## Features

### 1. **Real-time Category Suggestions**
- As users type expense descriptions, the system provides instant category suggestions
- Multiple suggestions shown with confidence scores
- Visual feedback with confidence percentages
- Smart debouncing (500ms) to optimize API calls

### 2. **Multi-Source Intelligence**
The categorization engine uses four intelligent sources:

#### a) Merchant Recognition (Highest Priority)
- Pre-trained database with 50+ popular merchants
- Includes Indian brands: Swiggy, Zomato, Netflix, Uber, Amazon, Apollo, etc.
- 98% confidence for recognized merchants
- Continuously updated with usage patterns

#### b) User Pattern Learning
- Learns from user's past categorization choices
- Creates patterns from expense descriptions
- Confidence increases with repeated usage
- Personalized to each user's spending habits

#### c) Keyword Matching
- TF-IDF like scoring algorithm
- Extensive keyword dictionaries for each category
- Supports multiple languages and variations
- Context-aware matching

#### d) Historical Analysis
- Analyzes similarity with past expenses
- Word overlap detection (30% threshold)
- Frequency-based category scoring
- User-specific historical patterns

### 3. **Confidence Scoring**
- **High (75-100%)**: Green indicator, auto-selected
- **Medium (50-75%)**: Yellow indicator, suggested
- **Low (below 50%)**: Red indicator, available but not recommended
- Logarithmic confidence calculation for learning patterns

### 4. **Auto-Learning System**
- Automatically learns from every expense entered
- Updates pattern confidence based on accuracy
- Reduces confidence for incorrect suggestions
- Creates new patterns for novel descriptions

### 5. **User-Friendly Interface**
- Dropdown suggestions appear while typing
- Click to select any suggestion
- Visual confidence indicators
- Smooth animations and transitions
- Mobile-responsive design

## API Endpoints

### 1. Get Category Suggestions
```
GET /api/categorization/suggest?description={description}
```
**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "category": "food",
        "confidence": 0.95,
        "source": "merchant",
        "reason": "Recognized merchant: Swiggy"
      },
      {
        "category": "transport",
        "confidence": 0.75,
        "source": "user_pattern",
        "reason": "Matched your pattern: 'uber ride'"
      }
    ],
    "primarySuggestion": {
      "category": "food",
      "confidence": 0.95,
      "source": "merchant",
      "reason": "Recognized merchant: Swiggy"
    }
  }
}
```

### 2. Train from User Correction
```
POST /api/categorization/train
```
**Request:**
```json
{
  "description": "uber ride to airport",
  "suggestedCategory": "food",
  "actualCategory": "transport"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Learned from your correction",
  "data": {
    "patternsLearned": 2,
    "message": "Learned from your correction"
  }
}
```

### 3. Bulk Categorize
```
POST /api/categorization/bulk
```
**Request:**
```json
{
  "expenses": [
    {
      "id": "123",
      "description": "Netflix subscription"
    },
    {
      "id": "124",
      "description": "Grocery shopping at Big Bazaar"
    }
  ]
}
```

### 4. Get User Patterns
```
GET /api/categorization/patterns?category={category}&minConfidence={confidence}
```

### 5. Delete Pattern
```
DELETE /api/categorization/patterns/:patternId
```

### 6. Get Categorization Stats
```
GET /api/categorization/stats
```
**Response:**
```json
{
  "success": true,
  "data": {
    "totalPatterns": 45,
    "averageConfidence": 0.78,
    "categoryCounts": {
      "food": 15,
      "transport": 10,
      "entertainment": 8
    },
    "topPatterns": [...]
  }
}
```

## Database Models

### 1. CategoryPattern
```javascript
{
  user: ObjectId,
  pattern: String,           // e.g., "uber", "netflix"
  category: String,          // food, transport, etc.
  confidence: Number,        // 0 to 1
  usageCount: Number,        // How many times used
  accuracy: Number,          // How often correct
  lastUsed: Date,
  source: String,            // 'manual', 'auto_learned'
  isActive: Boolean
}
```

### 2. MerchantDatabase
```javascript
{
  merchantName: String,      // e.g., "Swiggy"
  category: String,          // Primary category
  alternateNames: [String],  // Variations
  confidence: Number,        // Base confidence
  keywords: [String],        // Related keywords
  globalUsageCount: Number,
  isActive: Boolean
}
```

## Pre-trained Merchants

### Food & Dining
- Swiggy, Zomato, Domino's Pizza, McDonald's, KFC, Subway, Pizza Hut, Starbucks

### Transport
- Uber, Ola, Rapido, Indian Railways, IndiGo, SpiceJet

### Entertainment
- Netflix, Amazon Prime, Hotstar, Spotify, BookMyShow, YouTube Premium

### Utilities
- Airtel, Jio, Vi, Tata Power, BSNL

### Healthcare
- Apollo, PharmEasy, 1mg, Netmeds, Practo

### Shopping
- Amazon, Flipkart, Myntra, Big Bazaar, DMart, Reliance Digital

## Usage Examples

### Example 1: Merchant Recognition
```
User types: "swiggy dinner order"
AI suggests: Food & Dining (98% confidence)
Source: Merchant database
Auto-selected: Yes (high confidence)
```

### Example 2: Pattern Learning
```
User types: "monthly internet bill"
First time: Utilities (55% confidence) from keywords
User confirms: Utilities
Next time: Utilities (85% confidence) from learned pattern
```

### Example 3: Historical Analysis
```
User types: "grocery"
AI finds: Similar past expenses categorized as "shopping"
Suggests: Shopping (70% confidence)
```

## Technical Implementation

### Service Layer (`categorizationService.js`)
- 370+ lines of intelligent categorization logic
- Confidence threshold management
- Multi-source aggregation
- Pattern learning algorithms

### Validation (`categorizationValidator.js`)
- Joi schema validation
- Request sanitization
- Category enum validation
- Pattern ID validation

### Frontend Integration
- **HTML**: Dropdown suggestion UI
- **CSS**: 250+ lines of styling with animations
- **JavaScript**: Real-time API integration, debouncing, auto-selection

## Best Practices

1. **Minimum Description Length**: Type at least 3 characters for suggestions
2. **Review Suggestions**: Always review AI suggestions before accepting
3. **Correct Mistakes**: If AI suggests wrong category, select correct one - system learns
4. **Pattern Management**: Periodically review learned patterns
5. **Merchant Database**: Will be updated with more merchants over time

## Performance Optimizations

- **Debouncing**: 500ms delay before API calls
- **Caching**: Merchant database cached in memory
- **Text Indexing**: MongoDB text search for fast pattern matching
- **Confidence Thresholds**: Filters out low-quality suggestions
- **Lazy Loading**: Suggestions loaded only when needed

## Mobile Support
- Touch-friendly suggestion selection
- Responsive dropdown sizing
- Optimized for small screens
- Gesture support for closing suggestions

## Future Enhancements

1. **Deep Learning Integration**: Train ML models on user data
2. **Multi-language Support**: Support for regional languages
3. **Amount-based Learning**: Consider expense amounts in categorization
4. **Time-based Patterns**: Learn time-specific patterns (e.g., lunch vs dinner)
5. **Merchant Database Expansion**: Add more regional merchants
6. **Collaborative Filtering**: Learn from similar users (privacy-preserving)
7. **OCR Integration**: Auto-categorize from receipt images
8. **Voice Input**: Category suggestions from voice descriptions

## Troubleshooting

### Issue: No suggestions appearing
- **Solution**: Ensure description is at least 3 characters
- Check authentication token is valid
- Verify API endpoint is accessible

### Issue: Low confidence scores
- **Solution**: Keep using the system - it learns over time
- Manually correct suggestions to improve accuracy
- Add more expenses to build pattern database

### Issue: Wrong suggestions
- **Solution**: Always select the correct category
- System will learn and improve
- Check if similar patterns exist in your history

## API Rate Limiting
- Debounced to max 1 request per 500ms per user
- No hard rate limits on API endpoints
- Caching used to minimize database queries

## Privacy & Security
- All patterns are user-specific
- No cross-user data sharing
- Patterns stored with user ID isolation
- Merchant database is global (anonymous)
- Can delete all patterns anytime

## Contributing
To add more merchants to the database:
1. Update `models/MerchantDatabase.js`
2. Add merchant with confidence score
3. Include alternate names and keywords
4. Submit PR for review

## License
This feature is part of ExpenseFlow and follows the same license.

---

**Version**: 1.0.0  
**Last Updated**: January 2025  
**Maintained by**: ExpenseFlow Team
