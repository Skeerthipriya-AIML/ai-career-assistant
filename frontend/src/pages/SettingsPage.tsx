import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';
import { Compass, ShieldCheck, Laptop, Trash2, LogOut, Lock, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Sidebar } from '../components/layout/Sidebar';

interface UserSession {
  id: string;
  user_agent: string;
  client_ip: string;
  created_at: string;
  expires_at: string;
}

export const SettingsPage: React.FC = () => {
  const { user, token, logout, deleteAccount } = useAuthStore();
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [deleteConfirm, setDeleteConfirm] = useState<boolean>(false);

  const getSessionIdFromToken = (): string | null => {
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window
          .atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload).sid || null;
    } catch (e) {
      return null;
    }
  };

  const currentSessionId = getSessionIdFromToken();

  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const response = await apiClient.get('/auth/sessions');
      setSessions(response.data);
    } catch (err) {
      console.error('Failed to load active sessions', err);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (sessionId: string) => {
    setActionLoading(true);
    try {
      await apiClient.delete(`/auth/sessions/${sessionId}`);
      if (sessionId === currentSessionId) {
        // If current session is revoked, log out
        await logout();
      } else {
        await fetchSessions();
      }
    } catch (err) {
      console.error('Failed to revoke session', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    setActionLoading(true);
    try {
      await apiClient.post('/auth/logout-all');
      await logout();
    } catch (err) {
      console.error('Failed to logout from all devices', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setActionLoading(true);
    try {
      await deleteAccount();
    } catch (err) {
      console.error('Failed to delete account', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen bg-[#070b13] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#070b13] text-slate-100 font-sans">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto">
        <header className="mb-8 border-b border-slate-800/80 pb-5">
          <h1 className="text-3xl font-extrabold font-outfit tracking-wide text-slate-100 uppercase">Security Settings</h1>
          <p className="text-slate-400 text-xs mt-1">Manage active device sessions, security rules, and account deletion</p>
        </header>

        {/* Active Sessions Panel */}
        <section className="bg-[#0c1324]/80 border border-slate-850/80 rounded-xl p-6 mb-8 backdrop-blur shadow-lg">
          <div className="flex items-center space-x-2.5 mb-5">
            <Laptop className="text-brand-500" size={20} />
            <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Device Tracing & Sessions</h2>
          </div>
          
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            Below are the active devices currently authenticated to your account. You can revoke any session to log out that specific device.
          </p>

          {loadingSessions ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-500 mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                const isCurrent = session.id === currentSessionId;
                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-xl border transition ${
                      isCurrent 
                        ? 'bg-brand-500/5 border-brand-500/30' 
                        : 'bg-slate-900/40 border-slate-850 hover:border-slate-800'
                    }`}
                  >
                    <div className="flex items-start space-x-3.5">
                      <div className={`p-2.5 rounded-lg shrink-0 mt-0.5 ${
                        isCurrent ? 'bg-brand-500/10 text-brand-400' : 'bg-slate-800/50 text-slate-500'
                      }`}>
                        <Laptop size={18} />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-slate-200 flex items-center space-x-2">
                          <span className="truncate max-w-[200px]" title={session.user_agent}>{session.user_agent}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase font-semibold">
                              Current Device
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          IP Address: <span className="font-mono text-slate-450">{session.client_ip}</span> • Authenticated: {new Date(session.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={actionLoading}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition disabled:opacity-40"
                      title="Revoke active token"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                );
              })}

              {sessions.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-500 italic">
                  No active session logs registered.
                </div>
              )}
            </div>
          )}

          {sessions.length > 1 && (
            <button
              onClick={handleLogoutAll}
              disabled={actionLoading}
              className="mt-5 text-xs font-bold text-red-400 hover:text-red-300 flex items-center space-x-1.5 transition disabled:opacity-40"
            >
              <ShieldAlert size={14} />
              <span>Log out from all other devices</span>
            </button>
          )}
        </section>

        {/* Account Deletion Panel */}
        <section className="bg-red-950/5 border border-red-900/15 rounded-xl p-6 shadow-md">
          <div className="flex items-center space-x-2.5 mb-3 text-red-400">
            <Trash2 size={20} />
            <h2 className="text-sm font-bold uppercase tracking-wider">Danger Zone</h2>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed mb-4">
            Once you delete your account, all data, RAG document logs, conversation history, and credentials are permanently purged. This action cannot be undone.
          </p>

          {deleteConfirm ? (
            <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl space-y-4">
              <div className="flex items-start space-x-3 text-red-400 text-xs">
                <AlertTriangle size={18} className="shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <span className="font-bold">Are you absolutely sure?</span> This will clear your resume embeddings, chats, and ATS history across all nodes.
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-650 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow transition disabled:opacity-50"
                >
                  {actionLoading ? 'Deleting Account...' : 'Yes, Delete Permanently'}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 bg-red-950/30 hover:bg-red-900/20 text-red-400 border border-red-900/30 rounded-lg text-xs font-semibold tracking-wide transition"
            >
              Delete My Account
            </button>
          )}
        </section>
      </main>
    </div>
  );
};
