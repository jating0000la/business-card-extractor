const sanitizeHtml = require('sanitize-html');
const validator = require('validator');
const { body, param, query } = require('express-validator');

/**
 * Enhanced Input Validation and Sanitization Service
 * Provides comprehensive security measures for user inputs
 */
class ValidationService {
  constructor() {
    // HTML sanitization options
    this.sanitizeOptions = {
      allowedTags: [], // No HTML tags allowed by default
      allowedAttributes: {},
      allowedIframeHostnames: []
    };

    // Relaxed sanitization for descriptions/comments
    this.relaxedSanitizeOptions = {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br'],
      allowedAttributes: {},
      allowedIframeHostnames: []
    };
  }

  /**
   * Sanitize string input to prevent XSS
   * @param {string} input - Input string to sanitize
   * @param {boolean} allowBasicHtml - Allow basic HTML tags
   * @returns {string} - Sanitized string
   */
  sanitizeString(input, allowBasicHtml = false) {
    if (!input || typeof input !== 'string') return '';
    
    const options = allowBasicHtml ? this.relaxedSanitizeOptions : this.sanitizeOptions;
    return sanitizeHtml(input.trim(), options);
  }

  /**
   * Validate and sanitize email address
   * @param {string} email - Email to validate
   * @returns {string|null} - Sanitized email or null if invalid
   */
  sanitizeEmail(email) {
    if (!email || typeof email !== 'string') return null;
    
    const normalizedEmail = validator.normalizeEmail(email);
    if (!normalizedEmail || !validator.isEmail(normalizedEmail)) {
      return null;
    }
    
    return normalizedEmail;
  }

  /**
   * Validate and sanitize URL
   * @param {string} url - URL to validate
   * @param {Array} allowedProtocols - Allowed protocols (default: ['http', 'https'])
   * @returns {string|null} - Sanitized URL or null if invalid
   */
  sanitizeUrl(url, allowedProtocols = ['http', 'https']) {
    if (!url || typeof url !== 'string') return null;
    
    const trimmedUrl = url.trim();
    if (!validator.isURL(trimmedUrl, { protocols: allowedProtocols, require_protocol: true })) {
      return null;
    }
    
    return trimmedUrl;
  }

  /**
   * Validate domain name
   * @param {string} domain - Domain to validate
   * @returns {string|null} - Sanitized domain or null if invalid
   */
  sanitizeDomain(domain) {
    if (!domain || typeof domain !== 'string') return null;
    
    const lowerDomain = domain.toLowerCase().trim();
    if (!validator.isFQDN(lowerDomain)) {
      return null;
    }
    
    return lowerDomain;
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @param {number} minLength - Minimum length (default: 10)
   * @param {number} maxLength - Maximum length (default: 200)
   * @returns {boolean} - True if valid
   */
  isValidApiKey(apiKey, minLength = 10, maxLength = 200) {
    if (!apiKey || typeof apiKey !== 'string') return false;
    
    const trimmed = apiKey.trim();
    return trimmed.length >= minLength && 
           trimmed.length <= maxLength && 
           /^[a-zA-Z0-9\-_\.]+$/.test(trimmed);
  }

  /**
   * Sanitize object properties recursively
   * @param {Object} obj - Object to sanitize
   * @param {Array} allowHtmlFields - Fields that can contain basic HTML
   * @returns {Object} - Sanitized object
   */
  sanitizeObject(obj, allowHtmlFields = []) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        const allowHtml = allowHtmlFields.includes(key);
        sanitized[key] = this.sanitizeString(value, allowHtml);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value, allowHtmlFields);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  /**
   * Validate JWT token format (basic check)
   * @param {string} token - JWT token to validate
   * @returns {boolean} - True if format is valid
   */
  isValidJwtFormat(token) {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    return parts.length === 3 && parts.every(part => part.length > 0);
  }

  /**
   * Check if string contains potential injection patterns
   * @param {string} input - Input to check
   * @returns {boolean} - True if suspicious patterns found
   */
  hasSuspiciousPatterns(input) {
    if (!input || typeof input !== 'string') return false;
    
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /'.*OR.*'/i,
      /".*OR.*"/i,
      /UNION.*SELECT/i,
      /DROP.*TABLE/i,
      /<iframe/i,
      /<object/i,
      /<embed/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(input));
  }
}

/**
 * Express-validator middleware creators
 */
const createValidators = () => {
  const validationService = new ValidationService();

  return {
    // Email validation
    validateEmail: (fieldName = 'email') => 
      body(fieldName)
        .trim()
        .isEmail()
        .normalizeEmail()
        .withMessage(`Valid ${fieldName} is required`)
        .customSanitizer(value => validationService.sanitizeEmail(value)),

    // URL validation
    validateUrl: (fieldName = 'url') => 
      body(fieldName)
        .trim()
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage(`Valid HTTPS/HTTP URL is required for ${fieldName}`)
        .customSanitizer(value => validationService.sanitizeUrl(value)),

    // API key validation
    validateApiKey: (fieldName = 'apiKey', minLength = 10) => 
      body(fieldName)
        .trim()
        .isLength({ min: minLength, max: 200 })
        .matches(/^[a-zA-Z0-9\-_\.]+$/)
        .withMessage(`${fieldName} must be ${minLength}-200 characters with only alphanumeric, dash, underscore, and dot characters`)
        .custom(value => {
          if (!validationService.isValidApiKey(value, minLength)) {
            throw new Error(`Invalid ${fieldName} format`);
          }
          return true;
        }),

    // Safe string validation (no HTML)
    validateSafeString: (fieldName, minLength = 1, maxLength = 255) => 
      body(fieldName)
        .trim()
        .isLength({ min: minLength, max: maxLength })
        .withMessage(`${fieldName} must be ${minLength}-${maxLength} characters`)
        .customSanitizer(value => validationService.sanitizeString(value))
        .custom(value => {
          if (validationService.hasSuspiciousPatterns(value)) {
            throw new Error(`${fieldName} contains invalid characters`);
          }
          return true;
        }),

    // Domain validation
    validateDomain: (fieldName = 'domain') => 
      body(fieldName)
        .trim()
        .toLowerCase()
        .isFQDN()
        .withMessage(`Valid domain name is required for ${fieldName}`)
        .customSanitizer(value => validationService.sanitizeDomain(value)),

    // Numeric validation
    validateNumber: (fieldName, min = 0, max = Number.MAX_SAFE_INTEGER) => 
      body(fieldName)
        .isInt({ min, max })
        .withMessage(`${fieldName} must be a number between ${min} and ${max}`)
        .toInt(),

    // Boolean validation
    validateBoolean: (fieldName) => 
      body(fieldName)
        .isBoolean()
        .withMessage(`${fieldName} must be true or false`)
        .toBoolean(),

    // Object ID validation
    validateObjectId: (fieldName) => 
      param(fieldName)
        .isMongoId()
        .withMessage(`Valid ${fieldName} ID is required`),

    // Custom sanitization middleware
    sanitizeBody: (allowHtmlFields = []) => (req, res, next) => {
      if (req.body && typeof req.body === 'object') {
        req.body = validationService.sanitizeObject(req.body, allowHtmlFields);
      }
      next();
    }
  };
};

module.exports = {
  ValidationService,
  createValidators: createValidators()
};