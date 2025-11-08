// Test Google AI model fetching with a fake API key to see the improved error handling
const axios = require('axios');

async function testGoogleAIModels() {
  try {
    console.log('🧪 Testing Google AI model fetching...');
    
    const response = await axios.post('http://localhost:3001/api/config/ai/models', {
      provider: 'google',
      apiKey: 'fake_api_key_for_testing'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Error (expected with fake key):');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.data?.message);
    console.log('Details:', error.response?.data?.details);
  }
}

testGoogleAIModels();