# Collaborative Financial Planning with Shared Goals & Permissions

## Overview

The Collaborative Financial Planning feature enables multiple users to manage shared expenses, budgets, and financial goals together. Perfect for families, couples, roommates, and small businesses, this feature provides granular permission controls, expense approval workflows, and comprehensive activity tracking.

## Features

### 1. **Shared Spaces**
- Create dedicated financial spaces for different groups (family, couple, roommates, business, friends)
- Invite members via unique invite codes
- Set privacy modes: open, restricted, or private
- Configure approval thresholds for large expenses
- Customize notification preferences per space

### 2. **Role-Based Permissions**
Four predefined roles with granular permission controls:

| Role | View | Add | Edit | Delete | Manage Goals | Manage Budgets | Approve | Manage Members | Reports |
|------|------|-----|------|--------|--------------|----------------|---------|----------------|---------|
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Manager** | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✓ |
| **Contributor** | ✓ | ✓ | ✓ | ✗ | View Only | View Only | ✗ | ✗ | ✓ |
| **Viewer** | ✓ | ✗ | ✗ | ✗ | View Only | View Only | ✗ | ✗ | ✓ |

### 3. **Shared Goals**
- Create financial goals with multiple contributors
- Track individual contributions and progress
- Set target amounts and deadlines
- Define allocation rules: equal, proportional, or custom
- Configure milestone alerts (e.g., 25%, 50%, 75% complete)
- Support for various goal categories: savings, investment, purchase, vacation, emergency, education

### 4. **Expense Approval Workflow**
- Set approval thresholds (e.g., require approval for expenses > ₹10,000)
- Multi-level approval support (require N approvers)
- Priority levels: low, medium, high, urgent
- Automatic expense creation upon approval
- Email notifications for approvers and requesters
- 7-day expiration for pending requests

### 5. **Privacy Controls**
Members can configure privacy settings:
- Hide personal transactions
- Hide income information
- Hide savings data

### 6. **Activity Logging**
Comprehensive audit trail for:
- Member additions/removals
- Role changes
- Expense additions/edits/deletions
- Goal creations/updates/completions
- Budget changes
- Approval requests and decisions
- Settings modifications

### 7. **Reporting & Analytics**
- Consolidated space reports with date ranges
- Expense breakdown by category and member
- Goal progress tracking
- Member contribution summaries
- Recent activity logs

## Data Models

### SharedSpace
```javascript
{
  name: String,                    // Space name
  description: String,             // Optional description
  type: String,                    // family, couple, roommates, business, friends, other
  owner: ObjectId,                 // Space creator
  members: [{
    user: ObjectId,
    role: String,                  // admin, manager, contributor, viewer
    permissions: {
      view_expenses: Boolean,
      add_expenses: Boolean,
      edit_expenses: Boolean,
      delete_expenses: Boolean,
      view_goals: Boolean,
      manage_goals: Boolean,
      view_budgets: Boolean,
      manage_budgets: Boolean,
      approve_expenses: Boolean,
      manage_members: Boolean,
      view_reports: Boolean
    },
    privacy_settings: {
      hide_personal_transactions: Boolean,
      hide_income: Boolean,
      hide_savings: Boolean
    },
    notification_preferences: {
      new_expense: Boolean,
      goal_progress: Boolean,
      budget_alert: Boolean,
      approval_request: Boolean,
      member_activity: Boolean
    },
    joined_at: Date
  }],
  settings: {
    currency: String,
    require_approval_above: Number,
    approval_threshold_count: Number,
    privacy_mode: String,
    enable_notifications: Boolean,
    notification_channels: [String]
  },
  invite_code: String,
  isActive: Boolean
}
```

