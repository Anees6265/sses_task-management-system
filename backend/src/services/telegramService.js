const axios = require('axios');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const sendTelegramMessage = async (chatId, taskTitle, taskDescription, priority, dueDate) => {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.log('Telegram not configured or chat ID missing');
    return;
  }

  const priorityEmoji = priority === 'high' ? '🔴' : priority === 'medium' ? '🟡' : '🟢';
  const dueDateText = dueDate ? `\n📅 *Due:* ${new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : '';
  
  const message = `📋 *New Task Assigned*\n\n*${taskTitle}*\n\n${taskDescription || ''}\n\n${priorityEmoji} *Priority:* ${priority.toUpperCase()}${dueDateText}\n\n✅ Please check your dashboard for details.`;

  try {
    await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    });
    console.log(`Telegram message sent to ${chatId}`);
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
  }
};

module.exports = { sendTelegramMessage };