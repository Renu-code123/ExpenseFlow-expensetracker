# ExpenseFlow Backend Setup

## Installation Steps

1. **Install Dependencies**
```bash
npm install
```

2. **Setup MongoDB**
- Install MongoDB locally or use MongoDB Atlas
- Update `.env` file with your MongoDB connection string

3. **Start the Server**
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## API Endpoints

### GET /api/expenses
- Fetch all expenses
- Returns: Array of expense objects

### POST /api/expenses
- Create new expense
- Body: `{ description, amount, category, type }`
- Returns: Created expense object

### PUT /api/expenses/:id
- Update existing expense
- Body: `{ description, amount, category, type }`
- Returns: Updated expense object

### DELETE /api/expenses/:id
- Delete expense by ID
- Returns: Success message

## Frontend Integration

Replace the existing `trackerscript.js` with `api-integration.js` or merge the API functions into your existing file.

## Environment Variables

Create `.env` file:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/expenseflow
NODE_ENV=development
```

## Data Validation

- Description: Required, max 100 characters
- Amount: Required, minimum 0.01
- Category: Required, must be valid category
- Type: Required, 'income' or 'expense'