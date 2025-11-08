/**
 * Security Configuration
 * Contains security policies and whitelists for the application
 */

/**
 * Domain whitelist for auto-organization creation
 * Add domains that are allowed to automatically create organizations
 * Empty array means all domains are allowed (default behavior)
 */
const ALLOWED_DOMAINS = [
  // Example domains (remove in production and add your allowed domains)
  // 'company.com',
  // 'trusted-partner.com',
  // 'university.edu'
];

/**
 * Blocked domains that should never be allowed
 * These are common public email providers and suspicious domains
 */
const BLOCKED_DOMAINS = [
  // Temporary/disposable email providers
  '10minutemail.com',
  'tempmail.org',
  'guerrillamail.com',
  'mailinator.com',
  'trash-mail.com',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'maildrop.cc',
  
  // Common public email providers (optional - remove if you want to allow them)
  // 'gmail.com',
  // 'yahoo.com',
  // 'hotmail.com',
  // 'outlook.com',
  
  // Suspicious/test domains
  'test.com',
  'example.com',
  'example.org',
  'localhost'
];

/**
 * Trusted domains that bypass additional security checks
 */
const TRUSTED_DOMAINS = [
  // Add domains that you fully trust and want to bypass some security checks
];

/**
 * Maximum number of organizations that can be created per IP per day
 */
const MAX_ORG_CREATION_PER_IP_PER_DAY = 3;

/**
 * Maximum number of organizations that can be created per domain per day
 */
const MAX_ORG_CREATION_PER_DOMAIN_PER_DAY = 5;

class SecurityConfig {
  /**
   * Check if a domain is allowed for auto-organization creation
   * @param {string} domain - Domain to check
   * @returns {Object} - Validation result
   */
  static validateDomain(domain) {
    const lowerDomain = domain.toLowerCase().trim();
    
    // Check if domain is blocked
    if (BLOCKED_DOMAINS.includes(lowerDomain)) {
      return {
        allowed: false,
        reason: 'Domain is not allowed for organization creation',
        severity: 'medium'
      };
    }
    
    // If whitelist is configured, check if domain is whitelisted
    if (ALLOWED_DOMAINS.length > 0 && !ALLOWED_DOMAINS.includes(lowerDomain)) {
      return {
        allowed: false,
        reason: 'Domain is not in the allowed domains list',
        severity: 'low'
      };
    }
    
    // Additional validation for suspicious patterns
    if (this.hasSuspiciousDomainPattern(lowerDomain)) {
      return {
        allowed: false,
        reason: 'Domain contains suspicious patterns',
        severity: 'high'
      };
    }
    
    return {
      allowed: true,
      trusted: TRUSTED_DOMAINS.includes(lowerDomain)
    };
  }
  
  /**
   * Check for suspicious domain patterns
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if suspicious patterns found
   */
  static hasSuspiciousDomainPattern(domain) {
    const suspiciousPatterns = [
      /^\d+\.\d+\.\d+\.\d+$/, // IP addresses
      /.*\.tk$|.*\.ml$|.*\.ga$|.*\.cf$/, // Free TLD providers
      /.*\d{3,}.*/, // Domains with many consecutive numbers
      /.*temp.*|.*test.*|.*fake.*|.*spam.*/, // Obvious temp/test domains
      /^[a-z]{1,3}\d+\./, // Short prefix with numbers (e.g., abc123.com)
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(domain));
  }
  
  /**
   * Get organization creation limits
   * @returns {Object} - Limit configuration
   */
  static getOrgCreationLimits() {
    return {
      maxPerIPPerDay: MAX_ORG_CREATION_PER_IP_PER_DAY,
      maxPerDomainPerDay: MAX_ORG_CREATION_PER_DOMAIN_PER_DAY
    };
  }
  
  /**
   * Check if domain requires additional verification
   * @param {string} domain - Domain to check
   * @returns {boolean} - True if additional verification required
   */
  static requiresAdditionalVerification(domain) {
    const validation = this.validateDomain(domain);
    return !validation.allowed || !validation.trusted;
  }
}

module.exports = {
  SecurityConfig,
  ALLOWED_DOMAINS,
  BLOCKED_DOMAINS,
  TRUSTED_DOMAINS
};