### SharedGoal
```javascript
{
  space: ObjectId,
  name: String,
  description: String,
  target_amount: Number,
  current_amount: Number,
  currency: String,
  deadline: Date,
  category: String,                // savings, investment, purchase, etc.
  contributors: [{
    user: ObjectId,
    target_contribution: Number,
    current_contribution: Number,
    contribution_percentage: Number,
    last_contribution_date: Date
  }],
  contributions: [{
    user: ObjectId,
    amount: Number,
    date: Date,
    note: String,
    transaction_id: ObjectId
  }],
  status: String,                  // active, completed, paused, cancelled
  priority: String,
  visibility: String,
  auto_allocate: Boolean,
  allocation_rule: String,         // equal, proportional, custom
  milestone_alerts: [{
    percentage: Number,
    triggered: Boolean
  }],
  created_by: ObjectId
}
```

### ApprovalRequest
```javascript
{
  space: ObjectId,
  requester: ObjectId,
  expense_data: {
    description: String,
    amount: Number,
    category: String,
    date: Date,
    notes: String,
    receipt_url: String
  },
  status: String,                  // pending, approved, rejected, cancelled
  approvals: [{
    approver: ObjectId,
    decision: String,              // approved, rejected
    comment: String,
    decided_at: Date
  }],
  required_approvals: Number,
  priority: String,
  expense_id: ObjectId,
  expires_at: Date
}
```

### SpaceActivity
```javascript
{
  space: ObjectId,
  actor: ObjectId,
  action: String,                  // member_added, expense_added, goal_created, etc.
  target_type: String,             // expense, goal, budget, member, space, approval
  target_id: ObjectId,
  details: {
    old_value: Mixed,
    new_value: Mixed,
    amount: Number,
    description: String
  }
}
```

## API Endpoints

### Shared Spaces

#### Create Shared Space
```http
POST /api/shared-spaces
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Family Budget",
  "description": "Our household expenses",
  "type": "family",
  "settings": {
    "currency": "INR",
    "require_approval_above": 10000,
    "approval_threshold_count": 1,
    "privacy_mode": "open"
  }
}
```

#### Get User's Shared Spaces
```http
GET /api/shared-spaces
Authorization: Bearer <token>
```

#### Get Single Shared Space
```http
GET /api/shared-spaces/:id
Authorization: Bearer <token>
```

#### Update Shared Space
```http
PUT /api/shared-spaces/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Name",
  "settings": {
    "require_approval_above": 15000
  }
}
```

#### Archive Shared Space
```http
DELETE /api/shared-spaces/:id
Authorization: Bearer <token>
```

### Members

#### Add Member
```http
POST /api/shared-spaces/:id/members
Authorization: Bearer <token>
Content-Type: application/json

{
  "user_id": "user_id_here",
  "role": "contributor"
}
```

#### Join with Invite Code
```http
POST /api/shared-spaces/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "invite_code": "ABC12345"
}
```

#### Remove Member
```http
DELETE /api/shared-spaces/:id/members/:userId
Authorization: Bearer <token>
```

#### Update Member Role
```http
PUT /api/shared-spaces/:id/members/:userId
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "manager",
  "permissions": {
    "approve_expenses": true
  }
}
```

#### Regenerate Invite Code
```http
POST /api/shared-spaces/:id/invite-code/regenerate
Authorization: Bearer <token>
```

### Goals

#### Create Shared Goal
```http
POST /api/shared-spaces/:id/goals
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Emergency Fund",
  "description": "Build a 6-month emergency fund",
  "target_amount": 300000,
  "currency": "INR",
  "deadline": "2024-12-31",
  "category": "emergency",
  "allocation_rule": "equal",
  "milestone_alerts": [
    { "percentage": 25 },
    { "percentage": 50 },
    { "percentage": 75 }
  ]
}
```

#### Get Space Goals
```http
GET /api/shared-spaces/:id/goals?status=active
Authorization: Bearer <token>
```

#### Get Single Goal
```http
GET /api/shared-spaces/:id/goals/:goalId
Authorization: Bearer <token>
```

#### Add Contribution
```http
POST /api/shared-spaces/:id/goals/:goalId/contribute
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 5000,
  "note": "Monthly contribution"
}
```

