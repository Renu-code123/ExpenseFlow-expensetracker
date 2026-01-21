const express = require('express');
const router = express.Router();

// Placeholder route for currency
router.get('/', (req, res) => {
  res.json({ message: 'Currency endpoint not implemented yet' });
});

module.exports = router;
