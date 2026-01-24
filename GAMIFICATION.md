# Social Expense Challenges & Gamification System

This document describes the gamification system that makes expense tracking more engaging through challenges, achievements, leaderboards, and streak tracking.

## Overview

The gamification system introduces game mechanics to encourage better financial habits:
- **Challenges**: Time-limited goals users can create or join
- **Achievements**: Badges earned for reaching milestones
- **Leaderboards**: Compete with friends and the community
- **Streaks**: Track consistent behavior over time

## Features

### 1. Financial Challenges

#### Challenge Types
- **No Spend**: Track days with zero spending
- **Category Reduction**: Reduce spending in specific categories
- **Savings Target**: Save a specific amount
- **Budget Adherence**: Stay under budget for X days
- **Streak**: Maintain a behavior streak
- **Custom**: User-defined challenges

#### Pre-built Challenge Templates
| Template | Type | Difficulty | Points |
|----------|------|------------|--------|
| No Spend Weekend | no_spend | Easy | 50 |
| No Spend Week | no_spend | Medium | 150 |
| Coffee Shop Savings | category_reduction | Medium | 100 |
| Meal Prep Month | category_reduction | Hard | 200 |
| Entertainment Detox | category_reduction | Medium | 120 |
| Savings Sprint | savings_target | Medium | 150 |
| Budget Warrior | budget_adherence | Hard | 250 |
| Tracking Streak | streak | Easy | 75 |

### 2. Achievement Badges

#### Categories
- **Tracking**: Expense tracking milestones
- **Budgeting**: Budget adherence achievements
- **Savings**: Savings-related accomplishments
- **Streaks**: Consecutive day achievements
- **Challenges**: Challenge completion badges
- **Milestones**: Goal completion achievements

#### Achievement Tiers
- 🥉 **Bronze**: Entry-level achievements
- 🥈 **Silver**: Intermediate achievements
- 🥇 **Gold**: Advanced achievements
- 💎 **Platinum**: Expert achievements
- 💠 **Diamond**: Master achievements

#### Sample Achievements
| Badge | Name | Requirement | Points |
|-------|------|-------------|--------|
| 🌱 | First Steps | Track first expense | 10 |
| 📝 | Dedicated Tracker | Track 50 expenses | 25 |
| 🏆 | Tracking Master | Track 500 expenses | 100 |
| 💰 | Budget Beginner | Stay under budget 7 days | 20 |
| 👑 | Budget Master | Stay under budget 90 days | 150 |
| 🔥 | Week Warrior | 7-day login streak | 15 |
| 🎯 | Goal Crusher | Complete 5 goals | 100 |
| 🏆 | Challenge Champion | Complete 10 challenges | 150 |

### 3. Leaderboard System

#### Leaderboard Types
- **All Time**: Cumulative points ranking
- **Monthly**: Monthly points reset
- **Weekly**: Weekly points reset
- **Friends**: Users in shared workspaces

#### Privacy Controls
Users can configure:
- `showOnLeaderboard`: Appear on public leaderboards
- `showAchievements`: Display earned achievements publicly
- `showChallenges`: Show challenge participation
- `showStats`: Share detailed statistics

### 4. Streak Tracking

#### Tracked Streaks
- **Login Streak**: Consecutive days logged in
- **Expense Tracking**: Days tracking expenses
- **Budget Adherence**: Days staying under budget
- **No Spend**: Consecutive no-spend days
- **Savings**: Days with positive savings

### 5. Leveling System

#### Level Progression
- Each level requires progressively more XP
- Formula: `baseXP * level * 1.5`
- Points earned = Experience gained

#### Rank Titles
| Level Range | Rank |
|-------------|------|
| 1-4 | Novice |
| 5-9 | Apprentice |
| 10-19 | Adept |
| 20-29 | Expert |
| 30-39 | Master |
| 40-49 | Grandmaster |
| 50+ | Legend |

## API Endpoints

### Profile & Stats
```
GET  /api/gamification/profile     - Get user's gamification profile
GET  /api/gamification/stats       - Get detailed stats
PATCH /api/gamification/privacy    - Update privacy settings
```

### Achievements
```
GET  /api/gamification/achievements        - Get all achievements with progress
GET  /api/gamification/achievements/recent - Get recently earned achievements
```

### Leaderboard
```
GET  /api/gamification/leaderboard         - Get global leaderboard
GET  /api/gamification/leaderboard/friends - Get friends leaderboard
```

