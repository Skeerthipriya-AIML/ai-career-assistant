import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Search, 
  Star, 
  Folder, 
  Tag, 
  Trash2, 
  RefreshCw, 
  Edit3, 
  FileText, 
  Eye, 
  CheckCircle, 
  X, 
  Grid, 
  List, 
  Calendar,
  Layers,
  HelpCircle,
  FolderPlus,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../services/api';

interface Document {
  id: string;
  filename: string;
  filepath: string;
  fingerprint: string;
  version: number;
  chunks_count: number;
  is_favorite: boolean;
  tags: string[];
  summary: string;
  uploaded_at: string;
  collection_name?: string;
}

export const DocumentWorkspace: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFolder, setSelectedFolder] = useState<string>('All');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string>('');

  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editFolder, setEditFolder] = useState<string>('');
  const [editTags, setEditTags] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await apiClient.get('/chatbot/documents');
      setDocuments(res.data);
    } catch (e) {
      console.error("Error retrieving documents list:", e);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    setErrorBanner('');

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorBanner('');
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.csv', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.md', '.markdown'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExt)) {
      setErrorBanner(`File format ${fileExt} is not supported.`);
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const interval = setInterval(() => {
        setUploadProgress((p) => (p < 80 ? p + 15 : p));
      }, 300);

      await apiClient.post('/chatbot/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      clearInterval(interval);
      setUploadProgress(100);
      
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        fetchDocuments();
      }, 600);
    } catch (err: any) {
      setUploading(false);
      setUploadProgress(0);
      const detail = err.response?.data?.detail || "Ingest validation failed. Check virus scanning restrictions.";
      setErrorBanner(detail);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document from vector storage?")) return;
    try {
      await apiClient.delete(`/chatbot/documents/${id}`);
      fetchDocuments();
      if (previewDoc?.id === id) setPreviewDoc(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleFavorite = async (doc: Document) => {
    try {
      await apiClient.patch(`/chatbot/documents/${doc.id}`, {
        is_favorite: !doc.is_favorite
      });
      fetchDocuments();
      if (previewDoc?.id === doc.id) {
        setPreviewDoc({ ...previewDoc, is_favorite: !doc.is_favorite });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReindex = async (id: string) => {
    try {
      setUploading(true);
      await apiClient.post(`/chatbot/reindex/${id}`);
      fetchDocuments();
      alert("Document re-chunked and re-indexed successfully!");
    } catch (e) {
      console.error(e);
      alert("Reindex failed.");
    } finally {
      setUploading(false);
    }
  };

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    setEditName(doc.filename);
    setEditFolder(doc.collection_name || '');
    setEditTags(doc.tags.join(', '));
  };

  const handleSaveChanges = async () => {
    if (!editingDoc) return;
    try {
      const tagsArray = editTags.split(',').map(t => t.trim()).filter(Boolean);
      await apiClient.patch(`/chatbot/documents/${editingDoc.id}`, {
        filename: editName,
        collection_name: editFolder || "General",
        tags: tagsArray
      });
      setEditingDoc(null);
      fetchDocuments();
    } catch (e) {
      console.error(e);
      alert("Failed to update metadata.");
    }
  };

  // List folders
  const folders = ['All', ...Array.from(new Set(documents.map(d => d.collection_name).filter(Boolean))) as string[]];

  // Filtering logic
  const filteredDocs = documents.filter(doc => {
    const matchesSearch = doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFolder = selectedFolder === 'All' || doc.collection_name === selectedFolder;
    const matchesFav = !showFavoritesOnly || doc.is_favorite;
    return matchesSearch && matchesFolder && matchesFav;
  });

  return (
    <div className="flex-1 flex flex-col md:flex-row h-screen overflow-hidden text-slate-100 font-sans">
      
      {/* File List & Controls Pane */}
      <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 space-y-6">
        
        {/* Workspace Title & Search controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left border-b border-slate-800/80 pb-4">
          <div className="space-y-1">
            <h2 className="font-outfit font-extrabold text-2xl text-slate-100 flex items-center space-x-2">
              <Layers className="text-brand-500" size={24} />
              <span>Knowledge Base Workspace</span>
            </h2>
            <p className="text-xs text-slate-400">
              Manage target resumes, corporate portfolios, and credentials vector context.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition ${viewMode === 'grid' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition ${viewMode === 'list' ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {errorBanner && (
          <div className="p-3.5 bg-red-950/20 border border-red-900/50 rounded-xl flex items-center space-x-3 text-xs text-red-400">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner('')} className="ml-auto text-red-500 hover:text-red-300">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Interactive Drag & Drop Upload Zone */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
            isDragActive 
              ? 'border-brand-500 bg-brand-500/5' 
              : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.pptx,.png,.jpg,.jpeg,.md,.markdown"
          />
          {uploading ? (
            <div className="space-y-4 text-center w-full max-w-xs">
              <div className="h-1 bg-slate-850 w-full rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
              <p className="text-xs text-brand-400 font-bold tracking-wide animate-pulse">
                VIRUS SCANNING & INGESTING VECTOR CHUNKS... {uploadProgress}%
              </p>
            </div>
          ) : (
            <div className="text-center space-y-2">
              <div className="p-3 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl w-fit mx-auto mb-2">
                <Upload size={22} className="animate-bounce" />
              </div>
              <p className="text-xs font-bold text-slate-200">Drag & drop files here, or click to upload</p>
              <p className="text-[10px] text-slate-500 leading-normal max-w-sm">
                Supports PDF, DOCX, PPTX, TXT, CSV, XLSX, PNG, JPG, JPEG. Files are virus-scanned, fingerprinted, and segmented.
              </p>
            </div>
          )}
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search box */}
          <div className="w-full sm:max-w-xs flex items-center space-x-2.5 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-850">
            <Search size={14} className="text-slate-550" />
            <input
              type="text"
              placeholder="Search file name, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-350 focus:outline-none placeholder-slate-600 font-sans w-full"
            />
          </div>

          {/* Folder tabs selectors */}
          <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto shrink-0 py-1">
            {folders.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                  selectedFolder === f 
                    ? 'bg-brand-500 text-white' 
                    : 'bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-250'
                }`}
              >
                {f === 'General' ? 'Uncategorized' : f}
              </button>
            ))}

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`p-1.5 rounded-lg border transition ${
                showFavoritesOnly 
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                  : 'bg-slate-900 border-slate-850 text-slate-400 hover:text-slate-300'
              }`}
            >
              <Star size={14} fill={showFavoritesOnly ? "currentColor" : "none"} />
            </button>
          </div>
        </div>

        {/* Documents Grid / List Layout Container */}
        {filteredDocs.length === 0 ? (
          <div className="text-center py-16 space-y-2 text-slate-500 text-xs">
            <FileText size={32} className="mx-auto text-slate-800" />
            <p>No documents matched current filters.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredDocs.map((doc) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-[#0c1324]/60 border border-slate-850 hover:border-slate-750 p-5 rounded-2xl flex flex-col justify-between text-left transition group relative shadow-md"
                >
                  <button 
                    onClick={() => handleToggleFavorite(doc)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-amber-400 transition"
                  >
                    <Star size={15} fill={doc.is_favorite ? "#fbbf24" : "none"} className={doc.is_favorite ? "text-amber-400" : ""} />
                  </button>

                  <div className="space-y-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-2 bg-slate-950 border border-slate-850/60 rounded-xl text-slate-400">
                        <FileText size={18} />
                      </div>
                      <div className="truncate max-w-[170px]">
                        <h4 className="text-xs font-bold text-slate-200 truncate">{doc.filename}</h4>
                        <span className="text-[9px] text-slate-550 block font-semibold">{doc.chunks_count} vector chunks</span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 bg-slate-950/20 p-2.5 rounded-lg border border-slate-900/60 font-sans">
                      {doc.summary || "No automated summary extracted."}
                    </p>

                    <div className="flex flex-wrap gap-1.5">
                      {doc.collection_name && (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold uppercase">
                          <Folder size={8} />
                          <span>{doc.collection_name}</span>
                        </span>
                      )}
                      {doc.tags.map(t => (
                        <span key={t} className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[8px] bg-slate-950 text-slate-450 border border-slate-850 font-bold uppercase">
                          <Tag size={8} />
                          <span>{t}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-850/50 mt-5 pt-3.5">
                    <span className="text-[8px] text-slate-500 flex items-center space-x-1">
                      <Calendar size={10} />
                      <span>{new Date(doc.uploaded_at).toLocaleDateString()} (v{doc.version})</span>
                    </span>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 rounded-lg transition"
                        title="Preview Content"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-slate-100 rounded-lg transition"
                        title="Edit Metadata"
                      >
                        <Edit3 size={12} />
                      </button>
                      <button
                        onClick={() => handleReindex(doc.id)}
                        className="p-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-850 text-slate-400 hover:text-brand-400 rounded-lg transition"
                        title="Reindex Document"
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-1.5 bg-red-950/20 hover:bg-red-950/40 border border-red-900/30 text-red-500 rounded-lg transition"
                        title="Delete Document"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="border border-slate-850 rounded-2xl overflow-hidden bg-[#0c1324]/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#0b111e] border-b border-slate-850 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Filename</th>
                  <th className="p-4">Tags / Folder</th>
                  <th className="p-4">Summary</th>
                  <th className="p-4">Uploaded</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 bg-[#080d16]/30">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-900/40 transition">
                    <td className="p-4 font-bold flex items-center space-x-2">
                      <FileText size={14} className="text-slate-450" />
                      <span className="truncate max-w-[200px]">{doc.filename}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1.5">
                        {doc.collection_name && <span className="text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 px-1.5 py-0.5 rounded">{doc.collection_name}</span>}
                        {doc.tags.map(t => <span key={t} className="text-[8px] font-bold bg-slate-950 text-slate-500 border border-slate-850 px-1.5 py-0.5 rounded">{t}</span>)}
                      </div>
                    </td>
                    <td className="p-4 max-w-sm truncate text-slate-400 text-[11px] font-sans">{doc.summary}</td>
                    <td className="p-4 text-slate-500 font-mono text-[10px]">{new Date(doc.uploaded_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right">
                      <div className="flex space-x-2.5 justify-end">
                        <button onClick={() => setPreviewDoc(doc)} className="text-slate-400 hover:text-slate-100"><Eye size={13} /></button>
                        <button onClick={() => openEditModal(doc)} className="text-slate-400 hover:text-slate-100"><Edit3 size={13} /></button>
                        <button onClick={() => handleReindex(doc.id)} className="text-slate-400 hover:text-brand-400"><RefreshCw size={13} /></button>
                        <button onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-out Sidebar preview pane */}
      {previewDoc && (
        <div className="w-full md:w-96 bg-[#0c1222] border-t md:border-t-0 md:border-l border-slate-800 p-6 flex flex-col justify-between shrink-0 overflow-y-auto space-y-6 text-left">
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Document Details</h3>
              <button onClick={() => setPreviewDoc(null)} className="p-1 hover:bg-slate-850 rounded text-slate-450 hover:text-slate-200 transition">
                <X size={15} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-950 border border-slate-850/60 rounded-2xl flex items-center space-x-3.5">
                <div className="p-3 bg-brand-500/10 text-brand-400 border border-brand-500/20 rounded-xl">
                  <FileText size={22} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100">{previewDoc.filename}</h4>
                  <span className="text-[10px] text-slate-500 block font-mono">MD5 Fingerprint: {previewDoc.fingerprint.slice(0, 16)}...</span>
                </div>
              </div>

              {/* summary Card */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">AI Summary</span>
                <p className="p-3 bg-[#080c16] border border-slate-850 rounded-xl text-xs text-slate-350 leading-relaxed font-sans">
                  {previewDoc.summary || "No automated summary extracted."}
                </p>
              </div>

              {/* tags listing */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-550 uppercase tracking-wider">Indexed Tag Collections</span>
                <div className="flex flex-wrap gap-1.5">
                  {previewDoc.tags.map(t => (
                    <span key={t} className="px-2 py-0.5 rounded text-[8px] bg-slate-950 text-slate-450 border border-slate-850 font-bold uppercase">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-800 flex space-x-3">
            <button
              onClick={() => handleToggleFavorite(previewDoc)}
              className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold hover:bg-slate-850 transition text-slate-200"
            >
              <Star size={14} fill={previewDoc.is_favorite ? "currentColor" : "none"} className={previewDoc.is_favorite ? "text-amber-400" : ""} />
              <span>{previewDoc.is_favorite ? "Favorited" : "Mark Favorite"}</span>
            </button>
            <button
              onClick={() => handleDelete(previewDoc.id)}
              className="flex-1 flex items-center justify-center space-x-2 py-2.5 bg-red-950/20 border border-red-900/30 rounded-xl text-xs font-semibold hover:bg-red-950/40 text-red-400 transition"
            >
              <Trash2 size={14} />
              <span>Delete File</span>
            </button>
          </div>
        </div>
      )}

      {/* Edit Metadata Modal */}
      {editingDoc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="w-full max-w-sm bg-[#0c1324] border border-slate-800 rounded-2xl p-6 space-y-4 text-left shadow-2xl">
            <h4 className="text-sm font-bold text-slate-200 border-b border-slate-800 pb-3">Edit Document Settings</h4>
            
            <div className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-slate-450 text-[10px] uppercase font-bold">Document Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-[10px] uppercase font-bold">Collection Folder</label>
                <input
                  type="text"
                  value={editFolder}
                  onChange={(e) => setEditFolder(e.target.value)}
                  placeholder="e.g. Resume, Job Description"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-450 text-[10px] uppercase font-bold">Tags (Comma-separated)</label>
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 pt-3">
              <button
                onClick={() => setEditingDoc(null)}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold transition shadow-lg shadow-brand-500/15"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default DocumentWorkspace;
