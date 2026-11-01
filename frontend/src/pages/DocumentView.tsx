import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  HelpCircle, 
  BookOpen, 
  Languages, 
  GitCompare, 
  Sparkles,
  ChevronRight,
  TrendingUp,
  Map,
  Grid,
  Download,
  Upload,
  Brain,
  ListTodo,
  CheckCircle,
  FileCheck,
  Search,
  MessageSquare
} from 'lucide-react';
import { MindMapRenderer } from '../components/ui/MindMapRenderer';
import ReactMarkdown from 'react-markdown';
import { apiClient } from '../services/api';
import { documentService } from '../services/document';


interface Document {
  id: string;
  filename: string;
}

interface Flashcard {
  front: string;
  back: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export const DocumentView: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  
  // Compare targets
  const [compareDocIdA, setCompareDocIdA] = useState<string>('');
  const [compareDocIdB, setCompareDocIdB] = useState<string>('');
  const [compareReport, setCompareReport] = useState<string>('');

  // Active workspace tab
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'actions' | 'resume' | 'qa' | 'diagrams' | 'compare'>('summary');
  const [loading, setLoading] = useState<boolean>(false);

  // Content states
  const [summary, setSummary] = useState<string>('');
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizScore, setQuizScore] = useState<number>(0);
  
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [flippedCardIdx, setFlippedCardIdx] = useState<number | null>(null);

  const [mindmapCode, setMindmapCode] = useState<string>('');
  const [tablesMarkdown, setTablesMarkdown] = useState<string>('');

  // Translation targets
  const [translateLang, setTranslateLang] = useState<string>('Spanish');
  const [translatedText, setTranslatedText] = useState<string>('');

  // Technical Explainer states
  const [explainParagraphText, setExplainParagraphText] = useState<string>('');
  const [explainTone, setExplainTone] = useState<string>('educational');
  const [explanationReport, setExplanationReport] = useState<string>('');

  // Action Items states
  const [actionItemsReport, setActionItemsReport] = useState<string>('');

  // Resume Match states
  const [jobDescriptionInput, setJobDescriptionInput] = useState<string>('');
  const [resumeAnalysisReport, setResumeAnalysisReport] = useState<string>('');

  // Document Q&A states
  const [qaQuery, setQaQuery] = useState<string>('');
  const [qaAnswer, setQaAnswer] = useState<string>('');
  const [qaCitations, setQaCitations] = useState<any[]>([]);
  const [qaMetrics, setQaMetrics] = useState<any>(null);

  // Upload states
  const [uploading, setUploading] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (selectedDocId && (activeTab === 'summary' || activeTab === 'quiz' || activeTab === 'actions' || activeTab === 'diagrams')) {
      executeTabAction(activeTab);
    }
  }, [selectedDocId]);

  const fetchDocuments = async () => {
    try {
      const data = await documentService.getDocuments();
      setDocuments(data);
      if (data.length > 0) {
        setSelectedDocId(data[0].id);
        setCompareDocIdA(data[0].id);
        if (data.length > 1) {
          setCompareDocIdB(data[1].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const result = await documentService.uploadDocument(files[0]);
      await fetchDocuments();
      if (result?.id) {
        setSelectedDocId(result.id);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Document upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  const executeTabAction = async (tabName: typeof activeTab) => {
    if (!selectedDocId) {
      alert("Please upload and select a document first.");
      return;
    }
    setLoading(true);
    setTranslatedText('');
    
    try {
      const formData = new FormData();
      formData.append('doc_id', selectedDocId);

      if (tabName === 'summary') {
        const res = await apiClient.post('/document/summarize', formData);
        setSummary(res.data.summary);
      } else if (tabName === 'quiz') {
        // Fetch quiz questions
        const quizRes = await apiClient.post('/document/quiz', formData);
        setQuiz(quizRes.data.quiz);
        setQuizAnswers({});
        setQuizSubmitted(false);

        // Fetch flashcards together
        const flashRes = await apiClient.post('/document/flashcards', formData);
        setFlashcards(flashRes.data.flashcards);
        setFlippedCardIdx(null);
      } else if (tabName === 'actions') {
        const res = await apiClient.post('/document/extract-action-items', formData);
        setActionItemsReport(res.data.action_items);
      } else if (tabName === 'diagrams') {
        const mmRes = await apiClient.post('/document/mind-map', formData);
        setMindmapCode(mmRes.data.mermaid);
        const tblRes = await apiClient.post('/document/extract-tables', formData);
        setTablesMarkdown(tblRes.data.tables);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to compute document processing action.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compareDocIdA || !compareDocIdB) {
      alert("Select two documents for comparison.");
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('doc_id_a', compareDocIdA);
    formData.append('doc_id_b', compareDocIdB);

    try {
      const res = await apiClient.post('/document/compare', formData);
      setCompareReport(res.data.comparison_report);
    } catch (e) {
      console.error(e);
      alert("Failed to compile document comparisons.");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!summary) return;
    setLoading(true);
    try {
      const res = await apiClient.post('/document/translate', {
        text: summary.slice(0, 1500),
        target_language: translateLang
      });
      setTranslatedText(res.data.translation);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainParagraph = async () => {
    if (!explainParagraphText.trim()) {
      alert("Please paste or type dense paragraph content to explain.");
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.post('/document/explain-paragraph', {
        paragraph: explainParagraphText,
        tone: explainTone
      });
      setExplanationReport(res.data.explanation);
    } catch (e) {
      console.error(e);
      alert("Explanation generation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeResume = async () => {
    if (!jobDescriptionInput.trim()) {
      alert("Please paste the job description criteria first.");
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('doc_id', selectedDocId);
      formData.append('job_description', jobDescriptionInput);
      const res = await apiClient.post('/document/analyze-resume', formData);
      setResumeAnalysisReport(res.data.analysis);
    } catch (e) {
      console.error(e);
      alert("Resume analysis computation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaQuery.trim()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('doc_id', selectedDocId);
      formData.append('question', qaQuery);
      const res = await apiClient.post('/document/ask', formData);
      setQaAnswer(res.data.answer);
      setQaCitations(res.data.citations || []);
      setQaMetrics(res.data.metrics || null);
    } catch (e) {
      console.error(e);
      alert("Question extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuizSubmit = () => {
    let score = 0;
    quiz.forEach((q) => {
      if (quizAnswers[q.id] === q.answer) {
        score += 1;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const handleExportMarkdown = (title: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([`# ${title}\n\n${content}`], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/\s+/g, '_')}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 overflow-y-auto h-screen max-w-6xl mx-auto flex flex-col justify-between">
      
      {/* Upper selector workspace */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center space-x-2.5">
          <FileText className="text-brand-500" size={24} />
          <div>
            <h2 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-slate-100">
              Document Assistant
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Summarize papers, generate study quizzes, flip flashcards, and inspect structures.
            </p>
          </div>
        </div>

        {/* Selected Doc focus dropdown & Upload button */}
        <div className="flex items-center space-x-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleDocUpload}
            className="hidden"
            accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.pptx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
          >
            <Upload size={14} />
            <span>{uploading ? 'Uploading...' : 'Upload Doc'}</span>
          </button>
          
          {documents.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-bold uppercase hidden sm:inline">Focus:</span>
              <select
                value={selectedDocId}
                onChange={(e) => {
                  setSelectedDocId(e.target.value);
                  setSummary('');
                  setQuiz([]);
                  setFlashcards([]);
                  setMindmapCode('');
                  setTablesMarkdown('');
                }}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>{doc.filename}</option>
                ))}
              </select>
              <button
                onClick={() => executeTabAction(activeTab)}
                disabled={loading || !selectedDocId}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-brand-300 transition"
                title="Re-run analysis on focused document"
              >
                <Sparkles size={13} />
                <span>Analyze</span>
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Tabs list navigation bar */}
      <div className="flex space-x-2 border-b border-slate-800 pb-2 overflow-x-auto shrink-0 select-none">
        {([
          { id: 'summary', label: 'Summary & Explainer' },
          { id: 'quiz', label: 'Quiz & Study cards' },
          { id: 'actions', label: 'Action items checklist' },
          { id: 'resume', label: 'ATS Resume Matcher' },
          { id: 'qa', label: 'Document Q&A' },
          { id: 'diagrams', label: 'Mind Map & Tables' },
          { id: 'compare', label: 'Compare Documents' }
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id !== 'compare' && tab.id !== 'resume' && tab.id !== 'qa') {
                executeTabAction(tab.id);
              }
            }}
            className={`px-4 py-2 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/10'
                : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-855 hover:bg-slate-850'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Workspaces view body */}
      <div className="flex-1 my-6 overflow-y-auto min-h-[300px]">
        {loading ? (
          <div className="h-full flex items-center justify-center p-12">
            <div className="flex flex-col items-center space-y-4">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
              <span className="text-xs font-mono text-slate-400">Processing document text structures...</span>
            </div>
          </div>
        ) : (
          <div className="h-full">
            {/* 1. Executive summary Tab */}
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <div className="glass-card rounded-xl p-6 leading-relaxed text-xs">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-outfit font-extrabold text-sm text-brand-400 uppercase tracking-wider">Executive Summary</h3>
                    {summary && (
                      <button
                        onClick={() => handleExportMarkdown("Executive Summary", summary)}
                        className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-100 transition"
                      >
                        <Download size={14} />
                        <span>Export</span>
                      </button>
                    )}
                  </div>
                  <div className="prose dark:prose-invert">
                    {summary ? (
                      <ReactMarkdown>{summary}</ReactMarkdown>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-8 space-y-3 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 text-center">
                        <FileText className="text-brand-400" size={32} />
                        <p className="text-slate-300 font-semibold text-xs">Ready to analyze: {documents.find(d => d.id === selectedDocId)?.filename || "Selected Document"}</p>
                        <p className="text-slate-500 text-[11px] max-w-sm">Generate executive summaries, study quizzes, Mermaid mind maps, and key action items from this document.</p>
                        <button
                          onClick={() => executeTabAction('summary')}
                          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/10 flex items-center space-x-1.5 transition"
                        >
                          <Sparkles size={14} />
                          <span>Generate Executive Summary</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Technical Explainer Tool */}
                <div className="glass-card rounded-xl p-6 border border-slate-800 space-y-4">
                  <div className="flex items-center space-x-2 text-teal-400 font-bold border-b border-slate-850 pb-2">
                    <Brain size={16} />
                    <span>Technical Explainer</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Paste complex technical concepts, paragraphs, or jargon here to explain it statefully.</p>
                  
                  <div className="space-y-3">
                    <textarea
                      value={explainParagraphText}
                      onChange={(e) => setExplainParagraphText(e.target.value)}
                      placeholder="Paste target paragraph to simplify or clarify..."
                      className="w-full h-24 bg-slate-950 border border-slate-800 text-xs rounded p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] text-slate-400">Tone Level:</span>
                        <select
                          value={explainTone}
                          onChange={(e) => setExplainTone(e.target.value)}
                          className="bg-slate-900 border border-slate-800 text-[10px] text-slate-200 rounded px-2 py-1"
                        >
                          <option value="simple">Simple Tutor</option>
                          <option value="educational">Educational Prof</option>
                          <option value="advanced">Advanced Specialist</option>
                        </select>
                      </div>
                      <button
                        onClick={handleExplainParagraph}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold"
                      >
                        Explain Text
                      </button>
                    </div>
                  </div>

                  {explanationReport && (
                    <div className="bg-slate-950 p-4 rounded border border-slate-800 prose dark:prose-invert">
                      <div className="flex justify-between items-center border-b border-slate-900 pb-1.5 mb-2">
                        <span className="text-[9px] uppercase font-bold text-teal-400 tracking-wider">Concept explanation details</span>
                        <button
                          onClick={() => handleExportMarkdown("Technical Explanation", explanationReport)}
                          className="text-slate-400 hover:text-slate-100"
                        >
                          <Download size={12} />
                        </button>
                      </div>
                      <ReactMarkdown>{explanationReport}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {/* Translation Panel */}
                {summary && (
                  <div className="glass-panel rounded-xl p-5 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                      <Languages className="text-teal-400" size={18} />
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200">Localize Text Summary</span>
                        <p className="text-[10px] text-slate-500">Translate the summary into multiple developer target languages.</p>
                      </div>
                    </div>
                    <div className="flex space-x-2 shrink-0">
                      <select
                        value={translateLang}
                        onChange={(e) => setTranslateLang(e.target.value)}
                        className="bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2.5 py-1 focus:outline-none"
                      >
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Chinese">Chinese</option>
                        <option value="Japanese">Japanese</option>
                      </select>
                      <button
                        onClick={handleTranslate}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-xs font-semibold"
                      >
                        Translate
                      </button>
                    </div>
                  </div>
                )}

                {translatedText && (
                  <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 text-xs text-slate-350 italic">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">{translateLang} Translation</span>
                    <ReactMarkdown>{translatedText}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* 2. Consolidated Quiz & Study Cards Tab */}
            {activeTab === 'quiz' && (
              <div className="space-y-8">
                {quiz.length === 0 ? (
                  <span className="text-slate-500 italic">Select document and click study tab to generate quiz questions & flashcards review.</span>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2 text-brand-400 font-bold border-b border-slate-850 pb-2">
                        <BookOpen size={16} />
                        <span>Interactive Revision Quiz</span>
                      </div>
                      
                      {quiz.map((q, idx) => (
                        <div key={q.id} className="glass-card rounded-xl p-5 border border-slate-800/80 space-y-3">
                          <div className="font-semibold text-xs text-slate-200 flex items-start space-x-2">
                            <span className="text-brand-400">Q{idx + 1}.</span>
                            <span>{q.question}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-4">
                            {q.options.map((opt) => (
                              <button
                                key={opt}
                                onClick={() => !quizSubmitted && setQuizAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                className={`text-left p-2.5 rounded border text-xs transition ${
                                  quizAnswers[q.id] === opt
                                    ? 'bg-brand-500/10 border-brand-500 text-brand-300 font-semibold'
                                    : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                          {quizSubmitted && (
                            <div className={`p-3 rounded-lg text-xs leading-normal mt-3 ${
                              quizAnswers[q.id] === q.answer
                                ? 'bg-teal-950/20 border border-teal-900/50 text-teal-400'
                                : 'bg-red-950/20 border border-red-900/50 text-red-400'
                            }`}>
                              <span className="font-bold">
                                {quizAnswers[q.id] === q.answer ? 'Correct!' : `Incorrect. Correct Answer: ${q.answer}`}
                              </span>
                              <p className="mt-1 text-[11px] text-slate-400 italic font-mono">
                                "{q.explanation}"
                              </p>
                            </div>
                          )}
                        </div>
                      ))}

                      <div className="flex justify-between items-center py-2">
                        <button
                          onClick={handleQuizSubmit}
                          disabled={quizSubmitted}
                          className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-lg disabled:opacity-50"
                        >
                          Submit Answers
                        </button>

                        {quizSubmitted && (
                          <div className="flex items-center space-x-2 text-xs font-bold bg-slate-900 p-2.5 rounded-lg border border-slate-850">
                            <span className="text-slate-400">Final Score:</span>
                            <span className="text-teal-400 font-mono">{quizScore} / {quiz.length}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Flashcards block */}
                    {flashcards.length > 0 && (
                      <div className="space-y-4 pt-6 border-t border-slate-800/80">
                        <div className="flex items-center space-x-2 text-teal-400 font-bold">
                          <Brain size={16} />
                          <span>Revision Study Flashcards</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
                          {flashcards.map((card, idx) => (
                            <div 
                              key={idx}
                              onClick={() => setFlippedCardIdx(flippedCardIdx === idx ? null : idx)}
                              className="flip-card aspect-[4/3] w-full cursor-pointer group"
                            >
                              <div className={`flip-card-inner relative w-full h-full text-center rounded-xl border border-slate-800 transition-transform duration-500 ${
                                flippedCardIdx === idx ? 'flip-card-flipped' : ''
                              }`}>
                                {/* Front */}
                                <div className="flip-card-front absolute inset-0 bg-[#0c1222] rounded-xl p-5 flex flex-col justify-between items-center shadow-lg">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Concept {idx+1}</span>
                                  <span className="text-xs font-bold text-slate-100 max-w-xs">{card.front}</span>
                                  <span className="text-[8px] text-brand-400 font-semibold uppercase tracking-widest">Click to Flip</span>
                                </div>
                                {/* Back */}
                                <div className="flip-card-back absolute inset-0 bg-[#070b13] border border-brand-500/20 rounded-xl p-5 flex flex-col justify-between items-center shadow-2xl">
                                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Review Answer</span>
                                  <span className="text-xs text-slate-300 leading-relaxed max-w-xs">{card.back}</span>
                                  <span className="text-[8px] text-teal-400 font-semibold uppercase tracking-widest">Done</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* 3. Action Items Tab */}
            {activeTab === 'actions' && (
              <div className="glass-card rounded-xl p-6 text-xs leading-relaxed space-y-4">
                <div className="flex justify-between items-center border-b border-slate-850 pb-2">
                  <div className="flex items-center space-x-2 text-brand-400 font-bold">
                    <ListTodo size={16} />
                    <span>Action Items Checklist</span>
                  </div>
                  {actionItemsReport && (
                    <button
                      onClick={() => handleExportMarkdown("Action Items", actionItemsReport)}
                      className="flex items-center space-x-1.5 text-slate-400 hover:text-slate-100 transition"
                    >
                      <Download size={14} />
                      <span>Export</span>
                    </button>
                  )}
                </div>
                <div className="prose dark:prose-invert">
                  {actionItemsReport ? (
                    <ReactMarkdown>{actionItemsReport}</ReactMarkdown>
                  ) : (
                    <span className="text-slate-500 italic">No checklist generated. Select active document to scan.</span>
                  )}
                </div>
              </div>
            )}

            {/* 4. ATS Resume Matcher Tab */}
            {activeTab === 'resume' && (
              <div className="space-y-6">
                <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center space-x-2 text-brand-400 font-bold">
                    <FileCheck size={16} />
                    <span>ATS Resume Analyzer Matcher</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Compares your selected resume focus document against a target job description to compute core matching statistics and optimization suggestions.
                  </p>
                  
                  <div className="space-y-3">
                    <textarea
                      value={jobDescriptionInput}
                      onChange={(e) => setJobDescriptionInput(e.target.value)}
                      placeholder="Paste the target job description details here..."
                      className="w-full h-36 bg-slate-950 border border-slate-800 text-xs rounded p-2.5 text-slate-200 focus:outline-none focus:border-brand-500"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleAnalyzeResume}
                        disabled={!jobDescriptionInput.trim()}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-semibold disabled:opacity-50 transition"
                      >
                        Analyze Resume Fit
                      </button>
                    </div>
                  </div>
                </div>

                {resumeAnalysisReport && (
                  <div className="glass-card rounded-xl p-6 leading-relaxed text-xs prose dark:prose-invert">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2 mb-4">
                      <span className="font-bold text-teal-400 uppercase tracking-widest text-[10px]">ATS Analysis Report</span>
                      <button
                        onClick={() => handleExportMarkdown("ATS Resume Analysis", resumeAnalysisReport)}
                        className="flex items-center space-x-1 text-slate-400 hover:text-slate-100"
                      >
                        <Download size={14} />
                        <span>Export</span>
                      </button>
                    </div>
                    <ReactMarkdown>{resumeAnalysisReport}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* 5. Document Q&A Tab */}
            {activeTab === 'qa' && (
              <div className="space-y-6">
                <div className="glass-card p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center space-x-2 text-teal-400 font-bold border-b border-slate-850 pb-2">
                    <MessageSquare size={16} />
                    <span>Ask Document targeted questions</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Submit questions related *strictly* to the active focused document. Our hybrid vector store retriever queries details bounded to this file context.
                  </p>

                  <form onSubmit={handleAskQuestion} className="flex space-x-3">
                    <input
                      type="text"
                      value={qaQuery}
                      onChange={(e) => setQaQuery(e.target.value)}
                      placeholder="E.g., What are the main deliverables or architectural constraints outlined?"
                      className="flex-1 bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded focus:outline-none focus:border-brand-500 text-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={!qaQuery.trim()}
                      className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-semibold disabled:opacity-50 transition flex items-center space-x-1.5"
                    >
                      <Search size={12} />
                      <span>Search</span>
                    </button>
                  </form>
                </div>

                {qaAnswer && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 glass-card rounded-xl p-5 border border-slate-800 space-y-3">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block border-b border-slate-900 pb-1">Retrieved Answer</span>
                      <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">{qaAnswer}</p>
                    </div>
                    
                    <div className="glass-card rounded-xl p-5 border border-slate-800 space-y-4 overflow-y-auto">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block border-b border-slate-900 pb-1">Citations Sources</span>
                      {qaCitations.length === 0 ? (
                        <span className="text-[10px] text-slate-600 italic">No citations returned.</span>
                      ) : (
                        <div className="space-y-2.5">
                          {qaCitations.map((c, cIdx) => (
                            <div key={cIdx} className="bg-slate-950 p-2.5 rounded border border-slate-900 space-y-1">
                              <div className="flex justify-between items-center text-[9px] font-bold text-teal-400">
                                <span>{c.filename}</span>
                                <span>Page {c.page}</span>
                              </div>
                              <p className="text-[10px] text-slate-400 italic line-clamp-3 select-text">
                                "{c.content}"
                              </p>
                              {c.confidence && (
                                <div className="text-[8px] text-slate-500 font-mono text-right">
                                  Rerank score: {c.confidence.toFixed(3)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 6. Diagrams Tab */}
            {activeTab === 'diagrams' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Flowchart diagram */}
                <div className="space-y-4 bg-slate-900/60 p-5 rounded-xl border border-slate-850">
                  <div className="flex items-center space-x-2 text-brand-400 font-bold border-b border-slate-850 pb-2">
                    <Map size={16} />
                    <span className="text-xs uppercase tracking-wider">Concept Hierarchy Flowchart</span>
                  </div>
                  {mindmapCode ? (
                    <MindMapRenderer code={mindmapCode} />
                  ) : (
                    <span className="text-slate-500 italic">Mind map flowchart pending.</span>
                  )}
                </div>

                {/* Extracted tabular data */}
                <div className="glass-card rounded-xl p-5 text-xs leading-relaxed space-y-4">
                  <div className="flex items-center space-x-2 text-teal-400 font-bold border-b border-slate-850 pb-2">
                    <Grid size={16} />
                    <span>Extracted Tabular Structures</span>
                  </div>
                  <div className="prose dark:prose-invert">
                    {tablesMarkdown ? <ReactMarkdown>{tablesMarkdown}</ReactMarkdown> : <span className="text-slate-500 italic">No structured tables extracted yet.</span>}
                  </div>
                </div>
              </div>
            )}

            {/* 7. Document Comparison Tab */}
            {activeTab === 'compare' && (
              <div className="space-y-6">
                <div className="glass-panel p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">File A Focus</label>
                      <select
                        value={compareDocIdA}
                        onChange={(e) => setCompareDocIdA(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none cursor-pointer"
                      >
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>{doc.filename}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] uppercase font-bold text-slate-400">File B Focus</label>
                      <select
                        value={compareDocIdB}
                        onChange={(e) => setCompareDocIdB(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none cursor-pointer"
                      >
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>{doc.filename}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleCompare}
                    disabled={!compareDocIdA || !compareDocIdB}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded text-xs font-semibold shrink-0 disabled:opacity-50"
                  >
                    Compare Files
                  </button>
                </div>

                {compareReport && (
                  <div className="glass-card rounded-xl p-6 leading-relaxed text-xs prose dark:prose-invert">
                    <div className="flex justify-between items-center border-b border-slate-850 pb-2 mb-4">
                      <div className="flex items-center space-x-1.5 text-brand-400 font-semibold text-xs">
                        <GitCompare size={14} />
                        <span>Document Comparison Report</span>
                      </div>
                      <button
                        onClick={() => handleExportMarkdown("Document Comparison", compareReport)}
                        className="flex items-center space-x-1 text-slate-400 hover:text-slate-100"
                      >
                        <Download size={14} />
                        <span>Export</span>
                      </button>
                    </div>
                    <ReactMarkdown>{compareReport}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
