import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Compass, CheckCircle, ShieldAlert, AlertTriangle, ArrowRight } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const { verifyEmail, error, setError, loading } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlToken = searchParams.get('token') || '';

  const [token, setToken] = useState<string>(urlToken);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    setError(null);
    if (urlToken) {
      // Auto-trigger if token is in URL
      handleVerification(urlToken);
    }
  }, [urlToken, setError]);

  const handleVerification = async (verificationToken: string) => {
    if (!verificationToken) return;
    setError(null);
    try {
      await verifyEmail(verificationToken);
      setSuccess(true);
    } catch (err) {
      // Handled in store
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerification(token);
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
          <h1 className="font-outfit font-extrabold text-2xl tracking-wide uppercase text-slate-100">VERIFY REGISTRATION</h1>
          <p className="text-slate-400 text-xs text-center mt-1">Activate your AI Career Assistant account</p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-slate-200 font-bold text-lg">Email Verified!</h2>
            <p className="text-slate-400 text-xs leading-relaxed text-slate-300">
              Thank you! Your email has been validated successfully. You can now login.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center space-x-2 px-6 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold tracking-wide transition shadow"
            >
              <span>Continue to Login</span>
              <ArrowRight size={14} />
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

            {urlToken ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto"></div>
                <p className="text-slate-400 text-xs mt-4">Verifying security token. Please wait...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="text-xs text-slate-400 leading-relaxed mb-2">
                  Please copy and paste the verification code token from your registration console welcome log to activate your account.
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Verification Token Code"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-800 focus:border-brand-500 text-slate-200 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500 transition text-center font-mono tracking-wider"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-2.5 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition disabled:opacity-40"
                >
                  {loading ? 'Submitting...' : 'Verify Token'}
                </button>
              </form>
            )}

            <div className="text-center mt-6">
              <Link to="/login" className="text-xs text-slate-400 hover:text-brand-400 font-semibold transition">
                Return to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
