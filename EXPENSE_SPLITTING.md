# Expense Splitting & Group Management System

## Overview
This feature implements a Splitwise-like expense splitting system that allows users to share expenses with friends, family, or roommates. It includes group management, balance tracking, settlement recording, and automated reminders.

## Features Implemented

### ✅ Backend Features

#### 1. Database Models
- **Group Model** (`models/Group.js`)
  - Group name, description, category, icon
  - Member management with active/inactive status
  - Total expenses and settled amount tracking
  - Debt simplification option

- **SplitExpense Model** (`models/SplitExpense.js`)
  - Expense description and total amount
  - Multiple split types support
  - Individual split tracking with payment status
  - Balance calculation methods

- **Settlement Model** (`models/Settlement.js`)
  - Payment recording between users
  - Transaction method and ID
  - Verification and dispute handling
  - Settlement history tracking

#### 2. Split Service (`services/splitService.js`)
- **Split Calculation Methods**:
  - Equal split (divide equally among all members)
  - Exact amounts (specify exact amount for each person)
  - Percentage-based (split by percentage)
  - Shares-based (split by custom shares, e.g., 2:1:1)

- **Balance Management**:
  - Calculate user balances across all expenses
  - Group balance calculation
  - Debt simplification algorithm (minimize transactions)

- **Settlement Handling**:
  - Record settlements between users
  - Track related expenses
  - Update split payment statuses

#### 3. API Endpoints

**Group Management** (`routes/groups.js`)
- `POST /api/groups` - Create new group
- `GET /api/groups` - Get user's groups
- `GET /api/groups/:id` - Get group details with stats
- `PUT /api/groups/:id` - Update group (creator only)
- `POST /api/groups/:id/members` - Add member to group
- `DELETE /api/groups/:id/members/:userId` - Remove member
- `DELETE /api/groups/:id` - Delete group (no unsettled expenses)

**Split Expenses** (`routes/splits.js`)
- `POST /api/splits` - Create split expense
- `GET /api/splits` - Get user's split expenses
- `GET /api/splits/balance` - Get balance summary
- `GET /api/splits/group/:groupId` - Get group expenses
- `GET /api/splits/:id` - Get expense details
- `POST /api/splits/:id/settle` - Mark split as paid
- `DELETE /api/splits/:id` - Delete expense (creator only)

**Settlements** (`routes/splits.js`)
- `POST /api/splits/settlement` - Record settlement
- `GET /api/splits/settlements/history` - Get settlement history
- `GET /api/splits/settlements/summary` - Get settlement summary

#### 4. Validation Middleware (`middleware/splitValidator.js`)
- Group creation/update validation
- Split expense creation validation
- Settlement recording validation
- Split type specific validation

## Split Types Explained

### 1. Equal Split
Divides the total amount equally among all members.

**Example**: ₹1500 dinner split 3 ways
```javascript
{
  "totalAmount": 1500,
  "splitType": "equal",
  "members": [
    { "userId": "user1", "name": "Alice", "email": "alice@example.com" },
    { "userId": "user2", "name": "Bob", "email": "bob@example.com" },
    { "userId": "user3", "name": "Charlie", "email": "charlie@example.com" }
  ]
}

Result:
- Alice: ₹500
- Bob: ₹500
- Charlie: ₹500
```

### 2. Exact Amounts
Specify exact amount for each person.

**Example**: Groceries where each person bought different items
```javascript
{
  "totalAmount": 2000,
  "splitType": "exact",
  "splitData": {
    "amounts": [800, 700, 500]
  }
}

Result:
- Person 1: ₹800
- Person 2: ₹700
- Person 3: ₹500
```

### 3. Percentage Split
Split by percentage of total.

**Example**: Business expense split by ownership percentage
```javascript
{
  "totalAmount": 10000,
  "splitType": "percentage",
  "splitData": {
    "percentages": [50, 30, 20]
  }
}

Result:
- Person 1: ₹5000 (50%)
- Person 2: ₹3000 (30%)
- Person 3: ₹2000 (20%)
```

### 4. Shares-Based Split
Split by custom share ratios.

**Example**: Rent split where one person has a larger room
```javascript
{
  "totalAmount": 15000,
  "splitType": "shares",
  "splitData": {
    "shares": [2, 1, 1]
  }
}

Result:
- Person 1: ₹7500 (2 shares out of 4 total)
- Person 2: ₹3750 (1 share)
- Person 3: ₹3750 (1 share)
```

## API Usage Examples

### Create a Group
```javascript
POST /api/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Roommates",
  "description": "Apartment expenses",
  "category": "home",
  "icon": "🏠",
  "currency": "INR",
  "members": [
    {
      "userId": "user2_id",
      "name": "Roommate 1",
      "email": "roommate1@example.com"
    },
    {
      "userId": "user3_id",
      "name": "Roommate 2",
      "email": "roommate2@example.com"
    }
  ],
  "simplifyDebts": true
}
```

