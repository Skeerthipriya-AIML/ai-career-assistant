import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Mail, Lock, User, Check, X, AlertTriangle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { registerUser, error, setError, loading } = useAuthStore();
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const rules = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };

  const isPasswordValid = Object.values(rules).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;
    setError(null);
    try {
      await registerUser({ name, username, email, password });
      setSuccess(true);
    } catch (err) {
      // Handled in store
    }
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
          <h1 className="font-outfit font-extrabold text-2xl tracking-wide uppercase text-slate-100">CREATE ACCOUNT</h1>
          <p className="text-slate-400 text-xs text-center mt-1">Start your AI Career Companion journey</p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Check size={32} />
            </div>
            <h2 className="text-slate-200 font-bold text-lg">Registration Successful!</h2>
            <p className="text-slate-400 text-xs leading-relaxed text-slate-300">
              We have dispatched an email verification token link. Please click on the link or paste the token to activate your account.
            </p>
            <Link
              to="/verify-email"
              className="inline-block px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold tracking-wide transition shadow"
            >
              Verify Email Token
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-950/20 border border-red-900/50 rounded-lg text-red-400 text-xs mb-4">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="text"
                  placeholder="Username (e.g. jdoe)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

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

              <div className="p-3.5 bg-slate-950/40 rounded-lg border border-slate-900/50 space-y-1.5 text-[11px] text-slate-400">
                <span className="font-bold text-slate-300 block mb-1">Password Requirements:</span>
                <div className="flex items-center space-x-1.5">
                  {rules.length ? <Check size={12} className="text-teal-400" /> : <X size={12} className="text-red-500" />}
                  <span className={rules.length ? "text-slate-300" : ""}>At least 8 characters long</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {rules.uppercase ? <Check size={12} className="text-teal-400" /> : <X size={12} className="text-red-500" />}
                  <span className={rules.uppercase ? "text-slate-300" : ""}>At least one uppercase letter (A-Z)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {rules.lowercase ? <Check size={12} className="text-teal-400" /> : <X size={12} className="text-red-500" />}
                  <span className={rules.lowercase ? "text-slate-300" : ""}>At least one lowercase letter (a-z)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {rules.number ? <Check size={12} className="text-teal-400" /> : <X size={12} className="text-red-500" />}
                  <span className={rules.number ? "text-slate-300" : ""}>At least one number (0-9)</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {rules.special ? <Check size={12} className="text-teal-400" /> : <X size={12} className="text-red-500" />}
                  <span className={rules.special ? "text-slate-300" : ""}>At least one special character (!@#$ etc.)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isPasswordValid}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-40"
              >
                {loading ? 'Registering...' : 'Create Account'}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link to="/login" className="text-xs text-slate-400 hover:text-brand-400 font-semibold transition">
                Already have an account? Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
