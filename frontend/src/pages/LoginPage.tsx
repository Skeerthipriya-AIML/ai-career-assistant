import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Mail, Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { FcGoogle } from 'react-icons/fc';

export const LoginPage: React.FC = () => {
  const { login, oauthLogin, error, setError, loading } = useAuthStore();
  const navigate = useNavigate();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(false);

  useEffect(() => {
    setError(null);
    const { user, token } = useAuthStore.getState();
    if (user && token) {
      navigate('/dashboard');
    } else {
      useAuthStore.setState({ loading: false });
    }
    const savedEmail = localStorage.getItem('remember_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, [setError, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login({ email, password });
      if (rememberMe) {
        localStorage.setItem('remember_email', email);
      } else {
        localStorage.removeItem('remember_email');
      }
      navigate('/dashboard');
    } catch (err) {
      // Error handled by store
    }
  };

  const handleOAuthGoogle = async () => {
    try {
      // Simulate Google OAuth popup credential retrieval
      const mockGoogleToken = `google_oauth_token_${Math.random().toString(36).substring(2, 11)}`;
      await oauthLogin(
        'google',
        mockGoogleToken,
        email || 'google_recruit@ai-career.com',
        'Recruiter Google Account',
        'https://api.dicebear.com/7.x/bottts/svg?seed=google_user'
      );
      navigate('/dashboard');
    } catch (err) {
      // Error handled by store
    }
  };

  const handleGuestMode = () => {
    const { setToken, setUser } = useAuthStore.getState();
    setToken('guest_token_session');
    setUser({
      id: 'guest_user_id',
      email: 'guest@ai-career.com',
      name: 'Guest Tester',
      username: 'guest_mode',
      role: 'GUEST',
      is_verified: true,
      onboarded: true,
      skills: ['React', 'JavaScript'],
      preferred_companies: ['Google', 'OpenAI'],
      created_at: new Date().toISOString()
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#070b13] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-500/10 rounded-full blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-[120px]"></div>

      <div className="w-full max-w-md bg-[#0c1324]/85 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl z-10 glow-brand">
        <div className="flex flex-col items-center mb-6">
          <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl mb-3">
            <Compass className="text-brand-500 animate-float" size={36} />
          </div>
          <h1 className="font-outfit font-extrabold text-2xl tracking-wide uppercase text-slate-100">AI CAREER ASSISTANT</h1>
          <p className="text-slate-400 text-xs text-center mt-1">Enterprise SaaS Platform Authentication</p>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 text-xs mb-4">
            <AlertTriangle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-slate-500" size={16} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-800 bg-slate-900 text-brand-500 focus:ring-brand-500"
              />
              <span>Remember Me</span>
            </label>
            <Link to="/forgot-password" className="hover:text-brand-400 transition font-semibold">Forgot Password?</Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-800 w-full"></div>
          <span className="absolute bg-[#0c1324] px-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">Or</span>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={handleOAuthGoogle}
            className="flex items-center justify-center space-x-2 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition"
          >
            <FcGoogle size={16} />
            <span>Google Login</span>
          </button>
          <button
            onClick={handleGuestMode}
            className="flex items-center justify-center space-x-2 py-2 rounded-lg bg-teal-950/20 hover:bg-teal-900/20 border border-teal-900/35 text-teal-400 text-xs font-semibold transition"
          >
            <ShieldCheck size={16} />
            <span>Guest Demo</span>
          </button>
        </div>

        <div className="text-center mt-4">
          <Link to="/register" className="text-xs text-slate-400 hover:text-brand-400 font-semibold transition">
            Don't have an account? Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};