### Create Split Expense
```javascript
POST /api/splits
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "Electricity Bill",
  "totalAmount": 3000,
  "currency": "INR",
  "category": "utilities",
  "splitType": "equal",
  "groupId": "group_id_here",
  "members": [
    { "userId": "user1", "name": "You", "email": "you@example.com" },
    { "userId": "user2", "name": "Roommate1", "email": "rm1@example.com" },
    { "userId": "user3", "name": "Roommate2", "email": "rm2@example.com" }
  ],
  "notes": "January electricity bill"
}
```

### Get Balance Summary
```javascript
GET /api/splits/balance?groupId=group_id_here
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "balances": [
      {
        "userId": "user2",
        "name": "Roommate 1",
        "email": "rm1@example.com",
        "amount": 1000  // You are owed ₹1000
      },
      {
        "userId": "user3",
        "name": "Roommate 2",
        "email": "rm2@example.com",
        "amount": -500  // You owe ₹500
      }
    ],
    "settlements": {
      "totalPaid": 2500,
      "totalReceived": 3000,
      "netBalance": 500,
      "count": 5
    },
    "simplifiedDebts": [
      {
        "from": "user1",
        "fromName": "You",
        "to": "user2",
        "toName": "Roommate 1",
        "amount": 500
      }
    ]
  }
}
```

### Record Settlement
```javascript
POST /api/splits/settlement
Authorization: Bearer <token>
Content-Type: application/json

{
  "paidToUserId": "user2_id",
  "amount": 1000,
  "currency": "INR",
  "groupId": "group_id",
  "method": "upi",
  "transactionId": "123456789",
  "notes": "Paid via UPI",
  "relatedExpenses": ["expense1_id", "expense2_id"]
}
```

## Balance Calculation Logic

### Individual Balance
For each expense:
- If you paid: You are owed the total amount minus your share
- If someone else paid: You owe your share

**Example**:
- Alice paid ₹3000 for dinner split 3 ways equally
- Alice's balance: +₹3000 - ₹1000 = +₹2000 (owed)
- Bob's balance: -₹1000 (owes Alice)
- Charlie's balance: -₹1000 (owes Alice)

### Debt Simplification
Minimizes the number of transactions needed to settle all debts.

**Before Simplification**:
- Alice owes Bob ₹500
- Bob owes Charlie ₹300
- Charlie owes Alice ₹200

**After Simplification**:
- Alice pays Bob ₹300
- Bob pays Charlie ₹300
(Reduced from 3 to 2 transactions)

## Group Categories

| Category | Icon | Use Case |
|----------|------|----------|
| trip | ✈️ | Travel expenses |
| home | 🏠 | Roommate/household expenses |
| couple | 💑 | Couple shared expenses |
| friends | 👥 | Friend group expenses |
| project | 💼 | Project/work expenses |
| event | 🎉 | Event/party expenses |
| other | 📋 | General expenses |

## Database Schema Details

### Group Schema
```javascript
{
  name: String,
  description: String,
  createdBy: ObjectId (User),
  members: [{
    user: ObjectId (User),
    name: String,
    email: String,
    joinedAt: Date,
    isActive: Boolean
  }],
  category: Enum,
  icon: String,
  currency: String,
  isActive: Boolean,
  simplifyDebts: Boolean,
  totalExpenses: Number,
  settledAmount: Number,
  timestamps: true
}
```

### SplitExpense Schema
```javascript
{
  description: String,
  totalAmount: Number,
  currency: String,
  paidBy: {
    user: ObjectId,
    name: String,
    email: String
  },
  group: ObjectId (Group),
  category: Enum,
  date: Date,
  splitType: Enum ['equal', 'exact', 'percentage', 'shares'],
  splits: [{
    user: ObjectId,
    name: String,
    email: String,
    amount: Number,
    percentage: Number,
    shares: Number,
    paid: Boolean,
    paidAt: Date
  }],
  notes: String,
  receipt: { url, publicId },
  isSettled: Boolean,
  settledAt: Date,
  createdBy: ObjectId,
  timestamps: true
}
```

### Settlement Schema
```javascript
{
  paidBy: { user: ObjectId, name, email },
  paidTo: { user: ObjectId, name, email },
  amount: Number,
  currency: String,
  group: ObjectId,
  relatedExpenses: [ObjectId],
  method: Enum,
  transactionId: String,
  notes: String,
  receipt: { url, publicId },
  settledAt: Date,
  verifiedBy: ObjectId,
  verifiedAt: Date,
  status: Enum ['pending', 'verified', 'disputed'],
  timestamps: true
}
```

