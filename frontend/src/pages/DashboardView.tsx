import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../services/api';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Terminal, 
  FileText, 
  Award, 
  CheckCircle, 
  Clock, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  LineChart,
  Layers,
  BookOpen,
  Calendar,
  Compass,
  ArrowUpRight,
  Upload,
  X
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  interface DashboardStats {
    chats_today: number;
    documents_uploaded: number;
    interview_score: number;
    ai_tokens_used: number;
    active_sessions: number;
    weekly_usage: Array<{ day: string; date: string; uploads: number; chats: number; tokens: number }>;
    file_distribution: Array<{ name: string; value: number }>;
    most_used_tools: Array<{ name: string; hits: number }>;
    interview_history: Array<{ id: string; type: string; average_score: number; created_at: string; questions_count: number }>;
  }

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Hidden document upload trigger
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [dashboardUploading, setDashboardUploading] = useState<boolean>(false);

  // ATS Scanner modal trigger
  const [showAtsModal, setShowAtsModal] = useState<boolean>(false);
  const [atsJobDescription, setAtsJobDescription] = useState<string>('');
  const [atsFile, setAtsFile] = useState<File | null>(null);
  const [atsScanning, setAtsScanning] = useState<boolean>(false);
  const [atsResult, setAtsResult] = useState<any>(null);

  const fetchDashboardData = async () => {
    try {
      const res = await apiClient.get('/dashboard/stats');
      setStats(res.data);
    } catch (e) {
      console.error("Dashboard stats fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleDashboardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setDashboardUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);
    try {
      await apiClient.post('/chatbot/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDashboardData();
      alert(`File "${files[0].name}" uploaded and indexed successfully!`);
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "Deduplication/Virus check: Upload failed.");
    } finally {
      setDashboardUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  const handleAtsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atsFile || !atsJobDescription.trim()) return;

    setAtsScanning(true);
    const formData = new FormData();
    formData.append('file', atsFile);
    formData.append('job_description', atsJobDescription);

    try {
      const res = await apiClient.post('/coach/ats-score', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAtsResult(res.data);
      fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      alert("ATS scoring analysis failed. Ensure document formats are valid.");
    } finally {
      setAtsScanning(false);
    }
  };

  const actionsList = [
    { id: 'chat', title: 'New Chat Session', desc: 'Ask career questions to the Knowledge Engine.', icon: MessageSquare, color: 'text-blue-400 border-blue-500/20 bg-blue-500/5' },
    { id: 'upload', title: 'Upload Knowledge Doc', desc: 'Directly ingest resume, JD, or qualifications.', icon: Upload, color: 'text-teal-400 border-teal-500/20 bg-teal-500/5' },
    { id: 'interview', title: 'Start STAR Interview', desc: 'Begin a simulated mock HR coach session.', icon: Award, color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' },
    { id: 'agent', title: 'Open ReAct Agent', desc: 'Interact with autonomous multi-tool agent loop.', icon: Terminal, color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/5' },
    { id: 'ats', title: 'Analyze Resume ATS', desc: 'Score your resume against a Job Description.', icon: FileText, color: 'text-rose-450 border-rose-500/20 bg-rose-500/5' },
  ];

  const handleQuickAction = (id: string) => {
    if (id === 'chat') navigate('/chatbot');
    else if (id === 'upload') uploadInputRef.current?.click();
    else if (id === 'interview') navigate('/coach');
    else if (id === 'agent') navigate('/agent');
    else if (id === 'ats') setShowAtsModal(true);
  };

  const generateChartPaths = () => {
    if (!stats || !stats.weekly_usage || stats.weekly_usage.length === 0) {
      return {
        linePath: "M 0 110 L 83 90 L 166 120 L 249 70 L 332 80 L 415 40 L 500 20",
        areaPath: "M 0 110 L 83 90 L 166 120 L 249 70 L 332 80 L 415 40 L 500 20 L 500 150 L 0 150 Z"
      };
    }
    const points = stats.weekly_usage.map((u, i) => {
      const x = i * (500 / (stats.weekly_usage.length - 1));
      const maxVal = Math.max(...stats.weekly_usage.map(item => item.tokens), 100);
      const y = 150 - 20 - ((u.tokens / maxVal) * 110);
      return { x, y };
    });
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
    const areaPath = `${linePath} L 500 150 L 0 150 Z`;
    return { linePath, areaPath };
  };

  const { linePath, areaPath } = generateChartPaths();

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto h-screen max-w-7xl mx-auto text-slate-100 font-sans">
      
      {/* Welcome Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-[#0c1324]/85 border border-slate-800/80 rounded-2xl p-6 md:p-8 overflow-hidden glow-brand backdrop-blur-xl"
      >
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-500/5 rounded-full blur-[100px]"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2.5 text-left">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 font-bold text-[10px] uppercase tracking-wider">
              <Sparkles size={12} />
              <span>{user?.role || 'USER'} Profile Loaded</span>
            </div>
            <h2 className="font-outfit font-extrabold text-3xl text-slate-100">
              Welcome back, {user?.name || 'Engineer'}
            </h2>
            <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
              Target goal set to <strong className="text-brand-400">{user?.career_goal || 'Software Engineer'}</strong>. 
              {user?.preferred_companies && user.preferred_companies.length > 0 && (
                <span> Targeting roles at <strong className="text-teal-400">{user.preferred_companies.join(', ')}</strong>.</span>
              )}
            </p>
          </div>
          
          {/* Target Goal Progress Gauge */}
          <div className="flex items-center space-x-4 bg-slate-900/60 border border-slate-800 rounded-xl p-4 shrink-0">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Goal Matching Score</span>
              <span className="text-2xl font-black text-teal-400 mt-0.5">85 / 100</span>
            </div>
            <div className="p-2.5 bg-teal-500/10 rounded-lg text-teal-400">
              <TrendingUp size={22} className="animate-pulse" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Dynamic Metrics Widgets Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Conversations Today', val: stats ? `${stats.chats_today} chats` : '0 chats', icon: MessageSquare, col: 'text-blue-400 bg-blue-500/10' },
          { label: 'Documents Index', val: stats ? `${stats.documents_uploaded} files` : '0 files', icon: FileText, col: 'text-teal-400 bg-teal-500/10' },
          { label: 'STAR Prep Score', val: stats ? `${stats.interview_score}% avg` : '0% avg', icon: Award, col: 'text-amber-400 bg-amber-500/10' },
          { label: 'AI Tokens Logged', val: stats ? `${(stats.ai_tokens_used / 1000).toFixed(1)}k tkn` : '0k tkn', icon: LineChart, col: 'text-indigo-400 bg-indigo-500/10' },
        ].map((w, idx) => (
          <motion.div
            key={w.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-[#0c1324]/60 border border-slate-850 rounded-xl p-4 flex items-center space-x-4 backdrop-blur-sm"
          >
            <div className={`p-2.5 rounded-lg shrink-0 ${w.col}`}>
              <w.icon size={18} />
            </div>
            <div className="text-left truncate">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">{w.label}</span>
              <h4 className="text-base font-bold mt-0.5 text-slate-200">{w.val}</h4>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart and Quick Start split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Graph Area Chart */}
        <div className="lg:col-span-2 bg-[#0c1324]/80 border border-slate-850 rounded-2xl p-6 backdrop-blur flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="text-left">
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">AI API Token Usage</h3>
              <p className="text-[10px] text-slate-500">Estimates of daily query token processing metrics</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[9px] bg-brand-500/10 text-brand-400 border border-brand-500/20 font-bold uppercase">Weekly view</span>
          </div>

          {/* SVG Line Graph */}
          <div className="h-44 w-full mt-2 relative">
            <svg viewBox="0 0 500 150" className="w-full h-full text-brand-500" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(99, 102, 241, 0.25)" />
                  <stop offset="100%" stopColor="rgba(99, 102, 241, 0)" />
                </linearGradient>
              </defs>
              {/* Grid Lines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="0" y1="75" x2="500" y2="75" stroke="#1e293b" strokeDasharray="3,3" />
              <line x1="0" y1="120" x2="500" y2="120" stroke="#1e293b" strokeDasharray="3,3" />
              
              {/* Curve area fill */}
              <path 
                d={areaPath} 
                fill="url(#chartGradient)"
              />
              {/* Curve outline */}
              <path 
                d={linePath} 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="2.5" 
              />
            </svg>
            <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1 text-[9px] text-slate-550 font-mono font-bold uppercase tracking-wider">
              {stats?.weekly_usage ? (
                stats.weekly_usage.map((u) => <span key={u.day}>{u.day}</span>)
              ) : (
                <>
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-[#0c1324]/80 border border-slate-850 rounded-2xl p-6 backdrop-blur flex flex-col justify-between">
          <div className="text-left mb-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Quick Actions</h3>
            <p className="text-[10px] text-slate-500">Jump directly into target assistant components</p>
          </div>

          <div className="space-y-3">
            <input 
              type="file" 
              ref={uploadInputRef} 
              onChange={handleDashboardUpload} 
              className="hidden" 
              accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.pptx"
            />
            {dashboardUploading && (
              <div className="p-3 bg-brand-950/20 border border-brand-900/50 rounded-lg flex items-center space-x-2.5 animate-pulse text-brand-400 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
                <span>Ingesting Knowledge Base documents...</span>
              </div>
            )}
            {actionsList.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  onClick={() => handleQuickAction(card.id)}
                  className="w-full flex items-center justify-between p-3.5 bg-slate-900/40 hover:bg-slate-900 border border-slate-850/80 hover:border-slate-700/60 rounded-xl transition text-left group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg border ${card.color} shrink-0`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{card.title}</h4>
                      <p className="text-[10px] text-slate-450 leading-snug mt-0.5">{card.desc}</p>
                    </div>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-500 group-hover:text-slate-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* History Split and Goal Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Activity Logs Timeline */}
        <div className="lg:col-span-2 bg-[#0c1324]/80 border border-slate-850 rounded-2xl p-6 backdrop-blur text-left">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-5 flex items-center space-x-2">
            <Clock size={16} className="text-brand-400" />
            <span>Activity Logs Timeline</span>
          </h3>

          <div className="relative border-l border-slate-800 ml-3.5 pl-6 space-y-6 text-xs text-slate-350">
            {stats?.interview_history && stats.interview_history.length > 0 ? (
              stats.interview_history.map((h) => (
                <div key={h.id} className="relative">
                  <span className="absolute -left-9 top-0.5 p-1 bg-teal-950 border border-teal-500/40 text-teal-400 rounded-full shrink-0">
                    <CheckCircle size={10} />
                  </span>
                  <p className="font-semibold">{h.type.toUpperCase()} interview completed</p>
                  <span className="text-[9px] text-slate-500">
                    Score achieved: <strong className="text-teal-400">{h.average_score}/100</strong> on {new Date(h.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="relative">
                <span className="absolute -left-9 top-0.5 p-1 bg-teal-950 border border-teal-500/40 text-teal-400 rounded-full shrink-0">
                  <CheckCircle size={10} />
                </span>
                <p className="font-semibold">Profile details configured successfully</p>
                <span className="text-[9px] text-slate-500">Target Role set to {user?.career_goal || 'Software Engineer'}</span>
              </div>
            )}
            
            <div className="relative">
              <span className="absolute -left-9 top-0.5 p-1 bg-brand-950 border border-brand-500/40 text-brand-400 rounded-full shrink-0">
                <CheckCircle size={10} />
              </span>
              <p className="font-semibold">Email verified security audit token</p>
              <span className="text-[9px] text-slate-500">Active status granted in user registries</span>
            </div>
          </div>
        </div>

        {/* Skills Goal Checklist */}
        <div className="bg-[#0c1324]/80 border border-slate-850 rounded-2xl p-6 backdrop-blur text-left">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <BookOpen size={16} className="text-teal-400" />
            <span>Skills Checklist Goals</span>
          </h3>
          <p className="text-[10px] text-slate-450 leading-relaxed mb-4">
            Required skills target map for your role:
          </p>

          <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
            {user?.skills && user.skills.length > 0 ? (
              user.skills.map((skill, idx) => (
                <div key={skill} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/40 border border-slate-850">
                  <span className="text-xs font-semibold text-slate-350">{skill}</span>
                  <span className="text-[9px] text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20 font-bold uppercase">Active</span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-xs text-slate-500 italic">
                No skills tags loaded. Update in Profile page.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ATS Compatibility Scanner Modal */}
      {showAtsModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0b1222] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col shadow-2xl text-slate-200"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#0d1527]">
              <div className="flex items-center space-x-2 text-rose-450">
                <FileText size={18} />
                <h3 className="font-outfit font-extrabold text-sm uppercase">ATS Resume Intelligent Scoring</h3>
              </div>
              <button 
                onClick={() => { setShowAtsModal(false); setAtsResult(null); setAtsFile(null); setAtsJobDescription(''); }}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 overflow-y-auto space-y-6 text-left">
              {!atsResult ? (
                <form onSubmit={handleAtsSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1. Upload Resume PDF/DOCX</label>
                    <input 
                      type="file" 
                      accept=".pdf,.docx,.doc"
                      required
                      onChange={(e) => setAtsFile(e.target.files?.[0] || null)}
                      className="w-full text-xs text-slate-350 bg-slate-900 border border-slate-800 rounded-lg p-2.5 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-rose-500/10 file:text-rose-400 hover:file:bg-rose-500/20 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">2. Paste Target Job Description (JD)</label>
                    <textarea 
                      required
                      rows={5}
                      value={atsJobDescription}
                      onChange={(e) => setAtsJobDescription(e.target.value)}
                      placeholder="Paste key responsibilities, requirements, and tech stack details here..."
                      className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs p-3 rounded-lg focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={atsScanning}
                    className="w-full py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-lg shadow-rose-500/10 cursor-pointer disabled:opacity-50"
                  >
                    {atsScanning ? "Scoring resume compatibility..." : "Run ATS Scan"}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Matching score display */}
                  <div className="flex items-center space-x-6 bg-slate-900/60 border border-slate-850 p-4 rounded-xl">
                    <div className="w-16 h-16 rounded-full border-4 border-rose-500 flex items-center justify-center shrink-0">
                      <span className="font-extrabold text-lg text-slate-100">{atsResult.overall_score}%</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-200">ATS Alignment Score</h4>
                      <p className="text-[10px] text-slate-450 leading-relaxed mt-0.5">
                        Your resume matches {atsResult.overall_score}% of the target requirements. Formatting score: {atsResult.formatting_score}/100.
                      </p>
                    </div>
                  </div>

                  {/* Skills lists */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-[#0b1222]/50 border border-slate-850 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Matched Keywords</span>
                      <div className="flex flex-wrap gap-1.5">
                        {atsResult.matched_skills.map((skill: string) => (
                          <span key={skill} className="px-2 py-0.5 bg-teal-500/10 text-teal-400 rounded text-[9px] font-semibold border border-teal-500/25">
                            {skill}
                          </span>
                        ))}
                        {atsResult.matched_skills.length === 0 && <span className="text-slate-500 italic text-[10px]">None identified.</span>}
                      </div>
                    </div>
                    <div className="bg-[#0b1222]/50 border border-slate-850 p-4 rounded-xl space-y-2">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Missing Keywords</span>
                      <div className="flex flex-wrap gap-1.5">
                        {atsResult.missing_skills.map((skill: string) => (
                          <span key={skill} className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded text-[9px] font-semibold border border-rose-500/25">
                            {skill}
                          </span>
                        ))}
                        {atsResult.missing_skills.length === 0 && <span className="text-slate-500 italic text-[10px]">None identified.</span>}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Actionable Enhancements</span>
                    <ul className="space-y-2 text-xs text-slate-350 list-disc list-inside">
                      {atsResult.suggestions.map((s: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{s}</li>
                      ))}
                    </ul>
                  </div>

                  <button
                    onClick={() => { setAtsResult(null); setAtsFile(null); setAtsJobDescription(''); }}
                    className="w-full py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Scan Another Resume
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
export default DashboardView;