#### Update Goal
```http
PUT /api/shared-spaces/:id/goals/:goalId
Authorization: Bearer <token>
Content-Type: application/json

{
  "target_amount": 350000,
  "status": "active"
}
```

### Approvals

#### Create Approval Request
```http
POST /api/shared-spaces/:id/approvals
Authorization: Bearer <token>
Content-Type: application/json

{
  "expense_data": {
    "description": "New laptop for work",
    "amount": 75000,
    "category": "electronics",
    "notes": "MacBook Pro for development"
  },
  "priority": "high"
}
```

#### Get Pending Approvals
```http
GET /api/shared-spaces/:id/approvals
Authorization: Bearer <token>
```

#### Approve/Reject Request
```http
POST /api/shared-spaces/:id/approvals/:requestId/approve
Authorization: Bearer <token>
Content-Type: application/json

{
  "comment": "Approved for business use"
}

POST /api/shared-spaces/:id/approvals/:requestId/reject
{
  "comment": "Please wait until next quarter"
}
```

#### Cancel Approval Request
```http
DELETE /api/shared-spaces/:id/approvals/:requestId
Authorization: Bearer <token>
```

### Reports & Activity

#### Get Space Report
```http
GET /api/shared-spaces/:id/report?start_date=2024-01-01&end_date=2024-01-31
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "space": {
      "id": "space_id",
      "name": "Family Budget",
      "type": "family",
      "currency": "INR",
      "members": 4
    },
    "period": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    },
    "summary": {
      "total_expenses": 125000,
      "expense_count": 87,
      "active_goals": 3,
      "completed_goals": 1
    },
    "expenses": {
      "by_category": {
        "Food": { "total": 35000, "count": 28 },
        "Transport": { "total": 15000, "count": 12 }
      },
      "by_member": {
        "user_id_1": { "name": "John", "total": 60000, "count": 40 },
        "user_id_2": { "name": "Jane", "total": 65000, "count": 47 }
      }
    },
    "goals": [...],
    "recent_activity": [...]
  }
}
```

#### Get Member Contributions
```http
GET /api/shared-spaces/:id/contributions/:userId
Authorization: Bearer <token>
```

#### Get Activity Log
```http
GET /api/shared-spaces/:id/activity?limit=50&skip=0
Authorization: Bearer <token>
```

## Usage Examples

### Example 1: Family Budget Management

```javascript
// 1. Create family space
const familySpace = await createSpace({
  name: "Smith Family Budget",
  type: "family",
  settings: {
    currency: "INR",
    require_approval_above: 10000,
    approval_threshold_count: 1
  }
});

// 2. Invite spouse with manager role
await addMember(familySpace.id, spouseUserId, "manager");

// 3. Create emergency fund goal
const emergencyGoal = await createGoal(familySpace.id, {
  name: "Emergency Fund",
  target_amount: 300000,
  allocation_rule: "equal",
  deadline: "2024-12-31"
});

// 4. Add monthly contribution
await contributeToGoal(familySpace.id, emergencyGoal.id, {
  amount: 10000,
  note: "January contribution"
});
```

### Example 2: Roommate Expense Sharing

```javascript
// 1. Create roommates space
const apartmentSpace = await createSpace({
  name: "Apartment 402",
  type: "roommates",
  settings: {
    require_approval_above: 5000,
    privacy_mode: "restricted"
  }
});

// 2. Share invite code
const inviteCode = apartmentSpace.invite_code;
// Others join: POST /api/shared-spaces/join { invite_code }

// 3. Create shared utility goal
await createGoal(apartmentSpace.id, {
  name: "Monthly Utilities",
  target_amount: 8000,
  allocation_rule: "equal",
  category: "other"
});
```

### Example 3: Business Expense Approval

```javascript
// 1. Request approval for large expense
const approvalRequest = await createApproval(businessSpace.id, {
  expense_data: {
    description: "New server hardware",
    amount: 150000,
    category: "equipment"
  },
  priority: "high"
});

// 2. Manager approves
await processApproval(businessSpace.id, approvalRequest.id, "approve", {
  comment: "Approved - necessary for scaling"
});

// 3. Expense automatically created
```

