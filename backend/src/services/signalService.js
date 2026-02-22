const axios = require('axios');

const SIGNAL_API_URL = process.env.SIGNAL_API_URL || 'http://localhost:8080';
const SIGNAL_NUMBER = process.env.SIGNAL_NUMBER;

const sendSignalMessage = async (recipientNumber, taskTitle, taskDescription, priority, dueDate) => {
  if (!SIGNAL_NUMBER || !recipientNumber) {
    console.log('Signal not configured or recipient number missing');
    return;
  }

  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
  const dueDateText = dueDate ? `\n📅 Due: ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
  
  const message = `📋 *New Task Assigned*\n\n*${taskTitle}*\n\n${taskDescription || ''}\n\n${priorityEmoji} Priority: ${priority.toUpperCase()}${dueDateText}\n\n✅ Please check your dashboard for details.`;

  try {
    await axios.post(`${SIGNAL_API_URL}/v2/send`, {
      number: SIGNAL_NUMBER,
      recipients: [recipientNumber],
      message: message
    });
    console.log(`Signal message sent to ${recipientNumber}`);
  } catch (error) {
    console.error('Error sending Signal message:', error.message);
  }
};

module.exports = { sendSignalMessage };
