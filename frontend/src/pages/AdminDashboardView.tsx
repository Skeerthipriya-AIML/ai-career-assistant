import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { 
  ShieldAlert, 
  Users, 
  Database, 
  Activity, 
  BarChart3, 
  Sparkles, 
  CheckCircle,
  Clock,
  MessageSquare,
  Server,
  ToggleLeft,
  ToggleRight,
  ListFilter,
  Eye,
  Info
} from 'lucide-react';

interface Metric {
  total_users: number;
  total_documents: number;
  total_tokens_consumed: number;
  average_latency_ms: number;
  token_usage_over_time: Array<{ date: string; tokens: number }>;
  file_distribution: Array<{ name: string; value: number }>;
  module_hits: Array<{ name: string; hits: number }>;
  recent_feedback_reports: Array<{ id: string; user: string; rating: string; comment: string }>;
}

export const AdminDashboardView: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/metrics');
      setMetrics(res.data);
      
      const logsRes = await apiClient.get('/admin/audit-logs');
      setAuditLogs(logsRes.data || []);
      
      const healthRes = await apiClient.get('/admin/health');
      setHealthStatus(healthRes.data);
      
      const featuresRes = await apiClient.get('/features');
      setFeatureFlags(featuresRes.data || {});
    } catch (e) {
      console.error("Admin telemetry fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFeature = async (name: string, currentVal: boolean) => {
    try {
      await apiClient.post(`/features/${name}?enabled=${!currentVal}`);
      setFeatureFlags(prev => ({ ...prev, [name]: !currentVal }));
    } catch (e) {
      console.error("Feature toggle failure: ", e);
      alert("Failed to update feature flag.");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 h-screen bg-[#080b11]">
        <div className="flex flex-col items-center space-y-4">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
          <span className="text-xs font-mono text-slate-400">Retrieving system telemetry metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8 overflow-y-auto h-screen max-w-7xl mx-auto bg-[#080b11] text-slate-200 select-none">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2.5">
          <ShieldAlert className="text-red-500 animate-pulse" size={24} />
          <div>
            <h2 className="font-outfit font-extrabold text-xl text-slate-100">
              Admin Telemetry Portal
            </h2>
            <p className="text-xs text-slate-450">
              Secure monitor tracking model quotas, token budgets, server health, and security audit logs.
            </p>
          </div>
        </div>
        
        <button
          onClick={fetchMetrics}
          className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
        >
          Refresh Portal
        </button>
      </div>

      {/* Top Level Summary Stats */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <div className="glass-card rounded-xl p-5 flex items-center space-x-4">
            <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 shrink-0 border border-blue-900/30">
              <Users size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Active Users</span>
              <h4 className="text-lg font-bold text-slate-200">{metrics.total_users} Users</h4>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center space-x-4">
            <div className="p-3 bg-teal-500/10 rounded-lg text-teal-400 shrink-0 border border-teal-900/30">
              <Database size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Processed Files</span>
              <h4 className="text-lg font-bold text-slate-200">{metrics.total_documents} Files</h4>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center space-x-4">
            <div className="p-3 bg-purple-500/10 rounded-lg text-purple-400 shrink-0 border border-purple-900/30">
              <Activity size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Token budget hits</span>
              <h4 className="text-lg font-bold text-slate-200">{metrics.total_tokens_consumed.toLocaleString()} Tokens</h4>
            </div>
          </div>

          <div className="glass-card rounded-xl p-5 flex items-center space-x-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-400 shrink-0 border border-amber-900/30">
              <Clock size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Avg Latency</span>
              <h4 className="text-lg font-bold text-slate-200">{metrics.average_latency_ms} ms</h4>
            </div>
          </div>
        </div>
      )}

      {/* Middle row: Health checks + Feature Flags */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Server & DB Connection Health */}
        {healthStatus && (
          <div className="lg:col-span-1 glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
              <Server size={16} className="text-teal-400" />
              <span className="text-xs uppercase tracking-wider font-bold">System Health Monitor</span>
            </div>
            
            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-900">
                <span className="text-slate-450">Active Status</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  healthStatus.status === 'healthy' ? 'bg-teal-950/20 text-teal-400 border border-teal-900/40' : 'bg-red-950/20 text-red-400 border border-red-900/40'
                }`}>{healthStatus.status}</span>
              </div>
              
              <div className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-900">
                <span className="text-slate-450">MongoDB Connection</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  healthStatus.database === 'connected' ? 'bg-teal-950/20 text-teal-400 border border-teal-900/40' : 'bg-red-950/20 text-red-400 border border-red-900/40'
                }`}>{healthStatus.database}</span>
              </div>

              <div className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-900">
                <span className="text-slate-450">FastAPI API Service</span>
                <span className="px-2 py-0.5 bg-blue-950/20 text-blue-400 border border-blue-900/40 rounded text-[10px] font-bold uppercase">
                  {healthStatus.api_service}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Feature Flags Configuration Controller */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
            <ToggleRight size={16} className="text-brand-400" />
            <span className="text-xs uppercase tracking-wider font-bold">Feature Flags Management</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(featureFlags).length === 0 ? (
              <span className="text-xs text-slate-500 italic">No feature flags registered.</span>
            ) : (
              Object.entries(featureFlags).map(([flag, enabled]) => (
                <div key={flag} className="flex items-center justify-between bg-slate-950 p-3 rounded border border-slate-900">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold capitalize text-slate-200">{flag.replace(/_/g, ' ')}</span>
                    <span className="text-[9px] text-slate-500">Live dynamic gateway control</span>
                  </div>
                  
                  <button
                    onClick={() => handleToggleFeature(flag, enabled)}
                    className="focus:outline-none"
                  >
                    {enabled ? (
                      <ToggleRight className="text-brand-500" size={32} />
                    ) : (
                      <ToggleLeft className="text-slate-600" size={32} />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Observability Graphs Row */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
              <BarChart3 size={16} className="text-brand-400" />
              <span className="text-xs uppercase tracking-wider font-bold">Daily Token Consumption Stats</span>
            </div>
            <div className="space-y-3">
              {metrics.token_usage_over_time.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 w-16">{item.date}</span>
                  <div className="flex-1 mx-4 bg-slate-850 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand-500 h-full rounded-full" 
                      style={{ width: `${Math.min((item.tokens / 35000) * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-slate-300 w-24 text-right">{item.tokens.toLocaleString()} tokens</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1 glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
              <Sparkles size={16} className="text-teal-400" />
              <span className="text-xs uppercase tracking-wider font-bold">Active Module hits</span>
            </div>
            <div className="space-y-4">
              {metrics.module_hits.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs">
                  <span className="text-slate-350">{item.name}</span>
                  <span className="px-2 py-0.5 bg-slate-950 border border-slate-900 rounded text-teal-400 font-mono font-bold">
                    {item.hits} queries
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* System Audit Logs Viewer Table */}
      <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
          <ListFilter size={16} className="text-brand-400" />
          <span className="text-xs uppercase tracking-wider font-bold">Security Audit Log Event Trace</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-500">
                <th className="py-2.5">Timestamp</th>
                <th className="py-2.5">User Profile</th>
                <th className="py-2.5">Action Event</th>
                <th className="py-2.5">Client IP</th>
                <th className="py-2.5 text-right">Raw details</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500 italic">No audit log records found.</td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="border-b border-slate-850 hover:bg-slate-900/40 text-slate-300">
                      <td className="py-2.5 font-mono text-[10px] text-slate-450">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-2.5 font-semibold">{log.email || 'Anonymous'}</td>
                      <td className="py-2.5">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-semibold text-[10px] text-brand-400">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400 font-mono text-[10.5px]">{log.client_ip}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                          className="text-teal-400 hover:text-teal-300 flex items-center space-x-1 ml-auto text-[10.5px]"
                        >
                          <Eye size={12} />
                          <span>{expandedLogId === log.id ? 'Close' : 'View'}</span>
                        </button>
                      </td>
                    </tr>
                    
                    {expandedLogId === log.id && (
                      <tr className="bg-slate-950 border-b border-slate-850">
                        <td colSpan={5} className="p-4">
                          <div className="text-[10px] leading-relaxed text-slate-400 bg-slate-900 p-3 rounded border border-slate-850 space-y-2 select-text">
                            <div className="flex justify-between items-center text-slate-500 pb-1.5 border-b border-slate-950">
                              <span>User agent: <span className="font-mono text-slate-400">{log.user_agent}</span></span>
                            </div>
                            <pre className="font-mono whitespace-pre-wrap leading-normal">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User ratings and feedback logs */}
      {metrics && (
        <div className="glass-panel rounded-xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-850 pb-2">
            <MessageSquare size={16} className="text-brand-400" />
            <span className="text-xs uppercase tracking-wider font-bold">Recent developer ratings and logs</span>
          </div>
          <div className="space-y-3">
            {metrics.recent_feedback_reports.map((report) => (
              <div key={report.id} className="p-3 bg-[#05080f] rounded border border-slate-850 text-xs flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <span className="font-bold text-slate-300">{report.user}</span>
                  <p className="text-slate-400 leading-relaxed italic">"{report.comment}"</p>
                </div>
                <span className="px-2.5 py-0.5 bg-brand-500/10 rounded border border-brand-500/20 text-brand-400 font-mono font-semibold select-none">
                  {report.rating}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
