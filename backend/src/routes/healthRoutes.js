const express = require('express');
const router = express.Router();

// Health check endpoint for UptimeRobot
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Ping endpoint (alternative)
router.get('/ping', (req, res) => {
  res.status(200).send('pong');
});

module.exports = router;