### Challenges
```
POST   /api/gamification/challenges              - Create challenge
GET    /api/gamification/challenges              - Get user's challenges
GET    /api/gamification/challenges/discover     - Discover public challenges
GET    /api/gamification/challenges/templates    - Get challenge templates
GET    /api/gamification/challenges/:id          - Get challenge details
POST   /api/gamification/challenges/:id/join     - Join challenge
POST   /api/gamification/challenges/:id/leave    - Leave challenge
PATCH  /api/gamification/challenges/:id/progress - Update progress
PUT    /api/gamification/challenges/:id          - Update challenge (creator)
DELETE /api/gamification/challenges/:id          - Delete/cancel challenge
POST   /api/gamification/challenges/:id/invite   - Invite users
```

### Initialize
```
POST /api/gamification/init - Initialize default achievements
```

## Data Models

### Challenge Schema
```javascript
{
  title: String,
  description: String,
  type: 'no_spend' | 'category_reduction' | 'savings_target' | 'streak' | 'budget_adherence' | 'custom',
  category: String,
  targetValue: Number,
  targetUnit: 'days' | 'amount' | 'percentage' | 'count',
  startDate: Date,
  endDate: Date,
  creator: ObjectId,
  isPublic: Boolean,
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme',
  rewardPoints: Number,
  participants: [{
    user: ObjectId,
    progress: Number,
    currentStreak: Number,
    status: 'active' | 'completed' | 'failed' | 'withdrawn'
  }]
}
```

### UserGamification Schema
```javascript
{
  user: ObjectId,
  totalPoints: Number,
  level: Number,
  experience: Number,
  rank: 'novice' | 'apprentice' | 'adept' | 'expert' | 'master' | 'grandmaster' | 'legend',
  earnedAchievements: [{ achievement: ObjectId, earnedAt: Date }],
  achievementProgress: [{ achievementCode: String, currentValue: Number, targetValue: Number }],
  streaks: [{ type: String, currentStreak: Number, longestStreak: Number }],
  privacySettings: {
    showOnLeaderboard: Boolean,
    showAchievements: Boolean,
    showChallenges: Boolean,
    showStats: Boolean
  },
  stats: {
    totalExpensesTracked: Number,
    totalGoalsCompleted: Number,
    loginStreak: Number,
    // ... other stats
  }
}
```

## Integration Points

### Automatic Tracking
The gamification service integrates with existing features:

1. **Expense Tracking**: Call `gamificationService.trackExpense(userId, expense)` when an expense is created
2. **Login**: Call `gamificationService.trackLogin(userId)` on successful authentication
3. **Goal Completion**: Call `gamificationService.trackGoalCompletion(userId)` when a goal is achieved
4. **Receipt Upload**: Call `gamificationService.trackReceiptUpload(userId)` on receipt upload
5. **Analytics View**: Call `gamificationService.trackAnalyticsView(userId)` when viewing dashboard

### Example Integration
```javascript
// In expense route
router.post('/', auth, async (req, res) => {
  // ... create expense
  
  // Track for gamification
  const gamificationService = require('../services/gamificationService');
  await gamificationService.trackExpense(req.user._id, expense);
});
```

## Real-time Updates

The system emits Socket.IO events:
- `points_earned`: When user earns points
- `achievement_unlocked`: When new achievement is earned
- `challenge_completed`: When challenge is completed
- `challenge_invitation`: When invited to a challenge

## Frontend Usage

```javascript
// Initialize
const gamification = new GamificationManager();
await gamification.init();

// Create a challenge
await gamification.createChallenge({
  title: 'My Challenge',
  description: 'Challenge description',
  type: 'no_spend',
  targetValue: 7,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7*24*60*60*1000).toISOString()
});

// Join a challenge
await gamification.joinChallenge(challengeId);

// Get leaderboard
await gamification.loadLeaderboard('weekly');
```

## Best Practices

1. **Initialize Achievements**: Run `POST /api/gamification/init` once to seed default achievements
2. **Periodic Resets**: Use cron jobs to reset weekly/monthly points
3. **Challenge Updates**: Regularly update challenge statuses based on dates
4. **Progress Calculation**: Recalculate challenge progress when expenses change

## Security Considerations

- All endpoints require authentication
- Users can only modify their own challenges or challenges they created
- Privacy settings control public visibility
- Rate limiting applied to prevent abuse
