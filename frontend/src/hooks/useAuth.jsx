import { createContext, useContext, useReducer, useEffect } from 'react';
import { auth } from '../utils/api';
import { auth as firebaseAuth, signOutUser } from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: localStorage.getItem('token'),
};

// Action types
const actionTypes = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  VERIFY_START: 'VERIFY_START',
  VERIFY_SUCCESS: 'VERIFY_SUCCESS',
  VERIFY_FAILURE: 'VERIFY_FAILURE',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case actionTypes.LOGIN_START:
    case actionTypes.VERIFY_START:
      return {
        ...state,
        isLoading: true,
      };
    
    case actionTypes.LOGIN_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        token: action.payload.token,
      };
    
    case actionTypes.VERIFY_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
      };
    
    case actionTypes.LOGIN_FAILURE:
    case actionTypes.VERIFY_FAILURE:
    case actionTypes.LOGOUT:
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        token: null,
      };
    
    case actionTypes.UPDATE_USER:
      const updatedUser = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return {
        ...state,
        user: updatedUser,
      };
    
    default:
      return state;
  }
};

// Context
const AuthContext = createContext(null);

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verify token on app load with cooldown to prevent rate limiting
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const lastVerifyAttempt = localStorage.getItem('lastVerifyAttempt');
      
      if (!token || !storedUser) {
        dispatch({ type: actionTypes.VERIFY_FAILURE });
        return;
      }

      // Implement shorter cooldown - only verify once per 10 seconds to prevent rate limiting
      // while maintaining reasonable security
      const now = Date.now();
      if (lastVerifyAttempt && (now - parseInt(lastVerifyAttempt)) < 10000) {
        // Use cached user data if within cooldown period and token exists
        if (token && storedUser) {
          try {
            const user = JSON.parse(storedUser);
            // Additional validation - ensure token is not obviously expired
            const tokenPayload = JSON.parse(atob(token.split('.')[1]));
            if (tokenPayload.exp * 1000 > now) {
              dispatch({ 
                type: actionTypes.VERIFY_SUCCESS, 
                payload: { user } 
              });
              console.log('Using cached authentication (cooldown period)');
              return;
            }
          } catch (parseError) {
            console.error('Failed to parse stored user data or token:', parseError);
          }
        }
      }

      try {
        dispatch({ type: actionTypes.VERIFY_START });
        localStorage.setItem('lastVerifyAttempt', now.toString());
        
        // Try to verify token with backend
        const response = await auth.verify();
        dispatch({ 
          type: actionTypes.VERIFY_SUCCESS, 
          payload: response.data 
        });
      } catch (error) {
        console.error('Token verification failed:', error);
        
        // If verification fails but we have stored user data, try to use it temporarily
        if (storedUser && error.response?.status !== 401) {
          try {
            const user = JSON.parse(storedUser);
            dispatch({ 
              type: actionTypes.VERIFY_SUCCESS, 
              payload: { user } 
            });
            console.warn('Using cached user data due to verification failure');
            return;
          } catch (parseError) {
            console.error('Failed to parse stored user data:', parseError);
          }
        }
        
        // Only clear auth if it's a definitive auth failure
        if (error.response?.status === 401 || error.response?.status === 403) {
          dispatch({ type: actionTypes.VERIFY_FAILURE });
        } else {
          // Network or other errors - keep user logged in but show warning
          if (storedUser) {
            try {
              const user = JSON.parse(storedUser);
              dispatch({ 
                type: actionTypes.VERIFY_SUCCESS, 
                payload: { user } 
              });
              console.warn('Using cached authentication due to network error');
            } catch {
              dispatch({ type: actionTypes.VERIFY_FAILURE });
            }
          } else {
            dispatch({ type: actionTypes.VERIFY_FAILURE });
          }
        }
      }
    };

    verifyToken();
  }, []);

  // Firebase Google login handler
  const handleGoogleLogin = async (firebaseData) => {
    try {
      dispatch({ type: actionTypes.LOGIN_START });
      
      console.log('Starting Google login with:', { credential: firebaseData.credential?.substring(0, 20) + '...' });
      
      // Send Firebase ID token to backend for verification
      const response = await auth.googleLogin(firebaseData.credential);
      
      console.log('Login successful:', response.data.user);
      
      dispatch({ 
        type: actionTypes.LOGIN_SUCCESS, 
        payload: response.data 
      });
      
      toast.success(`Welcome back, ${response.data.user.name}!`);
      return response.data;
    } catch (error) {
      console.error('Login error details:', error.response?.data || error.message);
      dispatch({ type: actionTypes.LOGIN_FAILURE });
      const message = error.response?.data?.error || 'Login failed';
      toast.error(message);
      throw error;
    }
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      // Sign out from Firebase
      await signOutUser();
      // Call backend logout
      await auth.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: actionTypes.LOGOUT });
      toast.success('Logged out successfully');
    }
  };

  // Update user data
  const updateUser = (userData) => {
    dispatch({ type: actionTypes.UPDATE_USER, payload: userData });
  };

  // Check if user has role
  const hasRole = (role) => {
    return state.user?.role === role;
  };

  // Check if user is admin
  const isAdmin = () => {
    return hasRole('admin');
  };

  const value = {
    ...state,
    login: handleGoogleLogin,
    logout: handleLogout,
    updateUser,
    hasRole,
    isAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};