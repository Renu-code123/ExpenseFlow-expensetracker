const express = require('express');
const Workspace = require('../models/Workspace');
const collaborationService = require('../services/collaborationService');
const auth = require('../middleware/auth');
const router = express.Router();

// Create workspace
router.post('/', auth, async (req, res) => {
  try {
    const workspace = await collaborationService.createWorkspace(req.user._id, req.body);
    res.status(201).json(workspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user workspaces
router.get('/', auth, async (req, res) => {
  try {
    const workspaces = await collaborationService.getUserWorkspaces(req.user._id);
    res.json(workspaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add member to workspace
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { userId, role } = req.body;
    const workspace = await collaborationService.addMember(req.params.id, userId, role);
    res.json(workspace);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;