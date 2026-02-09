import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService, User } from '../services/authService';

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, username: string, password: string) => Promise<any>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        // Check for Google Sign-In callback first (priority)
        const googleUser = await authService.handleGoogleSignInCallback();
        if (googleUser) {
          console.log('✅ Google OAuth user found:', googleUser.email);
          setUser(googleUser);
          localStorage.setItem('ziya-user', JSON.stringify(googleUser));
          // Remove URL parameters
          window.history.replaceState({}, document.title, window.location.pathname);
          // Navigate to agents page
          navigate('/agents');
          return;
        }

        // Check if we have a valid session in localStorage
        const storedUser = localStorage.getItem('ziya-user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [location, navigate]); // Re-run when location changes

  const signIn = async (email: string, password: string) => {
    try {
      const authenticatedUser = await authService.authenticateUser(email, password);
      if (authenticatedUser) {
        setUser(authenticatedUser);
        // Store user in localStorage for session persistence
        localStorage.setItem('ziya-user', JSON.stringify(authenticatedUser));
        // Navigate to the dashboard after successful login
        navigate('/agents');
        return { data: { user: authenticatedUser }, error: null };
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error: any) {
      return { data: null, error: { message: error.message || 'Sign in failed' } };
    }
  };

  const signUp = async (email: string, username: string, password: string) => {
    try {
      const newUser = await authService.registerUser(email, username, password);
      if (newUser) {
        setUser(newUser);
        // Store user in localStorage for session persistence
        localStorage.setItem('ziya-user', JSON.stringify(newUser));
        return { data: { user: newUser }, error: null };
      } else {
        throw new Error('Registration failed');
      }
    } catch (error: any) {
      return { data: null, error: { message: error.message || 'Sign up failed' } };
    }
  };

  const signInWithGoogle = async () => {
    try {
      await authService.signInWithGoogle();
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  const signOut = async () => {
    try {
      await authService.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setUser(null);
      // Clear user from localStorage
      localStorage.removeItem('ziya-user');
      // Navigate to login page after logout
      navigate('/login');
    }
  };

  const value = {
    user,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    loading
  };

  // Don't render children while checking auth state,
  // but allow rendering on login page even if not authenticated
  if (loading && location.pathname !== '/login') {
    return (
      <div className="min-h-screen bg-lightbg dark:bg-darkbg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};