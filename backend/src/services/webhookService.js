const crypto = require('crypto');
const axios = require('axios');
const { Queue, Worker } = require('bullmq');
const { WebhookConfig } = require('../models');

class WebhookService {
  constructor() {
    // Check if Redis is configured
    this.redisEnabled = !!(process.env.REDIS_HOST);
    
    if (this.redisEnabled) {
      this.connection = {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || undefined
      };

      // Initialize BullMQ queue for webhook retries
      this.webhookQueue = new Queue('webhook-delivery', { 
        connection: this.connection,
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50
        }
      });

      // Initialize worker for processing webhooks
      this.initializeWorker();
    } else {
      console.log('🔄 Redis not configured - webhooks will be sent directly without retry queue');
    }
  }

  async sendWebhook(organizationId, eventType, data) {
    try {
      const webhookConfig = await WebhookConfig.findOne({
        organization: organizationId,
        isActive: true
      });

      if (!webhookConfig || !webhookConfig.events[eventType]) {
        return null; // Webhook not configured or event type not enabled
      }

      const payload = {
        event: eventType,
        timestamp: new Date().toISOString(),
        organizationId: organizationId.toString(),
        data: data
      };

      if (this.redisEnabled) {
        // Add to queue for processing with retries
        await this.webhookQueue.add('deliver-webhook', {
          webhookConfigId: webhookConfig._id,
          payload,
          attempt: 1
        }, {
          attempts: webhookConfig.retryConfig.maxRetries + 1,
          backoff: {
            type: 'exponential',
            delay: webhookConfig.retryConfig.retryDelay
          }
        });

        return { success: true, message: 'Webhook queued for delivery' };
      } else {
        // Send webhook directly without queue
        const result = await this.deliverWebhook(webhookConfig, payload, 1);
        return { success: true, message: 'Webhook sent directly', result };
      }
    } catch (error) {
      console.error('Webhook sending error:', error);
      throw new Error(`Webhook delivery failed: ${error.message}`);
    }
  }

  initializeWorker() {
    if (!this.redisEnabled) {
      return; // Skip worker initialization if Redis is not enabled
    }

    const worker = new Worker('webhook-delivery', async (job) => {
      const { webhookConfigId, payload, attempt } = job.data;
      
      try {
        const webhookConfig = await WebhookConfig.findById(webhookConfigId);
        if (!webhookConfig || !webhookConfig.isActive) {
          throw new Error('Webhook configuration not found or inactive');
        }

        const result = await this.deliverWebhook(webhookConfig, payload, attempt);
        
        // Update success statistics
        await this.updateWebhookStats(webhookConfigId, true, result.responseTime);
        
        return result;
      } catch (error) {
        // Update failure statistics
        await this.updateWebhookStats(webhookConfigId, false);
        throw error;
      }
    }, { 
      connection: this.connection,
      concurrency: 5
    });

    worker.on('completed', (job, returnValue) => {
      console.log(`Webhook delivered successfully: ${job.id}`);
    });

    worker.on('failed', (job, err) => {
      console.error(`Webhook delivery failed: ${job.id}`, err.message);
    });
  }

  async deliverWebhook(webhookConfig, payload, attempt) {
    const startTime = Date.now();
    
    try {
      // Generate HMAC signature
      const signature = this.generateSignature(payload, webhookConfig.secret);
      
      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'User-Agent': 'BusinessCardExtractor/1.0',
        'X-Signature-256': signature,
        'X-Event-Type': payload.event,
        'X-Timestamp': payload.timestamp,
        'X-Attempt': attempt.toString()
      };

      // Add custom headers
      if (webhookConfig.headers && Array.isArray(webhookConfig.headers)) {
        webhookConfig.headers.forEach(header => {
          headers[header.name] = header.value;
        });
      }

      // Send webhook
      const response = await axios.post(webhookConfig.url, payload, {
        headers,
        timeout: 30000, // 30 seconds timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      const responseTime = Date.now() - startTime;

      return {
        success: true,
        status: response.status,
        responseTime,
        attempt
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      let status = 0;
      let errorMessage = error.message;

      if (error.response) {
        status = error.response.status;
        errorMessage = `HTTP ${status}: ${error.response.statusText}`;
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout';
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = 'Connection refused';
      }

      throw new Error(`Webhook delivery failed (attempt ${attempt}): ${errorMessage}`);
    }
  }

  generateSignature(payload, secret) {
    const payloadString = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payloadString);
    return `sha256=${hmac.digest('hex')}`;
  }

  verifySignature(payload, signature, secret) {
    const expectedSignature = this.generateSignature(payload, secret);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  async updateWebhookStats(webhookConfigId, success, responseTime = 0) {
    try {
      const updateData = {
        lastTriggered: new Date(),
        $inc: {
          'stats.totalSent': 1
        }
      };

      if (success) {
        updateData.$inc['stats.successCount'] = 1;
        if (responseTime > 0) {
          // Simple moving average for response time
          const config = await WebhookConfig.findById(webhookConfigId);
          const currentAvg = config.stats.averageResponseTime || 0;
          const totalSuccess = config.stats.successCount + 1;
          const newAvg = ((currentAvg * (totalSuccess - 1)) + responseTime) / totalSuccess;
          updateData['stats.averageResponseTime'] = Math.round(newAvg);
        }
      } else {
        updateData.$inc['stats.failureCount'] = 1;
      }

      await WebhookConfig.findByIdAndUpdate(webhookConfigId, updateData);
    } catch (error) {
      console.error('Failed to update webhook stats:', error);
    }
  }

  async testWebhook(organizationId, testPayload) {
    try {
      const webhookConfig = await WebhookConfig.findOne({
        organization: organizationId,
        isActive: true
      });

      if (!webhookConfig) {
        throw new Error('No active webhook configuration found');
      }

      const payload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        organizationId: organizationId.toString(),
        data: testPayload || { message: 'This is a test webhook' }
      };

      const result = await this.deliverWebhook(webhookConfig, payload, 1);
      return result;
    } catch (error) {
      throw new Error(`Webhook test failed: ${error.message}`);
    }
  }

  async getQueueStats() {
    try {
      const waiting = await this.webhookQueue.getWaiting();
      const active = await this.webhookQueue.getActive();
      const completed = await this.webhookQueue.getCompleted();
      const failed = await this.webhookQueue.getFailed();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return null;
    }
  }

  async retryFailedWebhooks(organizationId) {
    try {
      const failed = await this.webhookQueue.getFailed();
      const orgFailures = failed.filter(job => 
        job.data.payload.organizationId === organizationId.toString()
      );

      for (const job of orgFailures) {
        await job.retry();
      }

      return { retriedCount: orgFailures.length };
    } catch (error) {
      throw new Error(`Failed to retry webhooks: ${error.message}`);
    }
  }
}

module.exports = new WebhookService();