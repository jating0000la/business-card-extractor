import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';
import { Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CardsTest = () => {
  console.log('CardsTest component rendering');
  
  const { user, isAuthenticated, isLoading } = useAuth();
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  console.log('Auth state:', { isAuthenticated, isLoading, user: user?.name });

  const testAPI = async () => {
    console.log('Testing API call...');
    setTesting(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token exists:', !!token);
      
      const response = await fetch('http://localhost:3001/api/cards', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response status:', response.status);
      const data = await response.json();
      console.log('API Response data:', data);
      
      setTestResult({
        success: response.ok,
        status: response.status,
        data: data
      });
      
      if (response.ok) {
        toast.success('API call successful!');
      } else {
        toast.error(`API call failed: ${response.status}`);
      }
    } catch (error) {
      console.error('API test error:', error);
      setTestResult({
        success: false,
        error: error.message
      });
      toast.error('API call failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Cards API Test</h1>
        
        {/* Authentication Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <div className="space-y-2">
            <p><span className="font-medium">Loading:</span> {isLoading ? '⏳ Yes' : '✅ No'}</p>
            <p><span className="font-medium">Authenticated:</span> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
            <p><span className="font-medium">User:</span> {user?.name || 'Not loaded'}</p>
            <p><span className="font-medium">Email:</span> {user?.email || 'Not loaded'}</p>
            <p><span className="font-medium">Role:</span> {user?.role || 'Not loaded'}</p>
            <p><span className="font-medium">Token:</span> {localStorage.getItem('token') ? '✅ Present' : '❌ Missing'}</p>
          </div>
        </div>

        {/* API Test Button */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <button
            onClick={testAPI}
            disabled={testing || !isAuthenticated}
            className={`px-6 py-3 rounded-md font-medium ${
              testing || !isAuthenticated
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {testing ? (
              <>
                <Loader className="inline h-4 w-4 mr-2 animate-spin" />
                Testing API...
              </>
            ) : (
              'Test Cards API'
            )}
          </button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">API Test Results</h2>
            <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center mb-2">
                {testResult.success ? (
                  <div className="text-green-600">✅ Success</div>
                ) : (
                  <div className="text-red-600 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Failed
                  </div>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                {testResult.status && (
                  <p><span className="font-medium">Status:</span> {testResult.status}</p>
                )}
                {testResult.error && (
                  <p><span className="font-medium">Error:</span> {testResult.error}</p>
                )}
                {testResult.data && (
                  <div>
                    <p className="font-medium">Response Data:</p>
                    <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto">
                      {JSON.stringify(testResult.data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Testing Instructions</h3>
          <div className="text-blue-800 space-y-2">
            <p>1. Make sure you are logged in (authentication status should show ✅)</p>
            <p>2. Click "Test Cards API" to check if the backend API is working</p>
            <p>3. Check the console and network tabs in browser dev tools</p>
            <p>4. Look at the terminal to see if API requests are reaching the backend</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CardsTest;