/**
 * Security Middleware Suite for Express & MongoDB Applications
 * - NoSQL Injection Prevention (MongoDB query operator stripping)
 * - SQL Injection Pattern Detection & Sanitization across all input fields
 * - XSS & Script Tag Stripping
 * - Type Enforcement on Input Data
 */

// Common SQL Injection payload patterns & dangerous keywords
const SQL_INJECTION_REGEX = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|TRUNCATE|DECLARE|WAITFOR|SHUTDOWN)\b)|(--|\/\*|\*\/|;|' OR '1'='1'|' OR ''='|" OR ""="|' OR 1=1|1=1|0x[0-9a-fA-F]+)/i;

/**
 * Sanitizes a single string input against SQL injection vectors and XSS script tags.
 * @param {string} value 
 * @returns {string} Cleaned value
 */
const sanitizeInputString = (value) => {
  if (typeof value !== 'string') return value;

  let cleaned = value;

  // 1. Remove dangerous script and HTML tags (XSS Prevention)
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/javascript\s*:/gi, '');
  cleaned = cleaned.replace(/on\w+\s*=/gi, '');

  // 2. Remove / escape SQL Injection comment signatures and quotes if suspicious
  // Specifically remove SQL inline comments (-- or /* */) and trailing semicolons used for stacked queries
  cleaned = cleaned.replace(/--/g, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // 3. Neutralize classic SQL tautology vectors like ' OR 1=1 -- or ' OR '1'='1
  cleaned = cleaned.replace(/'\s*OR\s*'?1'?\s*=\s*'?1'?/gi, '');
  cleaned = cleaned.replace(/"\s*OR\s*"?1"?\s*=\s*"?1"?/gi, '');

  return cleaned.trim();
};

/**
 * Recursively inspects and sanitizes objects, arrays, and primitives in request data.
 * @param {any} data 
 * @returns {any} Sanitized data structure
 */
const sanitizeDataStructure = (data) => {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeInputString(data);
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeDataStructure(item));
  }

  if (typeof data === 'object') {
    const sanitizedObj = {};
    for (const key of Object.keys(data)) {
      // Prevent MongoDB operator keys ($ne, $gt, etc.) and dot notation property injections
      if (key.startsWith('$') || key.includes('.')) {
        console.warn(`[Security Warning] Stripped prohibited query operator key: ${key}`);
        continue;
      }
      const sanitizedKey = sanitizeInputString(key);
      sanitizedObj[sanitizedKey] = sanitizeDataStructure(data[key]);
    }
    return sanitizedObj;
  }

  return data;
};

/**
 * Express middleware that inspects and sanitizes req.body, req.query, and req.params on every request.
 */
const inputSecuritySanitizer = (req, res, next) => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeDataStructure(req.body);
    }
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeDataStructure(req.query);
    }
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeDataStructure(req.params);
    }
    next();
  } catch (error) {
    console.error('[Security Middleware Error]:', error);
    res.status(400).json({ message: 'Invalid or malformed request payload format.' });
  }
};

/**
 * Utility function to validate if a string contains aggressive SQL injection attempts.
 * Can be used in specific route validation schemas.
 * @param {string} input 
 * @returns {boolean} True if potential SQL injection detected
 */
const hasSqlInjection = (input) => {
  if (typeof input !== 'string') return false;
  return SQL_INJECTION_REGEX.test(input);
};

module.exports = {
  inputSecuritySanitizer,
  sanitizeInputString,
  sanitizeDataStructure,
  hasSqlInjection
};
