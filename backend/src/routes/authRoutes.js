const express = require('express');
const router = express.Router();
const { register, login, getMe } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Handle OPTIONS preflight requests
router.options('/register', (req, res) => res.sendStatus(200));
router.options('/login', (req, res) => res.sendStatus(200));
router.options('/me', (req, res) => res.sendStatus(200));

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);

module.exports = router;
