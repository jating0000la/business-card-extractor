import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

const CardsSimple = () => {
  console.log('CardsSimple component rendering');
  const { user, isAuthenticated, isLoading } = useAuth();
  
  console.log('Auth state:', { isAuthenticated, isLoading, user: user?.name });

  return (
    <Layout>
      <div className="p-8">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Cards Page Test</h1>
        <div className="space-y-4">
          <p>✅ Cards component is now rendering!</p>
          <p><strong>User:</strong> {user?.name || 'Not loaded'}</p>
          <p><strong>Email:</strong> {user?.email || 'Not loaded'}</p>
          <p><strong>Authenticated:</strong> {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
          <p><strong>Loading:</strong> {isLoading ? '⏳ Yes' : '✅ No'}</p>
          <div className="bg-blue-100 p-4 rounded">
            <p>This simplified version shows the component is working. We can now add back the full functionality step by step.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CardsSimple;