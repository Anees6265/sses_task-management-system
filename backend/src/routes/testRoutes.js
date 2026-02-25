const express = require('express');
const router = express.Router();
const { sendOTPEmail, sendTaskAssignmentEmail } = require('../services/emailService');

// Test OTP email
router.post('/test-otp-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    console.log('🧪 Testing OTP email to:', email);
    
    const testOTP = '123456';
    await sendOTPEmail(email, name || 'Test User', testOTP);
    
    console.log('✅ Test OTP email sent successfully');
    res.json({ 
      success: true, 
      message: 'Test OTP email sent successfully',
      otp: testOTP 
    });
  } catch (error) {
    console.error('❌ Test OTP email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message 
    });
  }
});

// Test task assignment email
router.post('/test-task-email', async (req, res) => {
  try {
    const { email, name } = req.body;
    console.log('🧪 Testing task email to:', email);
    
    await sendTaskAssignmentEmail(
      email,
      name || 'Test User',
      'Test Task from Mobile',
      'This is a test task notification',
      'high',
      new Date()
    );
    
    console.log('✅ Test task email sent successfully');
    res.json({ 
      success: true, 
      message: 'Test task email sent successfully' 
    });
  } catch (error) {
    console.error('❌ Test task email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message 
    });
  }
});

// Check email configuration
router.get('/email-config', (req, res) => {
  res.json({
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    emailUser: process.env.EMAIL_USER ? process.env.EMAIL_USER.substring(0, 3) + '***' : 'Not set',
    emailPassSet: !!process.env.EMAIL_PASS
  });
});

module.exports = router;
