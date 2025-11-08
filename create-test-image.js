import fs from 'fs';
import path from 'path';

// Create a simple test image (1x1 pixel PNG)
const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU8H8wAAAABJRU5ErkJggg==';
const testImageBuffer = Buffer.from(testImageBase64, 'base64');

// Write test image to disk
const testImagePath = path.join(process.cwd(), 'test-card.png');
fs.writeFileSync(testImagePath, testImageBuffer);

console.log('Test image created at:', testImagePath);