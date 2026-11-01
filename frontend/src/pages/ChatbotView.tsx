import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '../services/api';
import { 
  Send, 
  Upload, 
  FileText, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Compass, 
  MessageSquare,
  Sparkles,
  Link2,
  CheckCircle,
  HelpCircle,
  Copy,
  Check,
  RotateCcw,
  Download,
  Square,
  Edit2,
  Search,
  X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Citation {
  filename: string;
  page?: number;
  content: string;
  confidence: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  query_rewrite?: string;
  metrics?: {
    rewrite_latency_ms: number;
    embedding_latency_ms: number;
    retrieval_latency_ms: number;
    reranking_latency_ms: number;
    generation_latency_ms: number;
    total_latency_ms: number;
  };
}

interface Document {
  id: string;
  filename: string;
  filetype: string;
  chunks_count: number;
}

interface ChatSession {
  id: string;
  name: string;
}

export const ChatbotView: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [openCitationsIndex, setOpenCitationsIndex] = useState<number | null>(null);
  const [streamStatus, setStreamStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [citationSidebarOpen, setCitationSidebarOpen] = useState<boolean>(false);
  const [selectedCitations, setSelectedCitations] = useState<Citation[]>([]);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastPromptRef = useRef<string>('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSessions();
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (activeSession) {
      fetchSessionHistory(activeSession);
    } else {
      setMessages([]);
    }
  }, [activeSession]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchSessions = async () => {
    try {
      const res = await apiClient.get('/chatbot/history');
      setSessions(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await apiClient.get('/chatbot/documents');
      setDocuments(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSessionHistory = async (id: string) => {
    try {
      const res = await apiClient.get(`/chatbot/history/${id}`);
      setMessages(res.data.messages || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      await apiClient.post('/chatbot/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchDocuments();
    } catch (err) {
      alert("Failed to upload/index document. Verify file formats.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm("Remove document index from vector space?")) return;
    try {
      await apiClient.delete(`/chatbot/documents/${id}`);
      fetchDocuments();
      if (selectedDocId === id) setSelectedDocId('');
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (e: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = overridePrompt || prompt;
    if (!promptToSend.trim() || loading) return;

    lastPromptRef.current = promptToSend;

    const userMessage: Message = {
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toISOString()
    };

    if (!overridePrompt) {
      setMessages((prev) => [...prev, userMessage]);
      setPrompt('');
    }
    setLoading(true);
    setStreamStatus('Initializing search pipelines...');

    const formData = new FormData();
    formData.append('prompt', promptToSend);
    if (activeSession) formData.append('session_id', activeSession);
    if (selectedDocId) formData.append('document_id', selectedDocId);

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/chatbot/chat`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Chat query failed.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream reader not supported.");

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          citations: []
        }
      ]);

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === 'retrieval_started') {
              setStreamStatus('Searching knowledge files...');
            } else if (parsed.type === 'documents_found') {
              const docs = parsed.documents;
              if (docs && docs.length > 0) {
                setStreamStatus(`Context retrieved from: ${docs.join(', ')}`);
              } else {
                setStreamStatus('Searching general indexes...');
              }
            } else if (parsed.type === 'generation_started') {
              setStreamStatus('Synthesizing response...');
            } else if (parsed.type === 'content') {
              const delta = parsed.delta;
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const lastMsg = prev[lastIdx];
                if (lastMsg.role !== 'assistant') return prev;
                const updated = [...prev];
                updated[lastIdx] = {
                  ...lastMsg,
                  content: (lastMsg.content || '') + delta
                };
                return updated;
              });
            } else if (parsed.type === 'citations') {
              const citations = parsed.citations;
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const lastMsg = prev[lastIdx];
                if (lastMsg.role !== 'assistant') return prev;
                const updated = [...prev];
                updated[lastIdx] = {
                  ...lastMsg,
                  citations: citations
                };
                return updated;
              });
            } else if (parsed.type === 'completed') {
              const { session_id, query_rewrite, metrics } = parsed;
              setStreamStatus('');
              if (!activeSession) {
                setActiveSession(session_id);
                fetchSessions();
              }
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const lastMsg = prev[lastIdx];
                if (lastMsg.role !== 'assistant') return prev;
                const updated = [...prev];
                updated[lastIdx] = {
                  ...lastMsg,
                  query_rewrite: query_rewrite,
                  metrics: metrics
                };
                return updated;
              });
            } else if (parsed.type === 'done') {
              setStreamStatus('');
            }
          } catch (err) {
            console.error("Error parsing stream chunk:", err, line);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Stream reader generation aborted.");
      } else {
        console.error(err);
        const errorMessage: Message = {
          role: 'assistant',
          content: "I encountered an error querying the model. Please check the backend connection.",
          timestamp: new Date().toISOString()
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
      setStreamStatus('');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setStreamStatus('Generation stopped.');
      setLoading(false);
    }
  };

  const handleRenameSession = async (id: string, currentName: string) => {
    const newName = window.prompt(`Rename session name:`, currentName);
    if (!newName || !newName.trim()) return;
    try {
      await apiClient.patch(`/chatbot/history/${id}`, { name: newName.trim() });
      fetchSessions();
    } catch (e) {
      console.error("Rename chat error: ", e);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chat session?")) return;
    try {
      await apiClient.delete(`/chatbot/history/${id}`);
      fetchSessions();
      if (activeSession === id) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch (e) {
      console.error("Delete session error: ", e);
    }
  };

  const handleCopyMessage = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedMessageIndex(idx);
    setTimeout(() => setCopiedMessageIndex(null), 2000);
  };

  const exportChatHistory = () => {
    if (messages.length === 0) return;
    const mdContent = messages.map(m => {
      const header = m.role === 'user' ? '### User' : '### Career AI Assistant';
      const meta = m.query_rewrite ? `*(RAG Rewrite: ${m.query_rewrite})*\n` : '';
      return `${header}\n${meta}\n${m.content}\n`;
    }).join('\n---\n\n');
    
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `career_chat_${activeSession || 'export'}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateResponse = () => {
    if (!lastPromptRef.current || loading) return;
    
    setMessages((prev) => {
      const next = [...prev];
      if (next.length > 0 && next[next.length - 1].role === 'assistant') {
        next.pop();
      }
      return next;
    });

    setTimeout(() => {
      handleSendMessage({ preventDefault: () => {} } as React.FormEvent, lastPromptRef.current);
    }, 100);
  };

  const openCitationPanel = (citations: Citation[]) => {
    setSelectedCitations(citations);
    setCitationSidebarOpen(true);
  };

  const toggleCitations = (idx: number) => {
    setOpenCitationsIndex(openCitationsIndex === idx ? null : idx);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Left panel: File indexing & sessions */}
      <div className="w-full md:w-72 bg-[#0c1222] border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between shrink-0 p-4 space-y-6">
        {/* Upload panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Knowledge Base</h4>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-1.5 rounded bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/25 transition disabled:opacity-50"
            >
              <Upload size={14} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.pptx,.png,.jpg,.jpeg"
            />
          </div>

          {uploading && (
            <div className="p-3 bg-brand-950/20 border border-brand-900/50 rounded-lg flex items-center space-x-2.5 animate-pulse text-brand-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>
              <span>Indexing document vector...</span>
            </div>
          )}

          {/* List of uploaded files */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {documents.length === 0 ? (
              <span className="text-[10px] text-slate-500 block text-center py-2">No files uploaded. Supports PDFs/Word/Images.</span>
            ) : (
              documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-2 bg-[#080c16] rounded border border-slate-800/80 hover:border-slate-700/80 transition group">
                  <div className="flex items-center space-x-2 truncate">
                    <FileText className="text-slate-400 shrink-0" size={14} />
                    <span className="text-xs text-slate-300 truncate font-medium">{doc.filename}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-1 rounded text-red-500 hover:bg-red-950/20 md:opacity-0 group-hover:opacity-100 transition"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sessions list */}
        <div className="flex-1 flex flex-col justify-start space-y-4 overflow-y-auto mt-6">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">History Sessions</span>
            <button
              onClick={() => setActiveSession(null)}
              className="text-[10px] text-brand-400 hover:text-brand-300 font-bold uppercase tracking-wider bg-brand-500/5 px-2 py-0.5 rounded border border-brand-500/10"
            >
              + New Chat
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-slate-500" size={12} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="w-full bg-slate-900/60 border border-slate-800 rounded pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700"
            />
          </div>

          <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
            {sessions
              .filter((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
              .map((s) => (
                <div key={s.id} className="group relative flex items-center justify-between w-full">
                  <button
                    onClick={() => setActiveSession(s.id)}
                    className={`w-full text-left px-3 py-2 rounded text-xs truncate transition font-medium pr-14 ${
                      activeSession === s.id
                        ? 'bg-slate-800/80 border border-slate-700 text-white font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                    }`}
                  >
                    {s.name}
                  </button>
                  <div className="absolute right-2 top-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => handleRenameSession(s.id, s.name)}
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
                      title="Rename chat"
                    >
                      <Edit2 size={10} />
                    </button>
                    <button
                      onClick={() => handleDeleteSession(s.id)}
                      className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-slate-800 transition"
                      title="Delete chat"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Main chat window */}
      <div className="flex-1 flex flex-col h-full bg-[#080b11]">
        {/* Chat header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-[#0c111e]/90 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <MessageSquare className="text-brand-500" size={20} />
            <h3 className="font-outfit font-extrabold text-sm uppercase text-slate-200">AI Chatbot Workspace</h3>
          </div>
          <div className="flex items-center space-x-3">
            {messages.length > 0 && (
              <button
                onClick={exportChatHistory}
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center space-x-1 text-xs"
                title="Export session as Markdown"
              >
                <Download size={12} />
                <span className="hidden sm:inline font-bold uppercase tracking-wider text-[10px]">Export</span>
              </button>
            )}
            {documents.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Focus File:</span>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="">Query All Knowledge Base</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>{doc.filename}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Chat history canvas */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 max-w-sm mx-auto text-center mt-12">
              <Compass className="text-slate-700 animate-float" size={48} />
              <div className="space-y-1">
                <span className="text-slate-300 font-bold text-sm block">Ask any question to get started</span>
                <span className="text-xs">
                  Upload job descriptions or resume PDFs in the left panel to query the vector search RAG pipeline.
                </span>
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div 
                key={index}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className={`max-w-3xl rounded-xl p-4 shadow ${
                  msg.role === 'user'
                    ? 'bg-brand-500 text-white rounded-br-none'
                    : 'bg-slate-900 border border-slate-800/80 text-slate-100 rounded-bl-none'
                }`}>
                  
                  {/* Assistant special info: Query rewriting tracker */}
                  {msg.role === 'assistant' && msg.query_rewrite && (
                    <div className="flex items-center space-x-1 text-[10px] text-brand-400 font-bold tracking-wide uppercase border-b border-slate-800 pb-2 mb-2">
                      <Sparkles size={11} className="animate-spin-slow" />
                      <span>RAG Rewrite: '{msg.query_rewrite}'</span>
                    </div>
                  )}

                  <div className="text-xs leading-relaxed font-sans prose dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Assistant special info: Telemetry Metrics badge */}
                  {msg.role === 'assistant' && msg.metrics && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[9px] text-slate-400 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900 text-[10px] font-bold text-slate-300">Latency:</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900">Total: {Math.round(msg.metrics.total_latency_ms)}ms</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900">Rewrite: {Math.round(msg.metrics.rewrite_latency_ms)}ms</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900">Embed: {Math.round(msg.metrics.embedding_latency_ms)}ms</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900">Search: {Math.round(msg.metrics.retrieval_latency_ms)}ms</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900">Rerank: {Math.round(msg.metrics.reranking_latency_ms)}ms</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-900">Gen: {Math.round(msg.metrics.generation_latency_ms)}ms</span>
                    </div>
                  )}
                </div>

                {/* Action buttons bar */}
                {msg.role === 'assistant' && (
                  <div className="mt-2 flex items-center space-x-2.5">
                    <button
                      onClick={() => handleCopyMessage(msg.content, index)}
                      className="p-1 rounded text-slate-500 hover:text-slate-350 hover:bg-slate-905 transition flex items-center space-x-1"
                      title="Copy response"
                    >
                      {copiedMessageIndex === index ? (
                        <>
                          <Check size={11} className="text-green-500" />
                          <span className="text-[9px] uppercase tracking-wide font-bold text-green-500 font-sans">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span className="text-[9px] uppercase tracking-wide font-bold font-sans">Copy</span>
                        </>
                      )}
                    </button>
                    {msg.citations && msg.citations.length > 0 && (
                      <button
                        onClick={() => openCitationPanel(msg.citations || [])}
                        className="p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-slate-905 transition flex items-center space-x-1"
                        title="View source citations in sidebar"
                      >
                        <Link2 size={11} />
                        <span className="text-[9px] uppercase tracking-wide font-bold font-sans">Citations ({msg.citations.length})</span>
                      </button>
                    )}
                    {index === messages.length - 1 && (
                      <button
                        onClick={handleRegenerateResponse}
                        className="p-1 rounded text-slate-500 hover:text-brand-400 hover:bg-slate-905 transition flex items-center space-x-1"
                        title="Regenerate answer"
                      >
                        <RotateCcw size={11} />
                        <span className="text-[9px] uppercase tracking-wide font-bold font-sans">Regenerate</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex items-center space-x-4 text-brand-400 font-mono text-xs p-3.5 bg-slate-950/40 rounded-xl border border-slate-900 w-fit">
              <div className="flex items-center space-x-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
                <span>{streamStatus || 'Orchestrating search pipeline...'}</span>
              </div>
              <button
                type="button"
                onClick={handleStopGeneration}
                className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-[9px] font-bold uppercase transition flex items-center space-x-1"
              >
                <Square size={9} fill="currentColor" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        {/* Suggested Follow-up Questions */}
        {!loading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
          <div className="px-6 py-3.5 bg-[#080b11] border-t border-slate-800/40 flex flex-col space-y-2 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center space-x-1">
              <Sparkles size={10} className="text-brand-400 animate-pulse" />
              <span>Suggested Follow-up Questions</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                "Suggest specific technical certifications or updates relevant for this role.",
                "Detail key domain expertise or technologies from the source document context.",
                "Explain the most complex technical challenges mentioned in the focus files."
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage({ preventDefault: () => {} } as React.FormEvent, q)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input prompt form */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800/80 bg-[#0a0f1d] flex space-x-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              selectedDocId 
                ? "Query text in specific file..." 
                : "Ask questions on your uploaded documents..."
            }
            className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-sm px-4 py-2.5 rounded-xl focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
          />
          <button
            type="submit"
            disabled={!prompt.trim() || loading}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-lg shadow-brand-500/10 transition disabled:opacity-50"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Citations right drawer */}
      {citationSidebarOpen && (
        <div className="w-80 bg-[#0c1222] border-l border-slate-800 flex flex-col h-full shrink-0 animate-slide-in">
          <div className="px-4 py-4 border-b border-slate-850 flex items-center justify-between bg-slate-950/20">
            <div className="flex items-center space-x-1.5 text-slate-200">
              <Link2 size={13} className="text-brand-400" />
              <h4 className="text-[11px] font-bold uppercase tracking-wider font-outfit">Source Citations</h4>
            </div>
            <button
              onClick={() => setCitationSidebarOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedCitations.length === 0 ? (
              <span className="text-xs text-slate-500 block text-center py-4">No citations mapped for this response.</span>
            ) : (
              selectedCitations.map((cite, idx) => (
                <div key={idx} className="bg-slate-950/80 border border-slate-850 p-3 rounded-lg flex flex-col space-y-1.5 shadow-sm">
                  <div className="flex justify-between items-start font-medium text-slate-200 text-xs gap-2">
                    <span className="truncate font-semibold text-[11px]">{cite.filename}</span>
                    <span className="text-[10px] text-teal-400 font-mono shrink-0 font-bold">Sim: {Math.floor(cite.confidence * 100)}%</span>
                  </div>
                  {cite.page !== undefined && (
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Page / Section {cite.page}</span>
                  )}
                  <p className="text-[11px] text-slate-400 leading-relaxed italic bg-slate-900/60 p-2 rounded border border-slate-850/60 mt-1 select-text">
                    "{cite.content}"
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
