import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { Link } from 'react-router-dom';
import { Compass, Mail, Check, AlertTriangle, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const { forgotPassword, error, setError, loading } = useAuthStore();
  const [email, setEmail] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      // Error handled in store
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
          <h1 className="font-outfit font-extrabold text-2xl tracking-wide uppercase text-slate-100">RESET PASSWORD</h1>
          <p className="text-slate-400 text-xs text-center mt-1">Retrieve your account access credentials</p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <Check size={32} />
            </div>
            <h2 className="text-slate-200 font-bold text-lg">Reset Mail Dispatched!</h2>
            <p className="text-slate-400 text-xs leading-relaxed text-slate-300">
              If an account is associated with <strong>{email}</strong>, a secure password reset link has been sent to your inbox.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 text-xs text-brand-400 hover:text-brand-500 font-semibold transition"
            >
              <ArrowLeft size={14} />
              <span>Back to Login</span>
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
                <Mail className="absolute left-3 top-3 text-slate-500" size={16} />
                <input
                  type="email"
                  placeholder="Registered Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-40"
              >
                {loading ? 'Processing...' : 'Send Reset Link'}
              </button>
            </form>

            <div className="text-center mt-6">
              <Link to="/login" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-brand-400 font-semibold transition">
                <ArrowLeft size={14} />
                <span>Back to Login</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