## Permission Matrix

### Detailed Permission Descriptions

| Permission | Description |
|-----------|-------------|
| `view_expenses` | View all expenses in the space |
| `add_expenses` | Add new expenses to the space |
| `edit_expenses` | Modify existing expenses |
| `delete_expenses` | Delete expenses (usually admin only) |
| `view_goals` | View shared goals and contributions |
| `manage_goals` | Create, update, and manage goals |
| `view_budgets` | View budget information |
| `manage_budgets` | Create and modify budgets |
| `approve_expenses` | Approve expense requests above threshold |
| `manage_members` | Add, remove, and modify member roles |
| `view_reports` | Access consolidated reports and analytics |

## Best Practices

### 1. **Space Configuration**
- Set appropriate approval thresholds based on group size and trust level
- Use privacy mode "restricted" for roommates, "open" for families
- Configure notification preferences to avoid alert fatigue

### 2. **Role Assignment**
- **Owner**: Person who manages the overall space (usually primary account holder)
- **Admin**: Trusted members who can manage everything (spouse, business partner)
- **Manager**: Members who can approve expenses but not manage members
- **Contributor**: Active participants who add expenses and contribute to goals
- **Viewer**: Members who need visibility but not management access

### 3. **Goal Setting**
- Use equal allocation for shared responsibilities (rent, utilities)
- Use proportional allocation based on income levels
- Use custom allocation for specific agreements
- Set realistic deadlines with buffer time
- Configure milestone alerts at 25%, 50%, 75%, 90%

### 4. **Approval Workflow**
- Set threshold at a level that balances control and convenience
- Use priority levels to indicate urgency
- Add context in approval requests to help approvers
- Respond to approval requests within 24-48 hours

### 5. **Privacy**
- Respect member privacy settings in reports
- Use "hide_personal_transactions" for members who want financial privacy
- Separate personal and shared spaces for better organization

### 6. **Activity Monitoring**
- Review activity logs regularly for transparency
- Use activity logs to track contribution patterns
- Monitor for unusual expense patterns

## Cron Jobs

### Cleanup Expired Approval Requests
**Schedule:** Daily at 2:00 AM
```javascript
cron.schedule('0 2 * * *', async () => {
  await cleanupExpiredApprovals();
});
```
- Automatically marks approval requests as "cancelled" after 7 days
- Logs activity for transparency
- Prevents clutter in pending requests

## Error Handling

### Common Errors

**403 Forbidden - Insufficient Permissions**
```json
{
  "success": false,
  "message": "You do not have permission to manage members"
}
```

**404 Not Found - Space Not Found**
```json
{
  "success": false,
  "message": "Shared space not found"
}
```

**400 Bad Request - Invalid Input**
```json
{
  "success": false,
  "message": "Validation error",
  "details": "target_amount must be at least 1"
}
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT token
2. **Permission Checks**: Every action validates user permissions
3. **Input Validation**: Joi schemas validate all input data
4. **Audit Trail**: All actions logged in SpaceActivity
5. **Invite Code Security**: 8-character alphanumeric codes, can be regenerated
6. **Privacy Protection**: Member privacy settings enforced in queries

## Future Enhancements

- [ ] Recurring contribution schedules
- [ ] Automated goal contributions from expenses
- [ ] Budget integration with shared spaces
- [ ] Mobile app notifications via Firebase
- [ ] Goal templates (e.g., "6-month emergency fund")
- [ ] Expense splitting algorithms
- [ ] Multi-currency support within same space
- [ ] Export reports to PDF/CSV
- [ ] Integration with banking APIs for auto-sync

## Support

For issues or questions:
- Check the activity log for audit trail
- Review permission settings for access issues
- Regenerate invite codes if experiencing join problems
- Contact support with space ID and error details

---

**Version:** 1.0.0  
**Last Updated:** January 2024  
**Maintainer:** ExpenseFlow Team
