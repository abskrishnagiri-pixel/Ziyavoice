import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const { signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowSuccess(false);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, username, password);
        if (error) throw error;
        setShowSuccess(true);
        // Automatically switch to login mode after successful signup
        setTimeout(() => {
          setIsSignUp(false);
          setShowSuccess(false);
        }, 2000);
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        setShowSuccess(true);
        // Redirect to the dashboard or the page they were trying to access
        const from = location.state?.from?.pathname || '/agents';
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate with Google');
      setLoading(false);
    }
  };

  if (isSignUp) {
    // Sign Up Layout
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-lightbg to-lightbg dark:from-primary/5 dark:via-darkbg dark:to-slate-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden relative">
        {/* Background animated elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-soft"></div>
        <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-primary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-soft" style={{ animationDelay: '2s' }}></div>

        {/* Split Layout Container */}
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center relative z-10">
          {/* Left side - Features */}
          <div className="hidden lg:block space-y-8 animate-slide-left">
            <div>
              <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-4 leading-tight">
                Join Ziya Voice Agent
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Create powerful AI-powered voice agents for your business
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              {[
                { icon: '🎯', title: 'Easy Setup', desc: 'Create agents in minutes' },
                { icon: '🔊', title: 'Voice Powered', desc: 'Advanced speech recognition' },
                { icon: '📊', title: 'Analytics', desc: 'Track every interaction' },
                { icon: '🔒', title: 'Secure', desc: 'Enterprise-grade security' }
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-4 animate-slide-left" style={{ animationDelay: `${0.1 * (idx + 1)}s` }}>
                  <div className="text-3xl">{feature.icon}</div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{feature.title}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right side - Sign Up Form */}
          <div className="w-full animate-scale-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 sm:p-10 space-y-6 border border-slate-200 dark:border-slate-700">
              {/* Header */}
              <div className="animate-slide-down">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                  Create Account
                </h2>
                <p className="text-slate-600 dark:text-slate-400">
                  Get started with your voice agent today
                </p>
              </div>

              {/* Form */}
              <form className="space-y-5 animate-slide-up" onSubmit={handleSubmit}>
                {/* Error Alert */}
                {error && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800 error-message-animate flex items-start gap-3">
                    <svg className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-red-700 dark:text-red-400">{error}</div>
                  </div>
                )}

                {/* Success Alert */}
                {showSuccess && (
                  <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800 success-message-animate flex items-start gap-3">
                    <svg className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-green-700 dark:text-green-400">
                      Account created successfully! Please sign in.
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div className="relative animate-slide-left" style={{ animationDelay: '0.1s' }}>
                  <label htmlFor="email-address" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Email Address
                  </label>
                  <input
                    id="email-address"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 input-animate"
                    placeholder="you@example.com"
                  />
                </div>

                {/* Username Input */}
                <div className="relative animate-slide-left" style={{ animationDelay: '0.15s' }}>
                  <label htmlFor="username" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 input-animate"
                    placeholder="johndoe"
                  />
                </div>

                {/* Password Input */}
                <div className="relative animate-slide-right" style={{ animationDelay: '0.2s' }}>
                  <label htmlFor="password" className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 placeholder-slate-500 text-slate-900 dark:text-white dark:bg-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 input-animate"
                    placeholder="At least 6 characters"
                  />
                </div>

                {/* Submit Button */}
                <div className="animate-slide-left" style={{ animationDelay: '0.3s' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center py-3 px-4 rounded-lg text-white font-semibold bg-gradient-to-r from-primary to-emerald-600 hover:from-primary-dark hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 btn-animate shadow-lg"
                  >
                    {loading ? (
                      <>
                        <span className="spinner mr-3"></span>
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </button>
                </div>
              </form>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                    Or
                  </span>
                </div>
              </div>

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 btn-animate animate-slide-left" style={{ animationDelay: '0.4s' }}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="hidden sm:inline">Sign up with Google</span>
                <span className="sm:hidden">Google</span>
              </button>

              {/* Footer */}
              <div className="text-center text-sm text-slate-600 dark:text-slate-400 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className="font-semibold text-primary hover:text-primary-dark transition-colors"
                >
                  Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login Layout
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-slate-900 to-darkbg dark:from-slate-900 dark:via-darkbg dark:to-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden relative">
      {/* Background animated elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-primary rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse-soft"></div>
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-cyan-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 animate-pulse-soft" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Main container */}
      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Card */}
        <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-xl rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 dark:border-slate-700/50 space-y-8">
          {/* Header */}
          <div className="animate-slide-down text-center space-y-3">
            <h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-primary to-cyan-400 bg-clip-text text-transparent">
              Welcome Back
            </h2>
            <p className="text-slate-300 text-lg">
              Sign in to manage your voice agents
            </p>
          </div>

          {/* Form */}
          <form className="space-y-6 animate-slide-up" onSubmit={handleSubmit}>
            {/* Error Alert */}
            {error && (
              <div className="rounded-2xl bg-red-500/20 p-4 border border-red-500/50 error-message-animate flex items-start gap-3 backdrop-blur">
                <svg className="h-5 w-5 text-red-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-red-200">{error}</div>
              </div>
            )}

            {/* Success Alert */}
            {showSuccess && (
              <div className="rounded-2xl bg-green-500/20 p-4 border border-green-500/50 success-message-animate flex items-start gap-3 backdrop-blur">
                <svg className="h-5 w-5 text-green-300 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-green-200">
                  Login successful! Redirecting...
                </div>
              </div>
            )}

            {/* Email Input */}
            <div className="relative animate-slide-left" style={{ animationDelay: '0.1s' }}>
              <label htmlFor="email-address" className="block text-sm font-semibold text-slate-200 mb-2">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 placeholder-slate-400 text-white dark:text-white dark:bg-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 input-animate backdrop-blur"
                placeholder="you@example.com"
              />
            </div>

            {/* Password Input */}
            <div className="relative animate-slide-right" style={{ animationDelay: '0.2s' }}>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-200 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 placeholder-slate-400 text-white dark:text-white dark:bg-slate-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-300 input-animate backdrop-blur"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit Button */}
            <div className="animate-slide-left" style={{ animationDelay: '0.3s' }}>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl text-white font-bold bg-gradient-to-r from-primary to-cyan-500 hover:from-primary-dark hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 btn-animate shadow-2xl shadow-primary/50 text-lg"
              >
                {loading ? (
                  <>
                    <span className="spinner mr-3"></span>
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>

          {/* Admin Panel Link */}
          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => navigate('/admin/login')}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Admin Panel Login →
            </button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/20"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white/10 text-slate-300 font-medium backdrop-blur">
                Or continue with
              </span>
            </div>
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-white/30 rounded-xl text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 btn-animate backdrop-blur animate-slide-left" style={{ animationDelay: '0.4s' }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            <span className="hidden sm:inline">Sign in with Google</span>
            <span className="sm:hidden">Google</span>
          </button>

          {/* Footer */}
          <div className="text-center text-sm text-slate-300 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className="font-bold text-primary hover:text-primary-dark transition-colors"
            >
              Create one
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;