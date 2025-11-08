const jwt = require('jsonwebtoken');

/**
 * Token Blacklist Service
 * Manages blacklisted JWT tokens to prevent reuse after logout or security events
 * Uses in-memory storage with automatic cleanup of expired tokens
 */
class TokenBlacklistService {
  constructor() {
    this.blacklistedTokens = new Map(); // token -> expiration timestamp
    this.cleanupInterval = null;
    this.startCleanupScheduler();
  }

  /**
   * Add a token to the blacklist
   * @param {string} token - JWT token to blacklist
   */
  blacklistToken(token) {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        // Store token with its expiration time
        const expirationTime = decoded.exp * 1000; // Convert to milliseconds
        this.blacklistedTokens.set(token, expirationTime);
        console.log(`🚫 Token blacklisted, expires at: ${new Date(expirationTime).toISOString()}`);
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }

  /**
   * Check if a token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} - True if token is blacklisted
   */
  isTokenBlacklisted(token) {
    if (!token) return false;
    
    const expirationTime = this.blacklistedTokens.get(token);
    if (!expirationTime) return false;
    
    // Check if blacklisted token has expired (can be removed)
    if (Date.now() > expirationTime) {
      this.blacklistedTokens.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * Blacklist all tokens for a specific user (security event)
   * @param {string} userId - User ID to blacklist tokens for
   * @param {Date} beforeTime - Blacklist tokens issued before this time
   */
  blacklistUserTokens(userId, beforeTime = new Date()) {
    let count = 0;
    const beforeTimestamp = Math.floor(beforeTime.getTime() / 1000);
    
    // This is a simplified approach - in a real system, you'd want to track
    // active sessions or use a more sophisticated approach
    console.log(`🚫 Blacklisting tokens for user ${userId} issued before ${beforeTime.toISOString()}`);
    
    // For now, we'll rely on token expiration and individual blacklisting
    // A more robust solution would maintain a user -> latest valid token timestamp mapping
    this.userSecurityEvents = this.userSecurityEvents || new Map();
    this.userSecurityEvents.set(userId, beforeTimestamp);
    
    return count;
  }

  /**
   * Check if a user's token was issued before a security event
   * @param {string} userId - User ID
   * @param {number} tokenIssuedAt - Token 'iat' (issued at) timestamp
   * @returns {boolean} - True if token should be considered invalid
   */
  isUserTokenInvalidated(userId, tokenIssuedAt) {
    if (!this.userSecurityEvents) return false;
    
    const securityEventTime = this.userSecurityEvents.get(userId);
    if (!securityEventTime) return false;
    
    return tokenIssuedAt < securityEventTime;
  }

  /**
   * Clean up expired blacklisted tokens
   */
  cleanupExpiredTokens() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, expirationTime] of this.blacklistedTokens.entries()) {
      if (now > expirationTime) {
        this.blacklistedTokens.delete(token);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired blacklisted tokens`);
    }
    
    return cleanedCount;
  }

  /**
   * Start automatic cleanup of expired tokens
   */
  startCleanupScheduler() {
    // Clean up every 15 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredTokens();
    }, 15 * 60 * 1000);
    
    console.log('🕒 Token blacklist cleanup scheduler started');
  }

  /**
   * Stop the cleanup scheduler
   */
  stopCleanupScheduler() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🛑 Token blacklist cleanup scheduler stopped');
    }
  }

  /**
   * Get statistics about the blacklist
   * @returns {Object} - Blacklist statistics
   */
  getStats() {
    return {
      blacklistedTokensCount: this.blacklistedTokens.size,
      userSecurityEventsCount: this.userSecurityEvents ? this.userSecurityEvents.size : 0,
      memoryUsageKB: Math.round(JSON.stringify([...this.blacklistedTokens.entries()]).length / 1024)
    };
  }

  /**
   * Clear all blacklisted tokens (for testing or maintenance)
   */
  clearAll() {
    this.blacklistedTokens.clear();
    if (this.userSecurityEvents) {
      this.userSecurityEvents.clear();
    }
    console.log('🧽 All blacklisted tokens cleared');
  }
}

// Export singleton instance
module.exports = new TokenBlacklistService();