const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateChallengeCreate, validateObjectId } = require('../middleware/gamificationValidator');
const gamificationService = require('../services/gamificationService');

// ========== USER PROFILE ROUTES ==========

/**
 * @route   GET /api/gamification/profile
 * @desc    Get user's gamification profile
 * @access  Private
 */
router.get('/profile', auth, async (req, res) => {
    try {
        const profile = await gamificationService.getUserProfile(req.user._id);

        res.json({
            success: true,
            data: {
                points: profile.points,
                level: profile.level,
                rankTitle: profile.rankTitle,
                streaks: profile.streaks,
                stats: profile.stats,
                badges: profile.badges.slice(0, 10),
                featuredBadges: profile.featuredBadges
            }
        });
    } catch (error) {
        console.error('[Gamification] Profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/gamification/track/dashboard
 * @desc    Track dashboard visit for achievements
 * @access  Private
 */
router.post('/track/dashboard', auth, async (req, res) => {
    try {
        await gamificationService.trackDashboardVisit(req.user._id);
        res.json({ success: true, message: 'Dashboard visit tracked' });
    } catch (error) {
        console.error('[Gamification] Track dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== ACHIEVEMENT ROUTES ==========

/**
 * @route   GET /api/gamification/achievements
 * @desc    Get all available achievements
 * @access  Private
 */
router.get('/achievements', auth, async (req, res) => {
    try {
        const { category, rarity } = req.query;
        const achievements = await gamificationService.getAchievements({ category, rarity });

        res.json({
            success: true,
            count: achievements.length,
            data: achievements
        });
    } catch (error) {
        console.error('[Gamification] Get achievements error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/gamification/achievements/user
 * @desc    Get user's achievement progress
 * @access  Private
 */
router.get('/achievements/user', auth, async (req, res) => {
    try {
        const { status, category } = req.query;
        const achievements = await gamificationService.getUserAchievements(req.user._id, { 
            status, 
            category 
        });

        // Separate completed and in-progress
        const completed = achievements.filter(a => a.status === 'completed');
        const inProgress = achievements.filter(a => a.status === 'in_progress');

        res.json({
            success: true,
            data: {
                completed: completed.length,
                inProgress: inProgress.length,
                achievements
            }
        });
    } catch (error) {
        console.error('[Gamification] Get user achievements error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/gamification/achievements/check
 * @desc    Check and award any new achievements
 * @access  Private
 */
router.post('/achievements/check', auth, async (req, res) => {
    try {
        const earnedAchievements = await gamificationService.checkAchievements(req.user._id);

        res.json({
            success: true,
            message: earnedAchievements.length > 0 
                ? `Earned ${earnedAchievements.length} new achievement(s)!` 
                : 'No new achievements',
            data: earnedAchievements
        });
    } catch (error) {
        console.error('[Gamification] Check achievements error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== CHALLENGE ROUTES ==========

/**
 * @route   GET /api/gamification/challenges
 * @desc    Get available challenges
 * @access  Private
 */
router.get('/challenges', auth, async (req, res) => {
    try {
        const { status, scope, type } = req.query;
        const challenges = await gamificationService.getChallenges({
            status: status || 'active',
            scope,
            type,
            userId: req.user._id
        });

        res.json({
            success: true,
            count: challenges.length,
            data: challenges
        });
    } catch (error) {
        console.error('[Gamification] Get challenges error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/gamification/challenges
 * @desc    Create a new challenge
 * @access  Private
 */
router.post('/challenges', auth, validateChallengeCreate, async (req, res) => {
    try {
        const challenge = await gamificationService.createChallenge(req.user._id, req.validatedBody);

        const io = req.app.get('io');
        io.to(`user_${req.user._id}`).emit('challenge_created', challenge);

        res.status(201).json({
            success: true,
            message: 'Challenge created successfully',
            data: challenge
        });
    } catch (error) {
        console.error('[Gamification] Create challenge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/gamification/challenges/user
 * @desc    Get user's challenge participations
 * @access  Private
 */
router.get('/challenges/user', auth, async (req, res) => {
    try {
        const { status } = req.query;
        const statusArray = status ? status.split(',') : null;
        
        const participations = await gamificationService.getUserChallenges(req.user._id, {
            status: statusArray
        });

        res.json({
            success: true,
            count: participations.length,
            data: participations
        });
    } catch (error) {
        console.error('[Gamification] Get user challenges error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/gamification/challenges/:id
 * @desc    Get challenge details
 * @access  Private
 */
router.get('/challenges/:id', auth, validateObjectId, async (req, res) => {
    try {
        const challenge = await gamificationService.getChallengeById(req.params.id);

        if (!challenge) {
            return res.status(404).json({ error: 'Challenge not found' });
        }

        res.json({
            success: true,
            data: challenge
        });
    } catch (error) {
        console.error('[Gamification] Get challenge error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/gamification/challenges/:id/join
 * @desc    Join a challenge
 * @access  Private
 */
router.post('/challenges/:id/join', auth, validateObjectId, async (req, res) => {
    try {
        const participant = await gamificationService.joinChallenge(req.user._id, req.params.id);

        const io = req.app.get('io');
        io.to(`user_${req.user._id}`).emit('challenge_joined', participant);

        res.json({
            success: true,
            message: 'Successfully joined the challenge!',
            data: participant
        });
    } catch (error) {
        console.error('[Gamification] Join challenge error:', error);
        if (error.message.includes('not found') || error.message.includes('not available') || error.message.includes('Already joined')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/gamification/challenges/:id/leave
 * @desc    Leave a challenge
 * @access  Private
 */
router.post('/challenges/:id/leave', auth, validateObjectId, async (req, res) => {
    try {
        const participant = await gamificationService.leaveChallenge(req.user._id, req.params.id);

        const io = req.app.get('io');
        io.to(`user_${req.user._id}`).emit('challenge_left', { challengeId: req.params.id });

        res.json({
            success: true,
            message: 'Left the challenge',
            data: participant
        });
    } catch (error) {
        console.error('[Gamification] Leave challenge error:', error);
        if (error.message.includes('Not participating')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   POST /api/gamification/challenges/:id/progress
 * @desc    Update challenge progress
 * @access  Private
 */
router.post('/challenges/:id/progress', auth, validateObjectId, async (req, res) => {
    try {
        const { increment, set, dailyValue, achieved } = req.body;
        
        const participant = await gamificationService.updateChallengeProgress(
            req.user._id, 
            req.params.id,
            { increment, set, dailyValue, achieved }
        );

        const io = req.app.get('io');
        io.to(`user_${req.user._id}`).emit('challenge_progress', participant);

        res.json({
            success: true,
            message: 'Progress updated',
            data: participant
        });
    } catch (error) {
        console.error('[Gamification] Update progress error:', error);
        if (error.message.includes('Not actively participating')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/gamification/challenges/:id/leaderboard
 * @desc    Get challenge leaderboard
 * @access  Private
 */
router.get('/challenges/:id/leaderboard', auth, validateObjectId, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const leaderboard = await gamificationService.getChallengeLeaderboard(req.params.id, limit);

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('[Gamification] Get challenge leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== LEADERBOARD ROUTES ==========

/**
 * @route   GET /api/gamification/leaderboard
 * @desc    Get global leaderboard
 * @access  Private
 */
router.get('/leaderboard', auth, async (req, res) => {
    try {
        const { period, limit } = req.query;
        const leaderboard = await gamificationService.getGlobalLeaderboard({
            period: period || 'all',
            limit: parseInt(limit) || 50
        });

        res.json({
            success: true,
            data: leaderboard
        });
    } catch (error) {
        console.error('[Gamification] Get leaderboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/gamification/leaderboard/rank
 * @desc    Get user's rank on leaderboard
 * @access  Private
 */
router.get('/leaderboard/rank', auth, async (req, res) => {
    try {
        const { period } = req.query;
        const leaderboard = await gamificationService.getGlobalLeaderboard({
            period: period || 'all',
            limit: 1000
        });

        const userRank = leaderboard.findIndex(entry => 
            entry.user.id.toString() === req.user._id.toString()
        );

        res.json({
            success: true,
            data: {
                rank: userRank >= 0 ? userRank + 1 : null,
                totalParticipants: leaderboard.length
            }
        });
    } catch (error) {
        console.error('[Gamification] Get rank error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== ADMIN ROUTES (for seeding) ==========

/**
 * @route   POST /api/gamification/admin/seed
 * @desc    Seed default achievements and challenges (admin only)
 * @access  Private
 */
router.post('/admin/seed', auth, async (req, res) => {
    try {
        await gamificationService.seedAchievements();
        await gamificationService.createSystemChallenges();

        res.json({
            success: true,
            message: 'Default achievements and challenges seeded'
        });
    } catch (error) {
        console.error('[Gamification] Seed error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
