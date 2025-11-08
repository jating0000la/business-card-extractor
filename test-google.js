const fetch = require('node-fetch');

async function testGoogleAI() {
  try {
    const response = await fetch('http://localhost:3001/api/config/ai/models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        provider: 'google',
        apiKey: 'AIzaSyBmhJGMD5iT-oz7O0TVhvUof4IWT8JnbKk'
      })
    });
    
    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testGoogleAI();