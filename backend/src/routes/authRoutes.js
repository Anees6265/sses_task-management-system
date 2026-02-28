const express = require('express');
const router = express.Router();
const { register, login, getMe, sendOTP, verifyOTP, refreshToken, logout } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.options('/register', (req, res) => res.sendStatus(200));
router.options('/login', (req, res) => res.sendStatus(200));
router.options('/me', (req, res) => res.sendStatus(200));
router.options('/send-otp', (req, res) => res.sendStatus(200));
router.options('/verify-otp', (req, res) => res.sendStatus(200));
router.options('/refresh-token', (req, res) => res.sendStatus(200));
router.options('/logout', (req, res) => res.sendStatus(200));

router.post('/register', register);
router.post('/login', login);
router.post('/send-otp', sendOTP);
router.post('/verify-otp', verifyOTP);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
