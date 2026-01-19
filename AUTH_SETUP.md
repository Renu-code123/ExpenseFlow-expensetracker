# ExpenseFlow Authentication Setup

## New Features Added

### 🔐 User Authentication System
- User registration and login
- JWT token-based authentication
- Password hashing with bcrypt
- Session management
- User-specific expense data

## Files Created/Modified

### Backend Files:
1. **`models/User.js`** - User model with password hashing
2. **`middleware/auth.js`** - JWT authentication middleware
3. **`routes/auth.js`** - Registration and login endpoints
4. **Updated `routes/expenses.js`** - Protected routes with user association
5. **Updated `server.js`** - Added auth routes
6. **Updated `package.json`** - Added bcryptjs and jsonwebtoken
7. **Updated `.env`** - Added JWT_SECRET and JWT_EXPIRE

### Frontend Files:
1. **`auth-integration.js`** - Complete authentication UI and API integration

## API Endpoints

### Authentication Routes:
- **POST /api/auth/register** - User registration
- **POST /api/auth/login** - User login

### Protected Expense Routes (require JWT token):
- **GET /api/expenses** - Get user's expenses
- **POST /api/expenses** - Create expense for user
- **PUT /api/expenses/:id** - Update user's expense
- **DELETE /api/expenses/:id** - Delete user's expense

## Setup Instructions

1. **Install new dependencies:**
```bash
npm install bcryptjs jsonwebtoken
```

2. **Update environment variables in `.env`:**
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
```

3. **Include authentication in HTML:**
```html
<script src="auth-integration.js"></script>
```

## Security Features

✅ **Password Hashing** - bcrypt with salt rounds  
✅ **JWT Tokens** - Secure token-based authentication  
✅ **Protected Routes** - Middleware authentication  
✅ **User Isolation** - Each user sees only their data  
✅ **Session Management** - Automatic token handling  
✅ **Input Validation** - Joi schema validation  

## Usage

1. Users must register/login to access the app
2. All expense data is user-specific
3. JWT tokens expire after 7 days
4. Automatic logout on token expiration
5. Secure password requirements (minimum 6 characters)

The authentication system ensures complete data privacy and security for each user.