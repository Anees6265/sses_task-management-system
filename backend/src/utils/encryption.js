const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

const getKey = () => {
  const secret = process.env.ENCRYPTION_KEY || 'default_sses_task_management_encryption_key_2026';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const encrypt = (text) => {
  if (!text) return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  } catch (err) {
    console.error('Encryption error:', err);
    return text;
  }
};

const decrypt = (text) => {
  if (!text) return '';
  if (typeof text !== 'string') return text;
  
  // If text is not an encrypted pattern (32-char IV hex + colon + payload hex), return text as is
  const isEncryptedFormat = /^[a-fA-F0-9]{32}:[a-fA-F0-9]+$/.test(text);
  if (!isEncryptedFormat) {
    return text;
  }

  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err.message);
    return text;
  }
};

module.exports = { encrypt, decrypt };
