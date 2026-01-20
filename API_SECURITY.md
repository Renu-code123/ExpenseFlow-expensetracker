# ExpenseFlow API Security & Rate Limiting

## Features Implemented

### 🔒 Comprehensive Security System
- Multi-tier rate limiting for different endpoints
- Security headers with Helmet.js
- Input sanitization against XSS and injection attacks
- CORS policy configuration
- IP blocking for suspicious activity
- Security monitoring and logging

## New Files Created

### Backend Files:
1. **`middleware/rateLimiter.js`** - Multi-tier rate limiting configuration
2. **`middleware/sanitization.js`** - Input validation and XSS protection
3. **`services/securityMonitor.js`** - Suspicious activity detection and IP blocking
4. **`routes/security.js`** - Security management and monitoring endpoints

### Updated Files:
1. **`server.js`** - Integrated all security middleware and monitoring
2. **`routes/auth.js`** - Added failed login attempt logging
3. **`package.json`** - Added security dependencies
4. **`.env`** - Added security configuration variables

## Security Features

### ✅ Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Authentication**: 5 attempts per 15 minutes
- **File Upload**: 20 uploads per hour
- **Email Notifications**: 10 requests per hour
- **Expense Operations**: 30 requests per minute

### ✅ Security Headers (Helmet.js)
- **Content Security Policy** - Prevents XSS attacks
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **Referrer-Policy** - Controls referrer information
- **Permissions-Policy** - Restricts browser features

### ✅ Input Sanitization
- **XSS Protection** - Sanitizes HTML/JavaScript in inputs
- **MongoDB Injection Prevention** - Removes NoSQL injection attempts
- **Input Validation** - Comprehensive validation rules for all endpoints
- **Data Escaping** - Escapes dangerous characters

### ✅ CORS Configuration
- **Origin Whitelist** - Only allowed domains can access API
- **Credential Support** - Secure cookie and auth header handling
- **Method Restrictions** - Limited to necessary HTTP methods
- **Header Control** - Restricted allowed headers

### ✅ Security Monitoring
- **Failed Login Tracking** - Monitors authentication attempts
- **Suspicious Activity Detection** - Identifies unusual patterns
- **IP Blocking** - Automatic blocking after 10 suspicious events
- **Security Logging** - Comprehensive audit trail
- **Real-time Alerts** - Immediate notification of security events

## API Endpoints

### Security Management Routes:
- **GET /api/security/stats** - Security statistics and metrics
- **GET /api/security/logs** - Recent security event logs
- **GET /api/security/blocked-ips** - List of blocked IP addresses
- **POST /api/security/unblock-ip** - Unblock specific IP address
- **GET /api/security/health** - Security system health check

## Rate Limiting Configuration

### Endpoint-Specific Limits:
```javascript
// Authentication routes
authLimiter: 5 requests per 15 minutes

// File upload routes  
uploadLimiter: 20 uploads per hour

// Email notification routes
emailLimiter: 10 requests per hour

// Expense operations
expenseLimiter: 30 requests per minute

// General API access
generalLimiter: 100 requests per 15 minutes
```

## Input Validation Rules

### User Registration/Login:
- **Name**: 2-50 characters, HTML escaped
- **Email**: Valid email format, normalized
- **Password**: Minimum 6 characters

### Expense Data:
- **Description**: 1-100 characters, XSS sanitized
- **Amount**: Positive number validation
- **Category**: Whitelist validation
- **Type**: Income/expense validation

### Budget/Goals:
- **Names/Titles**: Length limits, HTML escaping
- **Amounts**: Positive number validation
- **Categories**: Enum validation

## Security Monitoring

### Tracked Events:
- **failed_login** - Invalid authentication attempts
- **rate_limit_exceeded** - API rate limit violations
- **suspicious_activity** - Unusual request patterns
- **blocked_ip** - IP address blocking events

### Automatic IP Blocking:
- **Threshold**: 10 suspicious events
- **Duration**: Permanent (admin unblock required)
- **Cleanup**: Hourly cleanup of old entries
- **Logging**: All blocking events logged

## Security Statistics

### Available Metrics:
```javascript
{
  totalEvents: 150,
  uniqueIPs: 45,
  blockedIPs: 3,
  eventBreakdown: {
    failed_login: { count: 25, uniqueIPs: 8 },
    rate_limit_exceeded: { count: 12, uniqueIPs: 5 },
    suspicious_activity: { count: 8, uniqueIPs: 3 }
  },
  timeframe: "24 hours"
}
```

## Setup Instructions

1. **Install security dependencies:**
```bash
npm install express-rate-limit helmet express-validator express-mongo-sanitize xss
```

2. **Configure environment variables:**
```env
FRONTEND_URL=http://localhost:3000
ADMIN_EMAIL=admin@expenseflow.com
NODE_ENV=production
```

3. **Security middleware is automatically applied to all routes**

## Admin Functions

### Security Management:
- **View Security Stats** - Monitor system security health
- **Review Security Logs** - Audit security events
- **Manage Blocked IPs** - Unblock legitimate users
- **System Health Check** - Monitor security system status

### Access Control:
- Admin routes require special email configuration
- All security operations are logged
- Role-based access control for sensitive functions

## Benefits

🔒 **Attack Prevention** - Multiple layers of security protection  
⚡ **Performance Protection** - Rate limiting prevents API abuse  
🛡️ **Data Safety** - Input sanitization prevents injection attacks  
📊 **Security Visibility** - Comprehensive monitoring and logging  
🚫 **Automatic Blocking** - Proactive threat mitigation  
⚙️ **Easy Management** - Admin dashboard for security oversight  

The security system transforms ExpenseFlow into an enterprise-grade application with robust protection against common web vulnerabilities and API abuse.

**Resolves: #57**