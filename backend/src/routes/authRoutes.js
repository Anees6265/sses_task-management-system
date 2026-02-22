const express = require('express');
const router = express.Router();
const { register, login, getMe, sendOTP, verifyOTP } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Handle OPTIONS preflight requests
router.options('/register', (req, res) => res.sendStatus(200));
router.options('/login', (req, res) => res.sendStatus(200));
router.options('/me', (req, res) => res.sendStatus(200));
router.options('/send-otp', (req, res) => res.sendStatus(200));
router.options('/verify-otp', (req, res) => res.sendStatus(200));

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.get('/me', protect, getMe);

module.exports = router;
