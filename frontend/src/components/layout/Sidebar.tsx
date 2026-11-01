import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Terminal, 
  FileText, 
  Award, 
  ShieldAlert, 
  LogOut, 
  Menu, 
  X,
  Compass,
  User,
  Lock,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useDashboardStore } from '../../store/dashboardStore';
import { ThemeToggle } from './ThemeToggle';

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { isCollapsed, toggleSidebar } = useDashboardStore();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/chatbot', label: 'AI Chatbot (RAG)', icon: MessageSquare },
    { to: '/agent', label: 'AI Agent (Tools)', icon: Terminal },
    { to: '/document', label: 'Doc Assistant', icon: FileText },
    { to: '/coach', label: 'Interview Coach', icon: Award },
    { to: '/profile', label: 'Profile Settings', icon: User },
    { to: '/settings', label: 'Security Logs', icon: Lock },
  ];

  if (user?.role === 'ADMIN') {
    navLinks.push({ to: '/admin', label: 'Admin Telemetry', icon: ShieldAlert });
  }

  const toggleMobileMenu = () => setIsMobileOpen(!isMobileOpen);

  return (
    <>
      {/* Mobile Menu Header */}
      <div className="flex md:hidden items-center justify-between px-4 py-3 bg-[#0d1424] text-white border-b border-slate-800 w-full fixed top-0 left-0 z-40">
        <div className="flex items-center space-x-2">
          <Compass className="text-brand-500 animate-spin-slow" size={24} />
          <span className="font-outfit font-extrabold text-sm tracking-wider uppercase text-slate-100">AI Career Assistant</span>
        </div>
        <button onClick={toggleMobileMenu} className="p-1 rounded bg-slate-800 text-slate-200">
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Main Sidebar Wrapper */}
      <aside 
        className={`bg-[#0d1424] border-r border-slate-800/80 flex flex-col justify-between fixed md:sticky top-0 h-screen z-30 transition-all duration-300 md:translate-x-0 ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-20' : 'md:w-64'}`}
      >
        <div className="flex flex-col mt-16 md:mt-0 flex-1 overflow-y-auto">
          {/* Logo panel */}
          <div className={`p-5 border-b border-slate-800/60 hidden md:flex items-center justify-between ${
            isCollapsed ? 'justify-center' : ''
          }`}>
            <div className="flex items-center space-x-3">
              <Compass className="text-brand-500 glow-brand rounded shrink-0" size={28} />
              {!isCollapsed && (
                <div className="flex flex-col text-left">
                  <span className="font-outfit font-extrabold tracking-wide uppercase text-slate-100 leading-tight">AI CAREER</span>
                  <span className="text-[10px] text-brand-400 font-bold tracking-widest uppercase">Assistant Hub</span>
                </div>
              )}
            </div>
            
            {/* Desktop Collapse Toggle */}
            {!isCollapsed && (
              <button 
                onClick={toggleSidebar} 
                className="p-1 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-100 rounded-lg transition"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>

          {isCollapsed && (
            <div className="hidden md:flex justify-center py-3 border-b border-slate-800/40">
              <button 
                onClick={toggleSidebar} 
                className="p-1 bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-100 rounded-lg transition"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setIsMobileOpen(false)}
                  title={isCollapsed ? link.label : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${
                      isCollapsed ? 'justify-center p-3' : 'px-4 py-3 space-x-3'
                    } ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 font-semibold'
                        : 'text-slate-450 hover:text-slate-100 hover:bg-slate-850'
                    }`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {!isCollapsed && <span className="truncate">{link.label}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer profile area */}
        <div className="p-4 border-t border-slate-800/60 flex flex-col space-y-4 shrink-0 bg-[#0b101c]">
          <div className={`flex items-center justify-between ${isCollapsed ? 'flex-col space-y-3' : ''}`}>
            <div className="flex items-center space-x-3 text-left">
              <img
                src={user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.name}`}
                alt="Avatar"
                className="w-10 h-10 rounded-lg border border-slate-700 bg-slate-800 object-cover shrink-0"
              />
              {!isCollapsed && (
                <div className="flex flex-col max-w-[120px]">
                  <span className="text-xs font-semibold text-slate-100 truncate">{user?.name}</span>
                  <span className="text-[10px] text-slate-500 truncate">{user?.email}</span>
                </div>
              )}
            </div>
            <ThemeToggle />
          </div>

          <button
            onClick={handleLogout}
            className={`flex items-center justify-center space-x-2 w-full py-2.5 rounded-lg text-xs font-semibold text-slate-450 hover:text-white bg-slate-850 hover:bg-red-950/20 border border-slate-800 hover:border-red-900/50 transition-all duration-300`}
            title={isCollapsed ? "Sign Out" : undefined}
          >
            <LogOut size={14} className="shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Screen blur overlay on mobile view */}
      {isMobileOpen && (
        <div 
          onClick={toggleMobileMenu}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-25 md:hidden"
        />
      )}
    </>
  );
};
export default Sidebar;
