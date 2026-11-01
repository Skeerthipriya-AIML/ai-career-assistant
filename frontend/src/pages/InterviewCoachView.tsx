import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  Mic, 
  MicOff, 
  Upload, 
  Play, 
  CheckCircle, 
  AlertCircle, 
  Sparkles, 
  Info, 
  Layers, 
  Video, 
  FileText, 
  TrendingUp, 
  ShieldCheck, 
  ChevronDown, 
  BookOpen,
  Copy,
  Check,
  Wand2,
  Lightbulb,
  Briefcase,
  Code2
} from 'lucide-react';
import { CodeEditor } from '../components/ui/CodeEditor';
import { VideoFeed } from '../components/ui/VideoFeed';
import confetti from 'canvas-confetti';
import { apiClient } from '../services/api';
import ReactMarkdown from 'react-markdown';

interface Question {
  id: string;
  text: string;
  type: string;
  code_boilerplate?: string;
  test_cases?: any[];
  hints?: string[];
}

interface Evaluation {
  score: number;
  feedback: string;
  star_evaluation?: {
    situation: string;
    task: string;
    action: string;
    result: string;
  };
  code_analysis?: {
    correctness: string;
    time_complexity: string;
    space_complexity: string;
  };
  strengths?: string[];
  weaknesses?: string[];
  improvement_plan?: string;
  suggestions: string[];
}