## Business Rules

### Group Management
1. Minimum 2 members required to create a group
2. Creator is automatically added as first member
3. Only creator can update group settings
4. Only creator can delete group
5. Cannot delete group with unsettled expenses
6. Members can leave groups (marks as inactive)

### Split Expenses
1. Split amounts must equal total amount
2. User who paid is automatically marked as "paid"
3. Cannot delete expense if any splits are paid
4. Only creator can delete expense
5. All members must be part of group (if group expense)

### Settlements
1. Cannot settle with yourself
2. Settlement must be between valid users
3. Settlement updates related expense statuses
4. Settlement can be verified or disputed
5. Group settled amount increases with each settlement

## Error Handling

### Common Errors
- **400 Bad Request**: Validation errors, invalid split amounts
- **403 Forbidden**: Not a group member, not creator
- **404 Not Found**: Group/expense/user not found
- **500 Internal Server Error**: Database or server errors

### Validation Messages
- "Split amounts must equal total amount"
- "Exact split requires amounts for all members"
- "Percentages must sum to 100"
- "Cannot settle with yourself"
- "Only group creator can update group details"
- "Cannot delete group with unsettled expenses"

## Performance Optimizations

### Database Indexes
```javascript
// Group indexes
{ createdBy: 1 }
{ 'members.user': 1 }
{ isActive: 1 }

// SplitExpense indexes
{ group: 1, createdAt: -1 }
{ 'paidBy.user': 1 }
{ 'splits.user': 1 }
{ isSettled: 1 }
{ date: -1 }

// Settlement indexes
{ 'paidBy.user': 1, settledAt: -1 }
{ 'paidTo.user': 1, settledAt: -1 }
{ group: 1, settledAt: -1 }
{ status: 1 }
```

### Query Optimizations
- Use `.select()` to limit fields
- Populate only necessary references
- Implement pagination for large result sets
- Use aggregation pipeline for complex calculations

## Security Considerations

1. **Authentication**: All endpoints require valid JWT token
2. **Authorization**: Users can only access their own data
3. **Group Access**: Verify group membership before operations
4. **Input Validation**: Joi schemas validate all inputs
5. **Amount Validation**: Prevent negative values and ensure totals match

## Testing Checklist

### Group Operations
- [ ] Create group with valid members
- [ ] Add/remove members
- [ ] Update group settings
- [ ] Delete group (with/without unsettled expenses)
- [ ] Get user's groups
- [ ] Non-member access denied

### Split Expenses
- [ ] Create split with each split type
- [ ] Validate split amounts equal total
- [ ] Mark splits as paid
- [ ] Calculate balances correctly
- [ ] Delete expense (with restrictions)

### Settlements
- [ ] Record settlement between users
- [ ] Update related expenses
- [ ] Get settlement history
- [ ] Calculate settlement summary
- [ ] Prevent self-settlement

### Balance Calculations
- [ ] Calculate individual balances
- [ ] Calculate group balances
- [ ] Debt simplification algorithm
- [ ] Handle multiple currencies

## Future Enhancements

1. **Recurring Expenses**: Support for recurring group expenses
2. **Bill Splitting from Image**: OCR to extract and split from bill photos
3. **Multi-Currency Support**: Handle splits across different currencies
4. **Push Notifications**: Real-time notifications for new expenses
5. **Email Reminders**: Automated reminders for pending settlements
6. **Activity Feed**: Timeline of all group activities
7. **Export Reports**: PDF/CSV exports of group expenses
8. **Budget Limits**: Set spending limits for groups
9. **Expense Categories Analytics**: Breakdown by category
10. **Integration with Payment Apps**: Direct payment through UPI/PayPal

## Troubleshooting

### Issue: Split amounts don't match total
**Solution**: Ensure sum of all split amounts equals total amount exactly. Small rounding differences (<0.01) are allowed.

### Issue: Cannot delete group
**Solution**: Settle all expenses in the group first, then delete.

### Issue: Balance calculation seems wrong
**Solution**: Check all unsettled expenses. Balance = (Total you paid) - (Your shares in all expenses)

### Issue: Member not found
**Solution**: Ensure user is registered in the system before adding to group.

## Contributing

When contributing to split expense feature:
1. Follow existing code patterns
2. Add tests for new split types
3. Update documentation
4. Ensure backward compatibility
5. Handle edge cases (rounding, zero amounts, etc.)

## Support

For issues or questions:
- Check API response error messages
- Verify user permissions and group membership
- Review balance calculation logic
- Contact development team

---

**Implementation Date**: January 20, 2026  
**Version**: 1.0.0  
**Status**: ✅ Completed  
**Issue**: #77
