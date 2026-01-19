const express = require('express');
const Joi = require('joi');
const Expense = require('../models/Expense');
const SyncQueue = require('../models/SyncQueue');
const auth = require('../middleware/auth');
const router = express.Router();

const syncSchema = Joi.object({
  operations: Joi.array().items(
    Joi.object({
      action: Joi.string().valid('CREATE', 'UPDATE', 'DELETE').required(),
      resourceType: Joi.string().valid('expense').required(),
      resourceId: Joi.string().required(),
      data: Joi.object().optional(),
      deviceId: Joi.string().required()
    })
  ).required()
});

// POST sync offline data
router.post('/batch', auth, async (req, res) => {
  try {
    const { error, value } = syncSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const results = [];
    const io = req.app.get('io');

    for (const operation of value.operations) {
      try {
        let result;
        
        switch (operation.action) {
          case 'CREATE':
            const expense = new Expense({ 
              ...operation.data, 
              user: req.user._id 
            });
            result = await expense.save();
            
            // Emit to other devices
            io.to(`user_${req.user._id}`).emit('expense_created', result);
            break;
            
          case 'UPDATE':
            result = await Expense.findOneAndUpdate(
              { _id: operation.resourceId, user: req.user._id },
              operation.data,
              { new: true }
            );
            
            if (result) {
              io.to(`user_${req.user._id}`).emit('expense_updated', result);
            }
            break;
            
          case 'DELETE':
            result = await Expense.findOneAndDelete({
              _id: operation.resourceId,
              user: req.user._id
            });
            
            if (result) {
              io.to(`user_${req.user._id}`).emit('expense_deleted', { id: operation.resourceId });
            }
            break;
        }
        
        results.push({
          resourceId: operation.resourceId,
          success: true,
          data: result
        });
        
      } catch (opError) {
        results.push({
          resourceId: operation.resourceId,
          success: false,
          error: opError.message
        });
      }
    }

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET sync status
router.get('/status', auth, async (req, res) => {
  try {
    const lastSync = await SyncQueue.findOne({ 
      user: req.user._id 
    }).sort({ createdAt: -1 });
    
    const pendingCount = await SyncQueue.countDocuments({
      user: req.user._id,
      processed: false
    });

    res.json({
      lastSync: lastSync?.createdAt || null,
      pendingOperations: pendingCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;