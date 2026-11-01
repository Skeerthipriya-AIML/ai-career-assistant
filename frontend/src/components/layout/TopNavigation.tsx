import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Search, Settings, User, LogOut, ChevronDown, Award, FilePlus, Play, Sparkles } from 'lucide-react';
import { apiClient } from '../../services/api';

interface TopNavigationProps {
  onSearchClick: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({ onSearchClick }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showActions, setShowActions] = useState<boolean>(false);

  interface Notification {
    id: string;
    text: string;
    type: string;
    is_read: boolean;
    created_at: string;
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
      const unread = res.data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (e) {
      console.error("Error fetching notifications:", e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await apiClient.post(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiClient.post('/notifications/read-all');
      fetchNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-[#0d1424]/85 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20 text-slate-100">
      {/* Left side: Global Search Box trigger */}
      <div className="flex-1 max-w-md hidden sm:block">
        <button
          onClick={onSearchClick}
          className="w-full flex items-center space-x-3 px-3.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-850 hover:border-slate-700 text-slate-450 hover:text-slate-300 text-xs transition text-left group"
        >
          <Search size={14} className="group-hover:text-brand-400 transition" />
          <span>Search conversations, PDFs, coach sessions...</span>
          <kbd className="ml-auto bg-slate-800 text-[10px] px-1.5 py-0.5 rounded font-mono border border-slate-750">Ctrl+K</kbd>
        </button>
      </div>

      <div className="flex items-center space-x-2 sm:hidden">
        <button
          onClick={onSearchClick}
          className="p-2 bg-slate-900 rounded-lg text-slate-400 hover:text-slate-200 border border-slate-850"
        >
          <Search size={16} />
        </button>
      </div>

      {/* Right Side Controls */}
      <div className="flex items-center space-x-4 relative">
        {/* Quick Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowActions(!showActions); setShowNotifications(false); setShowProfileMenu(false); }}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 hover:text-brand-350 hover:bg-brand-500/15 rounded-lg text-xs font-semibold tracking-wide transition"
          >
            <Sparkles size={14} />
            <span>Quick Start</span>
            <ChevronDown size={12} />
          </button>

          {showActions && (
            <div className="absolute right-0 mt-2.5 w-52 bg-[#0c1324] border border-slate-800 rounded-xl py-2 shadow-2xl z-50 animate-fadeIn">
              <Link
                to="/document"
                onClick={() => setShowActions(false)}
                className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-850 transition"
              >
                <FilePlus size={14} className="text-teal-400" />
                <span>Upload PDF Resume</span>
              </Link>
              <Link
                to="/coach"
                onClick={() => setShowActions(false)}
                className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-850 transition"
              >
                <Play size={14} className="text-amber-400" />
                <span>Start Mock Interview</span>
              </Link>
              <Link
                to="/agent"
                onClick={() => setShowActions(false)}
                className="flex items-center space-x-2.5 px-4 py-2.5 text-xs text-slate-300 hover:text-slate-100 hover:bg-slate-850 transition"
              >
                <Award size={14} className="text-indigo-400" />
                <span>Run Agent Execution</span>
              </Link>
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowActions(false); setShowProfileMenu(false); }}
            className="p-2 bg-slate-900/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition relative"
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-brand-500 rounded-full animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2.5 w-80 bg-[#0c1324] border border-slate-800 rounded-xl p-4 shadow-2xl z-50 text-left animate-fadeIn">
              <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Recent Notifications</h4>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead} 
                    className="text-[10px] text-brand-400 hover:text-brand-350 font-bold uppercase tracking-wide cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <span className="text-[10px] text-slate-500 block text-center py-4">No notifications yet</span>
                ) : (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                      className={`text-xs p-2 rounded transition cursor-pointer ${
                        notif.is_read 
                          ? 'bg-transparent text-slate-400 hover:bg-slate-900/20' 
                          : 'bg-brand-500/5 hover:bg-brand-500/10 border-l-2 border-brand-500 pl-1.5'
                      }`}
                    >
                      <p className="leading-snug text-slate-200 font-medium">{notif.text}</p>
                      <span className="text-[9px] text-slate-500 block font-semibold mt-1">
                        {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); setShowActions(false); }}
            className="flex items-center space-x-2.5 focus:outline-none p-1 rounded-lg hover:bg-slate-900 transition"
          >
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
              alt="Avatar"
              className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700 shrink-0"
            />
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2.5 w-48 bg-[#0c1324] border border-slate-800 rounded-xl py-1.5 shadow-2xl z-50 animate-fadeIn">
              <Link
                to="/profile"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center space-x-2 px-4 py-2.5 text-xs text-slate-350 hover:text-slate-100 hover:bg-slate-850 transition"
              >
                <User size={14} />
                <span>My Profile</span>
              </Link>
              <Link
                to="/settings"
                onClick={() => setShowProfileMenu(false)}
                className="flex items-center space-x-2 px-4 py-2.5 text-xs text-slate-350 hover:text-slate-100 hover:bg-slate-850 transition"
              >
                <Settings size={14} />
                <span>Security Logs</span>
              </Link>
              <div className="border-t border-slate-800 my-1"></div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 w-full px-4 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/10 transition text-left"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
