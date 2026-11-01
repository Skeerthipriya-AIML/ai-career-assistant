import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TermIcon, 
  Play, 
  HelpCircle, 
  CheckCircle, 
  AlertTriangle,
  RotateCcw,
  Compass,
  Cpu,
  Square,
  Clock,
  Activity,
  FileText,
  ChevronRight,
  ChevronDown,
  Check,
  X
} from 'lucide-react';
import { apiClient } from '../services/api';

interface AgentStep {
  step: number;
  thought: string;
  tool?: string;
  tool_input?: string;
  observation?: string;
  status?: 'STARTED' | 'COMPLETED' | 'FAILED' | 'RETRYING' | 'CANCELLED';
}

interface TelemetryMetrics {
  planner_latency_ms: number;
  tool_latency_ms: number;
  reflection_latency_ms: number;
  total_latency_ms: number;
  tool_calls_count: number;
  retry_count: number;
}

export const AgentView: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [output, setOutput] = useState<string>('');
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [success, setSuccess] = useState<boolean>(false);
  const [executionId, setExecutionId] = useState<string>('');
  const [streamStatus, setStreamStatus] = useState<string>('');
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [metrics, setMetrics] = useState<TelemetryMetrics | null>(null);
  const [timelineExpanded, setTimelineExpanded] = useState<boolean>(true);

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [steps]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent, overridePrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = overridePrompt || prompt;
    if (!promptToSend.trim() || loading) return;

    if (!overridePrompt) {
      setPrompt('');
    }
    setLoading(true);
    setSteps([]);
    setOutput('');
    setSuccess(false);
    setExecutionId('');
    setMetrics(null);
    setStreamStatus('Spawning LangGraph agent worker...');

    // Start timer ticker
    setElapsedTime(0);
    if (timerRef.current) clearInterval(timerRef.current);
    const startTick = Date.now();
    timerRef.current = window.setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTick) / 1000));
    }, 1000);

    const formData = new FormData();
    formData.append('prompt', promptToSend);

    const token = localStorage.getItem('token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/agent/execute`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData,
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error("Agent loop execute query failure.");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("Stream reader not supported.");

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
            const { event_type, execution_id: resId, node_name, status, payload } = parsed;

            if (resId) setExecutionId(resId);

            if (event_type === 'agent_started') {
              setStreamStatus('Formulating execution roadmap...');
            } else if (event_type === 'tool_completed') {
              const { tool, input, observation, latency_ms } = payload;
              setSteps((prev) => [
                ...prev,
                {
                  step: prev.length + 1,
                  thought: `Tool completed: ${tool}`,
                  tool: tool,
                  tool_input: input,
                  observation: observation,
                  status: status
                }
              ]);
            } else if (event_type === 'node_transition') {
              const { thought, node_output } = payload;
              if (node_name === 'plan') {
                setStreamStatus('Task workflow roadmap finalized. Deciding step...');
              } else if (node_name === 'decide') {
                setStreamStatus('Orchestrating optimal tools match...');
              } else if (node_name === 'reflect') {
                setStreamStatus('Reflecting on generated observations...');
              }

              if (thought) {
                setSteps((prev) => [
                  ...prev,
                  {
                    step: prev.length + 1,
                    thought: thought,
                    status: 'COMPLETED'
                  }
                ]);
              }
            } else if (event_type === 'completed') {
              const { output: finalOut, metrics: resMetrics } = payload;
              setOutput(finalOut);
              setMetrics(resMetrics);
              setSuccess(status === 'COMPLETED');
              setStreamStatus('');
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
            } else if (event_type === 'done') {
              setStreamStatus('');
              if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
              }
            }
          } catch (err) {
            console.error("Error decoding stream: ", err, line);
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.log("Graph process cancelled by client controller.");
        setStreamStatus('Cancelled.');
      } else {
        console.error(err);
        setStreamStatus('Failure.');
        setOutput("An error occurred executing your instruction guidelines.");
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreamStatus('Cancellation requested.');
    setLoading(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (executionId) {
      try {
        await apiClient.post(`/agent/cancel/${executionId}`);
        setSteps((prev) => [
          ...prev,
          {
            step: prev.length + 1,
            thought: "Execution cancelled by operator command.",
            status: 'CANCELLED'
          }
        ]);
      } catch (e) {
        console.error("Failed to commit cancel: ", e);
      }
    }
  };

  const handleClear = () => {
    setPrompt('');
    setSteps([]);
    setOutput('');
    setSuccess(false);
    setExecutionId('');
    setElapsedTime(0);
    setMetrics(null);
  };

  return (
    <div className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto h-screen max-w-6xl mx-auto flex flex-col justify-between bg-[#080b11]">
      
      {/* Title Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center space-x-2.5">
          <TermIcon className="text-brand-500" size={24} />
          <div>
            <h2 className="font-outfit font-extrabold text-xl text-slate-100">
              AI Agent Terminal
            </h2>
            <p className="text-xs text-slate-400">
              Submits multi-step career tasks. Decides, reflects, and retries automatically.
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {loading && (
            <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300">
              <Clock size={12} className="animate-spin text-brand-400" />
              <span>Elapsed: {elapsedTime}s</span>
            </div>
          )}
          
          <button
            onClick={handleClear}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-100 hover:bg-slate-900 transition"
          >
            <RotateCcw size={12} />
            <span>Clear Console</span>
          </button>
        </div>
      </div>

      {/* Main Terminal and Output Panel */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden my-4">
        
        {/* Terminal Screen Console */}
        <div className="lg:col-span-2 bg-[#050912] border border-slate-800/80 rounded-xl overflow-hidden shadow-2xl flex flex-col h-[350px] lg:h-auto">
          {/* Header tab */}
          <div className="px-4 py-2.5 bg-[#090f1d] border-b border-slate-800 flex items-center justify-between">
            <button 
              onClick={() => setTimelineExpanded(!timelineExpanded)}
              className="flex items-center space-x-2 focus:outline-none"
            >
              {timelineExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">ReAct Console steps</span>
            </button>
            
            <div className="flex items-center space-x-3">
              {executionId && (
                <span className="text-[9px] font-mono text-slate-500">Run ID: {executionId}</span>
              )}
              <div className="flex space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                <span className="w-2 h-2 rounded-full bg-slate-800"></span>
                <span className="w-2 h-2 rounded-full bg-slate-800"></span>
              </div>
            </div>
          </div>
 
          {/* Terminal Console Logs */}
          <div className="flex-1 p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-y-auto space-y-4">
            {steps.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 text-center select-none py-12">
                <Compass className="animate-float mb-2 text-slate-800" size={32} />
                <span>Console idle. Submit prompts below to trigger the reasoning loop.</span>
              </div>
            ) : (
              timelineExpanded && steps.map((st, sIdx) => (
                <div key={sIdx} className="space-y-1.5 border-l border-slate-850 pl-3">
                  <div className="text-brand-400 font-bold flex items-center space-x-2">
                    <span>[STEP {st.step}]</span>
                    {st.status && (
                      <span className={`text-[9px] font-semibold uppercase px-1 py-0.2 rounded border ${
                        st.status === 'COMPLETED' ? 'bg-green-950/20 border-green-900/50 text-green-400' :
                        st.status === 'FAILED' ? 'bg-red-950/20 border-red-900/50 text-red-400' :
                        st.status === 'CANCELLED' ? 'bg-slate-900 border-slate-800 text-slate-400' :
                        'bg-yellow-950/20 border-yellow-900/50 text-yellow-400'
                      }`}>{st.status}</span>
                    )}
                  </div>
                  <p className="text-slate-200">
                    <span className="text-slate-600">&gt; </span>{st.thought}
                  </p>
                  
                  {st.tool && st.tool !== "None" && (
                    <div className="text-teal-400 ml-3 py-1 flex items-center space-x-1.5">
                      <span className="text-slate-600">Tool:</span>
                      <span className="bg-teal-950/40 border border-teal-900/40 px-1.5 py-0.5 rounded font-bold text-[10px]">{st.tool}</span>
                      <span className="text-slate-600">| Args:</span>
                      <span className="italic text-slate-300">"{st.tool_input}"</span>
                    </div>
                  )}
                  
                  {st.observation && (
                    <div className="bg-slate-950 p-2.5 rounded border border-slate-900 text-slate-400 ml-3 text-[10px] whitespace-pre-wrap leading-normal font-sans select-text">
                      <div className="text-slate-500 font-bold uppercase tracking-widest text-[8px] mb-1 font-mono">Observation:</div>
                      {st.observation}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>
 
        {/* Final output panel */}
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 flex flex-col justify-between overflow-hidden shadow-lg h-[350px] lg:h-auto space-y-4">
          <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Final Output Answer</span>
            <div className="flex-1 text-xs text-slate-300 leading-relaxed bg-slate-950 p-4 rounded-lg border border-slate-910 overflow-y-auto font-sans select-text">
              {output ? (
                <p className="whitespace-pre-wrap">{output}</p>
              ) : (
                <span className="text-slate-600 font-mono italic">Waiting for terminal compiled execution output...</span>
              )}
            </div>
          </div>
 
          {/* Telemetry Metrics cards */}
          {metrics && (
            <div className="pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/20 p-2 rounded">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-slate-500">Total Latency</span>
                <span className="font-bold text-slate-200">{Math.round(metrics.total_latency_ms)}ms</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-slate-500">Planner Time</span>
                <span className="font-bold text-slate-200">{Math.round(metrics.planner_latency_ms)}ms</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-slate-500">Tool Calls</span>
                <span className="font-bold text-slate-200">{metrics.tool_calls_count} calls</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-wider text-slate-500">Retries count</span>
                <span className="font-bold text-slate-200">{metrics.retry_count} times</span>
              </div>
            </div>
          )}
 
          {output && (
            <div className="shrink-0">
              {success ? (
                <div className="flex items-center space-x-1.5 p-3 bg-teal-950/20 border border-teal-900/50 rounded-lg text-teal-400 text-xs">
                  <CheckCircle size={14} className="shrink-0" />
                  <span>Task resolved successfully.</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 p-3 bg-amber-950/20 border border-amber-900/50 rounded-lg text-amber-400 text-xs">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>Agent loop failed or terminated.</span>
                </div>
              )}
            </div>
          )}
        </div>
 
      </div>

      {/* Suggested Prompts Tag bar */}
      {!loading && steps.length === 0 && (
        <div className="space-y-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Quick Action Tasks Templates</span>
          <div className="flex flex-wrap gap-2">
            {[
              "Calculate salary expectations (12340 * 1.15) and summarize New York cost indices.",
              "Read local file target instructions and generate a career report summary.",
              "Search the web for the latest ML Software Engineer jobs and list target skills."
            ].map((suggested, sIdx) => (
              <button
                key={sIdx}
                onClick={() => handleSubmit({ preventDefault: () => {} } as React.FormEvent, suggested)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white hover:border-slate-700 transition text-left"
              >
                {suggested}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading Cancel overlay bar */}
      {loading && (
        <div className="px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between shrink-0 animate-pulse text-xs">
          <div className="flex items-center space-x-3 text-brand-400">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping"></span>
            <span>{streamStatus || 'Orchestrating agent workflows...'}</span>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-bold uppercase text-[10px] transition flex items-center space-x-1.5"
          >
            <Square size={10} fill="currentColor" />
            <span>Stop Execution</span>
          </button>
        </div>
      )}
 
      {/* Input Prompt Box */}
      {!loading && (
        <form onSubmit={handleSubmit} className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex space-x-3 shrink-0">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="E.g., calculate 423 * 872 and check the current weather in New York..."
            className="flex-1 bg-[#05070c] border border-slate-800 text-slate-200 text-sm px-4 py-2.5 rounded-lg focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
          />
          <button
            type="submit"
            disabled={!prompt.trim()}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg shadow-lg shadow-brand-500/10 transition disabled:opacity-50 flex items-center space-x-1.5 text-xs font-semibold"
          >
            <Play size={12} />
            <span>Run Agent</span>
          </button>
        </form>
      )}
 
    </div>
  );
};
