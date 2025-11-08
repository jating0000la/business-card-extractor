class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      responses: 0,
      errors: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0, // Requests taking > 1000ms
      cacheHits: 0,
      cacheMisses: 0,
      activeConnections: 0
    };
    
    this.requestTimes = new Map();
    this.slowRequestThreshold = 1000; // ms
    
    // Reset metrics every hour
    setInterval(() => {
      this.resetHourlyMetrics();
    }, 3600000);
  }

  // Middleware to track request performance
  trackRequest() {
    return (req, res, next) => {
      const startTime = Date.now();
      const requestId = `${Date.now()}-${Math.random()}`;
      
      this.metrics.requests++;
      this.metrics.activeConnections++;
      this.requestTimes.set(requestId, startTime);

      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = (...args) => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        this.metrics.responses++;
        this.metrics.activeConnections--;
        this.metrics.totalResponseTime += responseTime;
        this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.responses;
        
        if (responseTime > this.slowRequestThreshold) {
          this.metrics.slowRequests++;
          console.warn(`⚠️  Slow request detected: ${req.method} ${req.path} - ${responseTime}ms`);
        }
        
        // Track error responses
        if (res.statusCode >= 400) {
          this.metrics.errors++;
        }
        
        this.requestTimes.delete(requestId);
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Track cache performance
  trackCacheHit() {
    this.metrics.cacheHits++;
  }

  trackCacheMiss() {
    this.metrics.cacheMisses++;
  }

  // Get current metrics
  getMetrics() {
    const cacheHitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0
      ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) * 100).toFixed(2)
      : 0;

    const errorRate = this.metrics.responses > 0
      ? (this.metrics.errors / this.metrics.responses * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: `${cacheHitRate}%`,
      errorRate: `${errorRate}%`,
      averageResponseTime: Math.round(this.metrics.averageResponseTime),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }

  // Get performance summary
  getSummary() {
    const metrics = this.getMetrics();
    return {
      status: this.getHealthStatus(metrics),
      summary: {
        totalRequests: metrics.requests,
        averageResponseTime: `${metrics.averageResponseTime}ms`,
        errorRate: metrics.errorRate,
        cacheHitRate: metrics.cacheHitRate,
        activeConnections: metrics.activeConnections,
        uptime: `${Math.floor(metrics.uptime / 3600)}h ${Math.floor((metrics.uptime % 3600) / 60)}m`
      }
    };
  }

  // Determine health status based on metrics
  getHealthStatus(metrics) {
    if (metrics.averageResponseTime > 2000 || parseFloat(metrics.errorRate) > 10) {
      return 'unhealthy';
    }
    if (metrics.averageResponseTime > 1000 || parseFloat(metrics.errorRate) > 5) {
      return 'degraded';
    }
    return 'healthy';
  }

  // Reset hourly metrics (keep cumulative data)
  resetHourlyMetrics() {
    console.log('📊 Hourly Performance Summary:', this.getSummary());
    
    // Reset non-cumulative metrics
    this.metrics.totalResponseTime = 0;
    this.metrics.averageResponseTime = 0;
  }

  // Get top slow requests
  getSlowRequests() {
    // This would require more detailed tracking in a real implementation
    return {
      threshold: `${this.slowRequestThreshold}ms`,
      count: this.metrics.slowRequests,
      percentage: this.metrics.responses > 0 
        ? ((this.metrics.slowRequests / this.metrics.responses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

module.exports = new PerformanceMonitor();