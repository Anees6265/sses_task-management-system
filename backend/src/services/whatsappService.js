const axios = require('axios');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;

// Clean up TWILIO_WHATSAPP_NUMBER in case .env has trailing comments
const getTwilioFromNumber = () => {
  const raw = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  const clean = raw.split('#')[0].split(' ')[0].trim();
  return clean.startsWith('whatsapp:') ? clean : `whatsapp:${clean}`;
};

/**
 * Format phone number for Twilio WhatsApp recipient
 */
const formatWhatsAppNumber = (phone) => {
  if (!phone) return null;
  let cleaned = String(phone).trim().replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) {
      cleaned = '+91' + cleaned;
    } else {
      cleaned = '+' + cleaned;
    }
  }
  return `whatsapp:${cleaned}`;
};

/**
 * Low-level text sender via Twilio WhatsApp API
 */
const sendWhatsAppText = async (recipientNumber, messageText) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.log('⚠️ WhatsApp service skipped: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing in .env');
    return false;
  }

  const formattedTo = formatWhatsAppNumber(recipientNumber);
  if (!formattedTo) {
    console.log('⚠️ WhatsApp service skipped: Recipient phone number missing or invalid:', recipientNumber);
    return false;
  }

  const fromNumber = getTwilioFromNumber();

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const response = await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        From: fromNumber,
        To: formattedTo,
        Body: messageText
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log(`✅ WhatsApp message sent successfully to ${formattedTo} (SID: ${response.data.sid})`);
    return true;
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ WhatsApp API send failed for ${recipientNumber}:`, errorDetails);
    return false;
  }
};

/**
 * Notification sent to HOD or Admin when leave is requested
 */
const sendLeaveNotificationToReviewer = async ({
  reviewerPhone,
  reviewerName,
  applicantName,
  applicantRole,
  department,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reason
}) => {
  const roleLabel = applicantRole === 'hod' ? 'HOD' : 'Faculty';
  const startStr = new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const endStr = new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const message = 
`📋 *New Leave Request Notification*

Hello *${reviewerName || 'Reviewer'}*,

A new leave request has been submitted that requires your approval:

👤 *Applicant:* ${applicantName} (${roleLabel})
🏢 *Department:* ${department || 'General'}
🌴 *Leave Type:* ${(leaveType || 'casual').toUpperCase()}
📅 *Duration:* ${startStr} - ${endStr} (${totalDays} day${totalDays > 1 ? 's' : ''})
📝 *Reason:* ${reason}

⚡ Please log in to your SSES portal to review and take action.`;

  return await sendWhatsAppText(reviewerPhone, message);
};

/**
 * Notification sent to applicant when leave request is Approved or Rejected
 */
const sendLeaveStatusNotificationToApplicant = async ({
  applicantPhone,
  applicantName,
  status,
  reviewerName,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reviewComment
}) => {
  const statusEmoji = status === 'approved' ? '✅' : '❌';
  const statusText = status.toUpperCase();
  const startStr = new Date(startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const endStr = new Date(endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const message = 
`📢 *Leave Request Status Update*

Hello *${applicantName || 'Faculty'}*,

Your leave request status has been updated:

📌 *Status:* ${statusText} ${statusEmoji}
🌴 *Leave Type:* ${(leaveType || 'casual').toUpperCase()}
📅 *Duration:* ${startStr} - ${endStr} (${totalDays} day${totalDays > 1 ? 's' : ''})
👤 *Reviewed By:* ${reviewerName || 'Authority'}
${reviewComment ? `💬 *Remarks:* ${reviewComment}\n` : ''}
Thank you!`;

  return await sendWhatsAppText(applicantPhone, message);
};

/**
 * Task notification (Legacy helper preserved for backward compatibility)
 */
const sendWhatsAppMessage = async (recipientNumber, taskTitle, taskDescription, priority, dueDate) => {
  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
  const dueDateText = dueDate ? `\n📅 Due: ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
  
  const message = `📋 *New Task Assigned*\n\n*${taskTitle}*\n\n${taskDescription || ''}\n\n${priorityEmoji} Priority: ${(priority || 'medium').toUpperCase()}${dueDateText}\n\n✅ Please check your dashboard for details.`;

  return await sendWhatsAppText(recipientNumber, message);
};

module.exports = { 
  sendWhatsAppText,
  sendLeaveNotificationToReviewer,
  sendLeaveStatusNotificationToApplicant,
  sendWhatsAppMessage,
  formatWhatsAppNumber
};
