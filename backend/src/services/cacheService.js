const NodeCache = require('node-cache');
const PerformanceMonitor = require('./performanceMonitor');

class CacheService {
  constructor() {
    // Create cache instances with different TTL for different data types
    this.shortCache = new NodeCache({ 
      stdTTL: 300, // 5 minutes
      checkperiod: 60, // Check for expired keys every minute
      useClones: false // Better performance
    });
    
    this.mediumCache = new NodeCache({ 
      stdTTL: 1800, // 30 minutes
      checkperiod: 120,
      useClones: false
    });
    
    this.longCache = new NodeCache({ 
      stdTTL: 3600, // 1 hour
      checkperiod: 300,
      useClones: false
    });
  }

  // Generate cache key based on user/org and query params
  generateKey(prefix, organizationId, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});
    
    return `${prefix}:${organizationId}:${JSON.stringify(sortedParams)}`;
  }

  // Cards cache (short-lived as data changes frequently)
  getCards(organizationId, params) {
    const key = this.generateKey('cards', organizationId, params);
    const result = this.shortCache.get(key);
    
    if (result) {
      PerformanceMonitor.trackCacheHit();
    } else {
      PerformanceMonitor.trackCacheMiss();
    }
    
    return result;
  }

  setCards(organizationId, params, data) {
    const key = this.generateKey('cards', organizationId, params);
    return this.shortCache.set(key, data);
  }

  invalidateCards(organizationId) {
    const keys = this.shortCache.keys();
    keys.forEach(key => {
      if (key.startsWith(`cards:${organizationId}`)) {
        this.shortCache.del(key);
      }
    });
  }

  // Stats cache (medium-lived as stats don't change as frequently)
  getStats(organizationId, period) {
    const key = this.generateKey('stats', organizationId, { period });
    return this.mediumCache.get(key);
  }

  setStats(organizationId, period, data) {
    const key = this.generateKey('stats', organizationId, { period });
    return this.mediumCache.set(key, data);
  }

  // AI Config cache (long-lived as config rarely changes)
  getAIConfig(organizationId) {
    const key = `aiconfig:${organizationId}`;
    return this.longCache.get(key);
  }

  setAIConfig(organizationId, data) {
    const key = `aiconfig:${organizationId}`;
    return this.longCache.set(key, data);
  }

  invalidateAIConfig(organizationId) {
    const key = `aiconfig:${organizationId}`;
    this.longCache.del(key);
  }

  // Clear all caches for an organization
  clearOrganization(organizationId) {
    [this.shortCache, this.mediumCache, this.longCache].forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.includes(organizationId)) {
          cache.del(key);
        }
      });
    });
  }

  // Get cache statistics
  getStats() {
    return {
      short: this.shortCache.getStats(),
      medium: this.mediumCache.getStats(),
      long: this.longCache.getStats()
    };
  }
}

module.exports = new CacheService();