const axios = require('axios');

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

const sendWhatsAppMessage = async (recipientNumber, taskTitle, taskDescription, priority, dueDate) => {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !recipientNumber) {
    console.log('WhatsApp not configured or recipient number missing');
    return;
  }

  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
  const dueDateText = dueDate ? `\n📅 Due: ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
  
  const message = `📋 *New Task Assigned*\n\n*${taskTitle}*\n\n${taskDescription || ''}\n\n${priorityEmoji} Priority: ${priority.toUpperCase()}${dueDateText}\n\n✅ Please check your dashboard for details.`;

  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    
    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      new URLSearchParams({
        From: TWILIO_WHATSAPP_NUMBER,
        To: `whatsapp:${recipientNumber}`,
        Body: message
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    console.log(`WhatsApp message sent to ${recipientNumber}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error.message);
  }
};

module.exports = { sendWhatsAppMessage };
