import { getApiBaseUrl } from '../utils/api';

export interface User {
  id: string;
  email: string;
  username?: string;
  google_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  updated_at: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export const authService = {
  // Authenticate user with email and password
  async authenticateUser(email: string, password: string): Promise<User | null> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Invalid credentials');
      }

      return result.user;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new Error('Authentication failed');
    }
  },

  // Register a new user
  async registerUser(email: string, username: string, password: string): Promise<User | null> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, username, password }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Registration failed');
      }

      return result.user;
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Registration failed');
    }
  },

  // Sign in with Google
  async signInWithGoogle(): Promise<User | null> {
    // This will be handled by redirecting to the Google OAuth endpoint
    window.location.href = `${getApiBaseUrl()}/api/auth/google`;
    return null;
  },

  // Handle Google Sign-In callback
  async handleGoogleSignInCallback(): Promise<User | null> {
    // This function would be called after Google redirects back to the app
    // For now, we'll check for user data in the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const userParam = urlParams.get('user');

    if (userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        return user;
      } catch (error) {
        console.error('Error parsing user data from URL:', error);
        return null;
      }
    }

    return null;
  },

  // Sign out user
  async signOut(): Promise<void> {
    try {
      await fetch(`${getApiBaseUrl()}/api/auth/logout`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Sign out failed');
    }
  },

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/users/${id}`);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch user');
      }

      return result.user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    }
  },

  // Get user profile
  async getUserProfile(userId: string): Promise<Profile | null> {
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/profiles/${userId}`);

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch profile');
      }

      return result.profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }
};