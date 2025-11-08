import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { CreditCard, LogIn } from 'lucide-react';
import { signInWithGoogle } from '../utils/firebase';
import toast from 'react-hot-toast';

const Login = () => {
  const { isAuthenticated, login, isLoading } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      setSigningIn(true);
      const { user, idToken } = await signInWithGoogle();
      
      // Call the login function with Firebase user data
      await login({
        credential: idToken,
        user: user
      });
      
      toast.success('Successfully signed in!');
    } catch (error) {
      console.error('Login failed:', error);
      toast.error('Failed to sign in. Please try again.');
    } finally {
      setSigningIn(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <CreditCard className="h-12 w-12 text-primary-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Business Card Extractor
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          AI-powered business card data extraction
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 text-center mb-4">
                Sign in to continue
              </h3>
              <p className="text-sm text-gray-600 text-center mb-6">
                Use your Google account to access the platform
              </p>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleGoogleSignIn}
                disabled={signingIn}
                className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signingIn ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-3"></div>
                ) : (
                  <LogIn className="h-5 w-5 mr-3 text-primary-600" />
                )}
                {signingIn ? 'Signing in...' : 'Sign in with Google'}
              </button>
            </div>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Features</span>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-100">
                    <CreditCard className="h-4 w-4 text-primary-600" />
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">
                    Extract data from business cards using AI
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-100">
                    <span className="text-xs font-medium text-primary-600">✓</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">
                    Secure multi-organization support
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary-100">
                    <span className="text-xs font-medium text-primary-600">⚡</span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-gray-700">
                    Real-time processing and webhooks
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our privacy policy. No business card images are stored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;