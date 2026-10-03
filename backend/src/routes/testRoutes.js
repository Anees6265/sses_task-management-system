const express = require('express');
const router = express.Router();
const { sendOTPEmail, sendTaskAssignmentEmail } = require('../services/emailService');
const { sendLeaveNotificationToReviewer, sendWhatsAppText } = require('../services/whatsappService');

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

// Test WhatsApp notification
router.post('/test-whatsapp', async (req, res) => {
  try {
    const { recipientNumber, message } = req.body;
    if (!recipientNumber) {
      return res.status(400).json({ success: false, message: 'recipientNumber is required' });
    }
    
    console.log('🧪 Testing WhatsApp to:', recipientNumber);
    const sent = await sendWhatsAppText(recipientNumber, message || 'Hello! This is a test WhatsApp notification from SSES Task Management System.');
    
    if (sent) {
      return res.json({ success: true, message: 'WhatsApp message sent successfully' });
    } else {
      return res.status(500).json({ success: false, message: 'Failed to send WhatsApp message. Check console logs and credentials.' });
    }
  } catch (error) {
    console.error('❌ Test WhatsApp failed:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Check email and twilio configuration
router.get('/config-status', (req, res) => {
  res.json({
    emailConfigured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS),
    twilioConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER),
    twilioWhatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || 'Not set'
  });
});

module.exports = router;
