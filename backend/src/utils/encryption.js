const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    // Ensure we have a proper 32-byte key
    this.secretKey = process.env.ENCRYPTION_KEY || this.generateSecretKey();
    
    // If the key is not the right length, pad or trim it to 32 bytes
    if (typeof this.secretKey === 'string') {
      if (this.secretKey.length < 32) {
        this.secretKey = this.secretKey.padEnd(32, '0');
      } else if (this.secretKey.length > 32) {
        this.secretKey = this.secretKey.substring(0, 32);
      }
    }
  }

  generateSecretKey() {
    return crypto.randomBytes(32).toString('hex').substring(0, 32);
  }

  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.secretKey), iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        encrypted,
        iv: iv.toString('hex')
      };
    } catch (error) {
      throw new Error('Encryption failed: ' + error.message);
    }
  }

  decrypt(encryptedData, iv) {
    try {
      const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.secretKey), Buffer.from(iv, 'hex'));
      
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  // Simplified encrypt for API keys (backward compatibility)
  encryptApiKey(apiKey) {
    const result = this.encrypt(apiKey);
    return {
      encryptedApiKey: result.encrypted,
      iv: result.iv
    };
  }

  decryptApiKey(encryptedApiKey, iv) {
    return this.decrypt(encryptedApiKey, iv);
  }
}

module.exports = new EncryptionService();