export const InterviewCoachView: React.FC = () => {
  // Modes: "practice" or "ats"
  const [mode, setMode] = useState<'practice' | 'ats'>('practice');

  // Practise settings
  const [qType, setQType] = useState<string>('technical');
  const [company, setCompany] = useState<string>('General');
  
  // Question & Session
  const [question, setQuestion] = useState<Question | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // User input
  const [answer, setAnswer] = useState<string>('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  // Microphone recording
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // ATS scanner settings
  const [jobDescription, setJobDescription] = useState<string>('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [atsResult, setAtsResult] = useState<any>(null);

  // AI Resume Tailoring Studio state
  const [tailoredResume, setTailoredResume] = useState<any | null>(null);
  const [tailoringLoading, setTailoringLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleTailorResume = async () => {
    if (!jobDescription.trim()) return;
    setTailoringLoading(true);
    try {
      const formData = new FormData();
      formData.append('job_description', jobDescription);
      if (atsResult?.missing_skills && atsResult.missing_skills.length > 0) {
        formData.append('missing_skills', atsResult.missing_skills.join(','));
      }
      const res = await apiClient.post('/coach/tailor-resume', formData);
      setTailoredResume(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate tailored resume suggestions.");
    } finally {
      setTailoringLoading(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const startInterview = async () => {
    setLoading(true);
    setQuestion(null);
    setEvaluation(null);
    setAnswer('');
    setAudioBase64(null);
    try {
      const res = await apiClient.post('/coach/question', { type: qType, company });
      setQuestion(res.data);
      if (res.data.code_boilerplate) {
        setAnswer(res.data.code_boilerplate);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to retrieve mock interview question.");
    } finally {
      setLoading(false);
    }
  };

  // Microphone record toggles
  const startRecording = async () => {
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          // Strip prefix header
          const base64Clean = base64data.split(',')[1];
          setAudioBase64(base64Clean);
        };
        // Clean up tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Audio recording permission blocked:", err);
      alert("Please allow microphone permissions to record your answer.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const submitAnswer = async () => {
    if (!question || submitting) return;
    if (!answer.trim() && !audioBase64) {
      alert("Please record audio or type text before submitting.");
      return;
    }

    setSubmitting(true);
    setEvaluation(null);

    const formData = new FormData();
    formData.append('question_id', question.id);
    formData.append('question_text', question.text);
    formData.append('question_type', question.type);
    formData.append('answer_text', answer);
    if (audioBase64) {
      formData.append('audio_base64', audioBase64);
    }
    if (sessionId) {
      formData.append('session_id', sessionId);
    }

    try {
      const res = await apiClient.post('/coach/submit-answer', formData);
      const { session_id, evaluation: evalResult, user_answer } = res.data;
      
      setSessionId(session_id);
      setEvaluation(evalResult);
      if (user_answer) {
        setAnswer(user_answer);
      }

      // Celebrate if candidate score is high!
      if (evalResult.score >= 88) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

    } catch (e) {
      console.error(e);
      alert("Failed to submit and evaluate answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResumeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeFile || !jobDescription.trim() || loading) return;

    setLoading(true);
    setAtsResult(null);
    const formData = new FormData();
    formData.append('file', resumeFile);
    formData.append('job_description', jobDescription);

    try {
      const res = await apiClient.post('/coach/ats-score', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAtsResult(res.data);
      
      // Celebrate ATS readiness!
      if (res.data.overall_score >= 80) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 } });
      }
    } catch (err) {
      alert("Error calculating ATS metrics. Verify document layout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 space-y-6 overflow-y-auto h-screen max-w-6xl mx-auto flex flex-col justify-between">
      
      {/* Mode Navigation Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
        <div className="flex items-center space-x-2.5">
          <Award className="text-brand-500" size={24} />
          <div>
            <h2 className="font-outfit font-extrabold text-xl text-slate-900 dark:text-slate-100">
              Interview Coach & Resume Analyst
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Simulate high-fidelity interviews or parse your resume against targets.
            </p>
          </div>
        </div>

        <div className="flex space-x-2 shrink-0 select-none">
          <button
            onClick={() => setMode('practice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'practice'
                ? 'bg-brand-500 text-white'
                : 'text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-850'
            }`}
          >
            Practice Sessions
          </button>
          <button
            onClick={() => setMode('ats')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              mode === 'ats'
                ? 'bg-brand-500 text-white'
                : 'text-slate-400 bg-slate-900 border border-slate-800 hover:bg-slate-850'
            }`}
          >
            ATS Resume Analyzer
          </button>
        </div>
      </div>

      {/* Main Mode Canvas Panel */}
      <div className="flex-1 my-4 overflow-y-auto">
        
        {/* practice room */}
        {mode === 'practice' && (
          <div className="space-y-6 h-full">
            {!question ? (
              /* Pre-settings setup card */
              <div className="glass-panel max-w-xl mx-auto rounded-2xl p-6 md:p-8 space-y-6 border border-slate-800/80 mt-12">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Simulate Interview Setup</span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">Question Domain</label>
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="technical">Technical Concept Q&A</option>
                      <option value="coding">Coding Sandbox Practice</option>
                      <option value="hr">Behavioral Interview (HR)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 font-semibold">Company Preset</label>
                    <select
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="General">General Preset</option>
                      <option value="Google">Google Focus</option>
                      <option value="Amazon">Amazon Focus</option>
                      <option value="Microsoft">Microsoft Focus</option>
                      <option value="Netflix">Netflix Focus</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={startInterview}
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-500/10 flex items-center justify-center space-x-1.5"
                >
                  <Play size={12} />
                  <span>{loading ? 'Generating challenge...' : 'Start Practice Room'}</span>
                </button>
              </div>
            ) : (
              /* Active interview arena */
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left practice canvas: question description & response input */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Question Prompt */}
                  <div className="glass-card rounded-xl p-5 border border-slate-800 space-y-2">
                    <div className="flex items-center space-x-2 text-[10px] text-brand-400 font-bold uppercase tracking-wider">
                      <Sparkles size={12} />
                      <span>Active Question: {question.type}</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-200 leading-relaxed">
                      {question.text}
                    </p>
                  </div>

                  {/* Input workspace depending on type */}
                  {question.type === 'coding' ? (
                    <div className="min-h-[440px] space-y-3">
                      {question.hints && question.hints.length > 0 && (
                        <div className="bg-amber-950/20 border border-amber-800/40 rounded-lg p-2.5 flex items-start space-x-2 text-xs text-amber-300">
                          <Lightbulb size={15} className="mt-0.5 text-amber-400 shrink-0" />
                          <div>
                            <span className="font-bold uppercase tracking-wider text-[10px] text-amber-400 block">Problem Hints</span>
                            <ul className="list-disc pl-4 space-y-0.5 text-amber-200/90 text-[11px]">
                              {question.hints.map((hint, idx) => (
                                <li key={idx}>{hint}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      <div className="h-[420px]">
                        <CodeEditor
                          initialCode={question.code_boilerplate || ''}
                          onRun={(code) => setAnswer(code)}
                          feedback={evaluation}
                          testCases={question.test_cases || []}
                          questionId={question.id}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Written text & speech recorder */
                    <div className="space-y-4">
                      <div className="relative">
                        <textarea
                          value={answer}
                          onChange={(e) => setAnswer(e.target.value)}
                          placeholder="Type your structured behavioral answer here, or click record below to talk..."
                          className="w-full h-44 bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-200 focus:outline-none focus:border-brand-500 leading-relaxed resize-none"
                        />
                        {/* Audio record button */}
                        <div className="absolute right-3 bottom-3 flex space-x-2">
                          <button
                            type="button"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={`p-2 rounded-full text-white transition shadow-lg ${
                              isRecording ? 'bg-red-600 animate-pulse' : 'bg-slate-800 hover:bg-slate-700'
                            }`}
                          >
                            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
                          </button>
                        </div>
                      </div>
                      
                      {audioBase64 && (
                        <div className="flex items-center space-x-2 text-[10px] text-teal-400 font-bold uppercase p-2 bg-teal-950/20 rounded border border-teal-900/40 w-fit">
                          <CheckCircle size={12} />
                          <span>Voice answer capture complete. Ready to evaluate.</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <button
                      onClick={startInterview}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200"
                    >
                      Skip Question
                    </button>
                    <button
                      onClick={submitAnswer}
                      disabled={submitting}
                      className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-brand-500/10"
                    >
                      {submitting ? 'Analyzing Answer...' : 'Submit Answer'}
                    </button>
                  </div>

                  {/* Evaluation reports panel */}
                  {evaluation && (
                    <div className="glass-panel rounded-xl p-6 space-y-6 border border-slate-800">
                      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/60 pb-4 gap-4">
                        <div className="flex items-center space-x-4">
                          <div className={`p-4 rounded-xl font-black text-2xl border ${
                            evaluation.score >= 80 
                              ? 'bg-teal-500/10 border-teal-500/20 text-teal-400' 
                              : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          }`}>
                            {evaluation.score}
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500">Practice Score</span>
                            <h4 className="text-sm font-bold text-slate-200">Interview Answer Feedback</h4>
                          </div>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses side-by-side cards */}
                      {((evaluation.strengths && evaluation.strengths.length > 0) || 
                        (evaluation.weaknesses && evaluation.weaknesses.length > 0)) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-teal-950/10 border border-teal-900/30 p-4 rounded-xl space-y-2">
                            <span className="text-[9px] uppercase font-bold text-teal-400 tracking-wider flex items-center space-x-1">
                              <CheckCircle size={10} />
                              <span>Key Strengths</span>
                            </span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                              {evaluation.strengths?.map((str, idx) => <li key={idx}>{str}</li>)}
                            </ul>
                          </div>

                          <div className="bg-red-950/10 border border-red-900/30 p-4 rounded-xl space-y-2">
                            <span className="text-[9px] uppercase font-bold text-red-400 tracking-wider flex items-center space-x-1">
                              <AlertCircle size={10} />
                              <span>Key Weaknesses</span>
                            </span>
                            <ul className="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                              {evaluation.weaknesses?.map((weak, idx) => <li key={idx}>{weak}</li>)}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* STAR checklist indicators */}
                      {evaluation.star_evaluation && (
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">STAR Methodology Scorecard</span>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Object.entries(evaluation.star_evaluation).map(([k, v]) => (
                              <div key={k} className="p-3 bg-slate-950 rounded border border-slate-900/80 text-[11px] leading-relaxed">
                                <span className="font-bold text-brand-400 uppercase tracking-widest text-[9px] block mb-1">{k}</span>
                                <span className="text-slate-300">{v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actionable Improvement Planner */}
                      {evaluation.improvement_plan && (
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 space-y-3">
                          <span className="text-[10px] uppercase font-bold text-brand-400 tracking-wider flex items-center space-x-1">
                            <TrendingUp size={12} />
                            <span>Actionable Improvement Planner</span>
                          </span>
                          <div className="text-xs leading-relaxed text-slate-300 prose dark:prose-invert font-sans">
                            <ReactMarkdown>{evaluation.improvement_plan}</ReactMarkdown>
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">Suggestions to improve</span>
                        <ul className="space-y-1.5 list-disc pl-4 text-slate-400 text-xs">
                          {evaluation.suggestions.map((sug, sIdx) => (
                            <li key={sIdx}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                </div>

                {/* Right panel: Live Video feedback monitoring widget */}
                <div className="lg:col-span-1">
                  <VideoFeed />
                </div>

              </div>
            )}
          </div>
        )}

        {/* ATS Resume Analyzer view */}
        {mode === 'ats' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left form inputs */}
              <form onSubmit={handleResumeUpload} className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Upload Career Credentials</span>
                
                {/* File Drop */}
                <div className="relative border-2 border-dashed border-slate-800 hover:border-brand-500/80 rounded-xl p-8 transition-colors flex flex-col items-center justify-center cursor-pointer">
                  <input
                    type="file"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                    required
                    accept=".pdf,.docx,.doc,.txt"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Upload className="text-slate-500 mb-2" size={32} />
                  {resumeFile ? (
                    <span className="text-xs font-semibold text-brand-400">{resumeFile.name}</span>
                  ) : (
                    <span className="text-xs text-slate-400">Drag & Drop Resume (PDF, Word, TXT)</span>
                  )}
                </div>

                {/* JD Target */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400">Target Job Description (JD)</label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    required
                    placeholder="Paste the target job qualifications details here..."
                    className="w-full h-36 bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-brand-500 leading-relaxed resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !resumeFile || !jobDescription.trim()}
                  className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold rounded-lg shadow-lg disabled:opacity-50"
                >
                  {loading ? 'Evaluating ATS compliance score...' : 'Scan Resume Compatibility'}
                </button>
              </form>

              {/* Right ATS output dashboard */}
              <div className="lg:col-span-1">
                {atsResult ? (
                  <div className="bg-[#0c1222] border border-slate-800 rounded-xl p-5 space-y-6 shadow-xl">
                    <div className="flex items-center space-x-4 border-b border-slate-800 pb-4">
                      <div className="p-4 rounded-xl font-black text-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                        {atsResult.overall_score}%
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500">Overall ATS Score</span>
                        <h4 className="text-xs font-semibold text-slate-300">Format Check: {atsResult.formatting_score}%</h4>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-teal-500 tracking-wider block">
                          Matched Keywords ({atsResult.matched_skills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {atsResult.matched_skills && atsResult.matched_skills.length > 0 ? (
                            atsResult.matched_skills.map((sk: string) => (
                              <span key={sk} className="px-2 py-0.5 rounded bg-teal-950/30 border border-teal-900/60 text-[10px] text-teal-300 font-semibold">
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-slate-500 italic">None detected</span>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-[9px] uppercase font-bold text-red-500 tracking-wider block">
                          Missing Keywords ({atsResult.missing_skills?.length || 0})
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {atsResult.missing_skills && atsResult.missing_skills.length > 0 ? (
                            atsResult.missing_skills.map((sk: string) => (
                              <span key={sk} className="px-2 py-0.5 rounded bg-red-950/30 border border-red-900/60 text-[10px] text-red-300 font-semibold">
                                {sk}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-teal-400 italic">All target skills present!</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Suggestions & Action Items</span>
                      <ul className="space-y-1.5 list-disc pl-4 text-slate-400 text-[11px] leading-relaxed">
                        {atsResult.suggestions?.map((sug: string, idx: number) => (
                          <li key={idx}>{sug}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Button to tailor resume directly */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleTailorResume}
                        disabled={tailoringLoading}
                        className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-lg flex items-center justify-center space-x-2 transition"
                      >
                        <Wand2 size={14} className={tailoringLoading ? 'animate-spin' : ''} />
                        <span>{tailoringLoading ? 'Generating Tailored Content...' : 'Auto-Optimize Resume for this Role'}</span>
                      </button>
                    </div>

                    {/* Learning Roadmap display inside ATS results */}
                    {atsResult.learning_roadmap && (
                      <div className="pt-3 border-t border-slate-800 space-y-2 select-text">
                        <span className="text-[9px] uppercase font-bold text-brand-400 tracking-wider block flex items-center space-x-1">
                          <BookOpen size={10} />
                          <span>Learning Study Roadmap</span>
                        </span>
                        <div className="text-[10.5px] leading-relaxed text-slate-400 prose dark:prose-invert font-sans max-h-48 overflow-y-auto bg-slate-950 p-2.5 rounded border border-slate-900">
                          <ReactMarkdown>{atsResult.learning_roadmap}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center p-8 bg-slate-900/50 border border-slate-800 rounded-xl min-h-[300px] text-slate-600 font-mono text-xs select-none">
                    Upload resume and JD to output compatibility analysis report.
                  </div>
                )}
              </div>

            </div>

            {/* AI Resume Optimizer & Tailoring Studio */}
            <div className="mt-8 border border-slate-800 bg-[#0a0f1d] rounded-2xl p-6 shadow-2xl space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                      <Wand2 size={16} />
                    </div>
                    <h3 className="text-base font-bold text-slate-100">AI Resume Optimizer & Tailoring Studio</h3>
                    <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded text-[10px] font-bold">
                      B.Tech Career Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Instantly rewrite your summary, generate high-impact quantified bullet points, and discover fast-track portfolio projects to crack ATS screenings.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTailorResume}
                  disabled={tailoringLoading || !jobDescription.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center space-x-2 shrink-0"
                >
                  <Wand2 size={14} className={tailoringLoading ? 'animate-spin' : ''} />
                  <span>{tailoringLoading ? 'Optimizing...' : 'Generate Tailored Resume'}</span>
                </button>
              </div>

              {tailoredResume ? (
                <div className="space-y-6">
                  {/* 1. Tailored Professional Summary */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center space-x-1.5">
                        <Briefcase size={13} />
                        <span>Tailored Professional Summary (Ready for Resume Header)</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(tailoredResume.tailored_summary, 'summary')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center space-x-1 transition"
                      >
                        {copiedKey === 'summary' ? (
                          <>
                            <Check size={12} className="text-teal-400" />
                            <span className="text-teal-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy Summary</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-950 p-3.5 rounded-lg border border-slate-800/80 font-sans">
                      {tailoredResume.tailored_summary}
                    </p>
                  </div>

                  {/* 2. Quantified Resume Bullet Points */}
                  <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center space-x-1.5">
                        <TrendingUp size={13} />
                        <span>High-Impact Quantified Bullet Points (For Experience / Projects)</span>
                      </span>
                      <button
                        onClick={() => copyToClipboard(tailoredResume.optimized_bullet_points.join('\n• '), 'all_bullets')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center space-x-1 transition"
                      >
                        {copiedKey === 'all_bullets' ? (
                          <>
                            <Check size={12} className="text-teal-400" />
                            <span className="text-teal-400">Copied All!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Copy All Bullets</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {tailoredResume.optimized_bullet_points?.map((bp: string, idx: number) => (
                        <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-slate-950 border border-slate-800/70 text-xs text-slate-300 gap-3">
                          <span className="text-slate-200 leading-relaxed">• {bp}</span>
                          <button
                            onClick={() => copyToClipboard(bp, `bp_${idx}`)}
                            className="p-1 text-slate-400 hover:text-slate-200 shrink-0"
                            title="Copy bullet point"
                          >
                            {copiedKey === `bp_${idx}` ? (
                              <Check size={12} className="text-teal-400" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 3. B.Tech Fast-Track Portfolio Projects */}
                  <div className="space-y-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center space-x-1.5">
                      <Code2 size={13} />
                      <span>Recommended B.Tech Fast-Track Portfolio Projects</span>
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {tailoredResume.btech_portfolio_projects?.map((proj: any, idx: number) => (
                        <div key={idx} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2.5 hover:border-slate-700 transition">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-slate-100">{proj.title}</h4>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/40 border border-indigo-800/60 text-indigo-300 font-mono">
                              {proj.tech_stack}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {proj.description}
                          </p>
                          <div className="pt-2 border-t border-slate-800/60 flex items-center space-x-1.5 text-[10px] text-teal-400">
                            <CheckCircle size={11} />
                            <span><strong>Recruiter Value:</strong> {proj.impact}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4. Top Interview Questions for this Role */}
                  {tailoredResume.interview_questions_for_role && (
                    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
                        <Award size={13} />
                        <span>Expected Interview Questions For This Target Position</span>
                      </span>
                      <div className="space-y-2">
                        {tailoredResume.interview_questions_for_role.map((q: string, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg text-xs text-slate-300 flex items-center justify-between gap-3">
                            <span className="leading-relaxed"><strong>Q{idx + 1}:</strong> {q}</span>
                            <button
                              onClick={() => {
                                setMode('practice');
                                setQuestion({
                                  id: `custom_${idx}`,
                                  text: q,
                                  type: 'technical'
                                });
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="px-2 py-1 bg-brand-500/20 hover:bg-brand-500/30 text-brand-400 rounded text-[10px] font-bold shrink-0 border border-brand-500/30"
                            >
                              Practice This Question
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-dashed border-slate-800/80 space-y-2">
                  <Wand2 size={24} className="mx-auto text-indigo-400/60" />
                  <h4 className="text-xs font-semibold text-slate-300">Ready to boost your resume?</h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                    Paste a Target Job Description above and click "Generate Tailored Resume" to get role-specific bullet points, summary, and portfolio recommendations.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>

    </div>
  );
};
