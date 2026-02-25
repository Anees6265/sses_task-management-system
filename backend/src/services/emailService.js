const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000
});

const sendOTPEmail = async (userEmail, userName, otp) => {
  const mailOptions = {
    from: `"SSES Task Manager" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Your Login OTP - SSES Task Manager',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
        <div style="background: linear-gradient(to right, #f97316, #f59e0b); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Login OTP</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi <strong>${userName}</strong>,</p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">Your OTP for login is:</p>
          
          <div style="background: #fef3c7; border: 2px solid #f59e0b; padding: 20px; margin-bottom: 25px; border-radius: 8px; text-align: center;">
            <h2 style="color: #92400e; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: bold;">${otp}</h2>
          </div>
          
          <p style="font-size: 14px; color: #ef4444; margin-bottom: 20px; font-weight: 600;">⏰ This OTP will expire in 10 minutes</p>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 25px;">If you didn't request this OTP, please ignore this email.</p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            This is an automated message from Sant Singaji Educational Society Task Management System
          </p>
        </div>
      </div>
    `
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials not configured');
      throw new Error('Email service not configured');
    }
    
    console.log('📧 Attempting to send OTP email to:', userEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ OTP email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending OTP email:', error.message);
    console.error('Full error:', error);
    throw error;
  }
};

const sendTaskAssignmentEmail = async (userEmail, userName, taskTitle, taskDescription, priority, dueDate) => {
  const mailOptions = {
    from: `"SSES Task Manager" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `New Task Assigned: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb; border-radius: 10px;">
        <div style="background: linear-gradient(to right, #f97316, #f59e0b); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">📋 New Task Assigned</h1>
        </div>
        
        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">Hi <strong>${userName}</strong>,</p>
          
          <p style="font-size: 16px; color: #374151; margin-bottom: 25px;">You have been assigned a new task:</p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin-bottom: 25px; border-radius: 5px;">
            <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px;">${taskTitle}</h2>
            ${taskDescription ? `<p style="color: #78350f; margin: 0; font-size: 14px; line-height: 1.6;">${taskDescription}</p>` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">
                  <strong>Priority:</strong>
                </td>
                <td style="padding: 10px 0; text-align: right;">
                  <span style="background: ${priority === 'high' ? '#fee2e2' : priority === 'medium' ? '#fef3c7' : '#d1fae5'}; 
                              color: ${priority === 'high' ? '#991b1b' : priority === 'medium' ? '#92400e' : '#065f46'}; 
                              padding: 5px 15px; border-radius: 20px; font-size: 13px; font-weight: bold;">
                    ${priority === 'high' ? '🔴 High' : priority === 'medium' ? '🟡 Medium' : '🟢 Low'}
                  </span>
                </td>
              </tr>
              ${dueDate ? `
              <tr>
                <td style="padding: 10px 0; color: #6b7280; font-size: 14px;">
                  <strong>Due Date:</strong>
                </td>
                <td style="padding: 10px 0; text-align: right; color: #374151; font-size: 14px; font-weight: 600;">
                  📅 ${new Date(dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </td>
              </tr>
              ` : ''}
            </table>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 25px;">Please log in to your dashboard to view and manage this task.</p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
               style="background: linear-gradient(to right, #f97316, #f59e0b); 
                      color: white; 
                      padding: 14px 35px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: bold; 
                      font-size: 15px;
                      display: inline-block;
                      box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              View Task Dashboard
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
            This is an automated message from Sant Singaji Educational Society Task Management System
          </p>
        </div>
      </div>
    `
  };

  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ Email credentials not configured');
      return;
    }
    console.log('📧 Attempting to send task assignment email to:', userEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Task assignment email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('❌ Error sending task assignment email:', error.message);
    console.error('Full error:', error);
  }
};

module.exports = { sendTaskAssignmentEmail, sendOTPEmail };
