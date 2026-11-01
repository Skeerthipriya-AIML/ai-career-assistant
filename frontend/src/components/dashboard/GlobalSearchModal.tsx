import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MessageSquare, FileText, Award, AlertTriangle, FileCode } from 'lucide-react';
import { apiClient } from '../../services/api';

interface SearchResult {
  id: string;
  title: string;
  category: 'chat' | 'document' | 'interview';
  subtitle?: string;
  to: string;
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [onClose]);

  // Debounced search query lookup
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        // Query backend indexes or mock search matches
        const [docsRes, coachRes] = await Promise.all([
          apiClient.get('/chatbot/documents').catch(() => ({ data: [] })),
          apiClient.get('/coach/sessions').catch(() => ({ data: [] }))
        ]);

        const docs: SearchResult[] = docsRes.data
          .filter((d: any) => d.filename.toLowerCase().includes(query.toLowerCase()))
          .map((d: any) => ({
            id: d.id,
            title: d.filename,
            category: 'document',
            subtitle: `${d.chunks_count || 0} index chunks`,
            to: '/document'
          }));

        const interviews: SearchResult[] = coachRes.data
          .filter((i: any) => i.type.toLowerCase().includes(query.toLowerCase()) || i.company?.toLowerCase().includes(query.toLowerCase()))
          .map((i: any) => ({
            id: i.id,
            title: `${i.type.toUpperCase()} Prep`,
            category: 'interview',
            subtitle: `Target corporation: ${i.company || 'General'}`,
            to: '/coach'
          }));

        // General fallback simulated chats
        const mockChats: SearchResult[] = (
          [
            { id: '1', title: 'Resume Keyword Optimization Chat', category: 'chat', subtitle: 'Target role matching suggestions', to: '/chatbot' },
            { id: '2', title: 'FastAPI and Docker Deployments Q&A', category: 'chat', subtitle: 'Developer portfolio deployments logs', to: '/chatbot' }
          ] as SearchResult[]
        ).filter(c => c.title.toLowerCase().includes(query.toLowerCase()));

        setResults([...docs, ...interviews, ...mockChats]);
      } catch (err) {
        console.error('Global search error', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleResultClick = (to: string) => {
    onClose();
    navigate(to);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-20 z-50 animate-fadeIn text-slate-100">
      <div className="w-full max-w-xl bg-[#0c1324] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
        {/* Search Input Bar */}
        <div className="flex items-center space-x-3.5 px-4 py-3.5 border-b border-slate-800">
          <Search size={18} className="text-slate-450 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type query (e.g. resume, technical, python)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-200 focus:outline-none placeholder-slate-500 font-sans"
          />
          <button onClick={onClose} className="p-1 hover:bg-slate-850 rounded text-slate-400 hover:text-slate-200 transition">
            <X size={16} />
          </button>
        </div>

        {/* Search Results Display Area */}
        <div className="max-h-96 overflow-y-auto p-2">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-500 mx-auto"></div>
              <p className="text-[10px] text-slate-550 mt-2">Crawling databases indices...</p>
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((item) => (
                <button
                  key={`${item.category}-${item.id}`}
                  onClick={() => handleResultClick(item.to)}
                  className="w-full flex items-center space-x-3.5 p-3 hover:bg-slate-900 rounded-xl transition text-left group"
                >
                  <div className="p-2 bg-slate-950/60 text-slate-400 group-hover:text-brand-400 border border-slate-850/60 rounded-lg shrink-0">
                    {item.category === 'chat' && <MessageSquare size={16} />}
                    {item.category === 'document' && <FileText size={16} />}
                    {item.category === 'interview' && <Award size={16} />}
                  </div>
                  <div className="flex-1">
                    <h5 className="text-xs font-semibold text-slate-200 truncate">{item.title}</h5>
                    {item.subtitle && <span className="text-[9px] text-slate-500 truncate block mt-0.5">{item.subtitle}</span>}
                  </div>
                  <span className="text-[9px] bg-slate-950 px-2 py-0.5 border border-slate-850 rounded uppercase text-slate-450 font-bold shrink-0">
                    {item.category}
                  </span>
                </button>
              ))}

              {query && results.length === 0 && (
                <div className="text-center py-8 space-y-2 text-slate-500 text-xs">
                  <AlertTriangle size={18} className="mx-auto text-amber-500/60" />
                  <p>No matches located for query: "{query}"</p>
                </div>
              )}

              {!query && (
                <div className="p-4 text-center text-[10px] text-slate-500 space-y-1 font-sans">
                  <p className="font-bold text-slate-400 uppercase tracking-widest mb-1.5">Search Shortcuts</p>
                  <div className="flex items-center justify-center space-x-4">
                    <span>Press <kbd className="bg-slate-950 border border-slate-850 px-1 rounded font-mono">Esc</kbd> to exit</span>
                    <span>Use <kbd className="bg-slate-950 border border-slate-850 px-1 rounded font-mono">Ctrl+K</kbd> globally</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default GlobalSearchModal;
