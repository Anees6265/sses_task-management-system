/**
 * Input validation utilities for SSES Portal
 * Enforces:
 * - Email ending with @ssism.org
 * - Mobile number with +91 country code and 10 digits
 * - Password between 8 and 18 characters
 * - Name minimum 2 characters
 */

export const validateEmail = (email) => {
  if (!email || !email.trim()) {
    return { isValid: false, error: 'Email address is required' };
  }
  const cleanEmail = email.trim().toLowerCase();
  
  if (!cleanEmail.endsWith('@ssism.org')) {
    return { isValid: false, error: 'Email must end with @ssism.org domain (e.g. name@ssism.org)' };
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@ssism\.org$/i;
  if (!emailRegex.test(cleanEmail)) {
    return { isValid: false, error: 'Please enter a valid @ssism.org email address' };
  }

  return { isValid: true, error: '' };
};

export const validatePhoneNumber = (phone, isRequired = false) => {
  if (!phone || !phone.trim()) {
    if (isRequired) {
      return { isValid: false, error: 'Mobile number is required', formatted: '' };
    }
    return { isValid: true, error: '', formatted: '' };
  }

  const trimmed = phone.trim();
  const cleaned = trimmed.replace(/[\s-]/g, '');

  if (!cleaned.startsWith('+91')) {
    return {
      isValid: false,
      error: 'Mobile number must include +91 country code (e.g. +91 9876543210)',
      formatted: trimmed
    };
  }

  const digitsAfterCode = cleaned.slice(3);
  if (!/^\d+$/.test(digitsAfterCode)) {
    return {
      isValid: false,
      error: 'Mobile number can only contain digits after +91',
      formatted: trimmed
    };
  }

  if (digitsAfterCode.length !== 10) {
    return {
      isValid: false,
      error: `Mobile number must have exactly 10 digits after +91 (currently ${digitsAfterCode.length})`,
      formatted: trimmed
    };
  }

  const formatted = `+91 ${digitsAfterCode}`;
  return { isValid: true, error: '', formatted };
};

export const formatPhoneInput = (val) => {
  if (!val) return '';
  const trimmed = val.trim();
  if (trimmed === '' || trimmed === '+' || trimmed === '+9' || trimmed === '+91') {
    return val;
  }

  let digits = val.replace(/\D/g, '');
  if (digits.startsWith('91')) {
    digits = digits.slice(2);
  }
  const localDigits = digits.slice(0, 10);
  return localDigits ? `+91 ${localDigits}` : '+91 ';
};

export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  if (password.length < 8) {
    return { isValid: false, error: `Password must be at least 8 characters (currently ${password.length})` };
  }
  if (password.length > 18) {
    return { isValid: false, error: `Password cannot exceed 18 characters (currently ${password.length})` };
  }
  return { isValid: true, error: '' };
};

export const validateName = (name) => {
  if (!name || !name.trim()) {
    return { isValid: false, error: 'Full name is required' };
  }
  if (name.trim().length < 2) {
    return { isValid: false, error: 'Name must be at least 2 characters long' };
  }
  return { isValid: true, error: '' };
};
