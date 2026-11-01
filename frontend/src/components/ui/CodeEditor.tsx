import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, AlertCircle, CheckCircle, Terminal, CheckSquare } from 'lucide-react';
import { apiClient } from '../../services/api';

interface TestCaseResult {
  id: number;
  input: string;
  expected: string;
  actual: string;
  status: string;
}

interface CodeEditorProps {
  initialCode: string;
  onRun: (code: string) => void;
  isLoading?: boolean;
  feedback?: any;
  testCases?: any[];
  questionId?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  initialCode,
  onRun,
  isLoading = false,
  feedback,
  testCases = [],
  questionId
}) => {
  const [code, setCode] = useState<string>(initialCode);
  const [stdout, setStdout] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [rightTab, setRightTab] = useState<'tests' | 'console'>('tests');
  const [testResults, setTestResults] = useState<TestCaseResult[]>([]);
  const [passRate, setPassRate] = useState<{ passed: number; total: number } | null>(null);

  useEffect(() => {
    setCode(initialCode);
    setStdout('');
    setTestResults([]);
    setPassRate(null);
  }, [initialCode]);

  const handleReset = () => {
    setCode(initialCode);
    setStdout('');
    setTestResults([]);
    setPassRate(null);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRightTab('tests');
    onRun(code);

    try {
      const formData = new FormData();
      formData.append('code', code);
      if (questionId) formData.append('question_id', questionId);

      const res = await apiClient.post('/coach/run-tests', formData);
      const data = res.data;
      setTestResults(data.test_cases || []);
      setPassRate({ passed: data.passed_count, total: data.total_count });
      setStdout(data.stdout || "Code executed successfully.");
    } catch (e: any) {
      setStdout(`Execution error: ${e.response?.data?.detail || e.message}`);
      setRightTab('console');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0f1d] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Tab bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#0d1527] border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-xs font-mono text-slate-400 ml-2">solution.py</span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleReset}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
          <button
            onClick={handleRun}
            disabled={isLoading || isRunning}
            className="flex items-center space-x-1 px-3.5 py-1 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded shadow-lg shadow-brand-500/10 transition disabled:opacity-50"
          >
            <Play size={12} />
            <span>{isLoading || isRunning ? 'Testing...' : 'Run Tests'}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="flex-1 flex flex-col md:flex-row min-h-[320px]">
        {/* Input Textarea */}
        <div className="flex-1 relative flex">
          {/* Virtual Line Numbers */}
          <div className="w-10 py-3 bg-[#0d1527] border-r border-slate-800/80 text-right pr-2 font-mono text-xs text-slate-600 select-none">
            {Array.from({ length: Math.max(code.split('\n').length, 14) }).map((_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
          
          <textarea
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              onRun(e.target.value);
            }}
            className="flex-1 p-3 bg-transparent text-slate-100 font-mono text-xs focus:outline-none resize-none leading-relaxed overflow-auto"
            style={{ tabSize: 4 }}
            placeholder="# Write Python solution here..."
          />
        </div>

        {/* Console & Test Cases Panel */}
        <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-800 bg-[#080c16] flex flex-col justify-between">
          {/* Panel Tabs */}
          <div className="flex border-b border-slate-800 bg-[#0b101e] px-2 pt-2 space-x-2">
            <button
              onClick={() => setRightTab('tests')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg transition ${
                rightTab === 'tests'
                  ? 'bg-[#080c16] text-brand-300 border-t-2 border-brand-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CheckSquare size={13} />
              <span>Test Cases {passRate && `(${passRate.passed}/${passRate.total})`}</span>
            </button>
            <button
              onClick={() => setRightTab('console')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-t-lg transition ${
                rightTab === 'console'
                  ? 'bg-[#080c16] text-brand-300 border-t-2 border-brand-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal size={13} />
              <span>Console</span>
            </button>
          </div>

          <div className="flex-1 p-3 overflow-y-auto max-h-[300px] md:max-h-none space-y-2">
            {rightTab === 'tests' ? (
              <div className="space-y-2.5">
                {passRate && (
                  <div className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between ${
                    passRate.passed === passRate.total
                      ? 'bg-teal-950/20 border-teal-800/60 text-teal-400'
                      : 'bg-amber-950/20 border-amber-800/60 text-amber-400'
                  }`}>
                    <span>Test Suite Verdict:</span>
                    <span>{passRate.passed} / {passRate.total} Passed ({passRate.passed === passRate.total ? 'Accepted' : 'Failed'})</span>
                  </div>
                )}

                {testResults.length > 0 ? (
                  testResults.map((tc) => (
                    <div key={tc.id} className="p-2.5 bg-slate-950 rounded border border-slate-800/80 text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-400 font-mono">Case {tc.id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          tc.status === 'PASSED' ? 'bg-teal-500/20 text-teal-300' : 'bg-red-500/20 text-red-300'
                        }`}>
                          {tc.status}
                        </span>
                      </div>
                      <div className="text-slate-300 font-mono text-[10px] truncate"><span className="text-slate-500">Input:</span> {tc.input}</div>
                      <div className="text-slate-300 font-mono text-[10px] truncate"><span className="text-slate-500">Expected:</span> {tc.expected}</div>
                      <div className="text-slate-300 font-mono text-[10px] truncate"><span className="text-slate-500">Output:</span> {tc.actual}</div>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400 font-medium">Click <strong>Run Tests</strong> above to verify your solution against the test runner.</p>
                    {testCases.map((tc, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-950/60 rounded border border-slate-800/50 text-[11px] space-y-1">
                        <div className="text-slate-400 font-mono font-bold">Sample Case {idx + 1}</div>
                        <div className="text-slate-400 font-mono text-[10px]"><span className="text-slate-500">Input:</span> {tc.input}</div>
                        <div className="text-slate-400 font-mono text-[10px]"><span className="text-slate-500">Expected:</span> {tc.expected}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#05070d] p-3 rounded border border-slate-800/50 font-mono text-[11px] text-slate-300 whitespace-pre-wrap min-h-[140px]">
                {stdout || 'Terminal initialized. Click Run Tests to compile and execute.'}
              </div>
            )}
          </div>

          {/* AI Evaluator review summary inside editor pane */}
          {feedback && (
            <div className="p-3 bg-brand-950/30 border-t border-slate-800">
              <div className="flex items-center space-x-1.5 text-brand-400 font-semibold text-xs mb-1.5">
                <CheckCircle size={14} />
                <span>AI Code Evaluation</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Score:</span>
                  <span className="text-brand-300 font-bold">{feedback.score}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Time Complexity:</span>
                  <span className="text-teal-400 font-mono font-bold">{feedback.code_analysis?.time_complexity || 'O(N)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Space Complexity:</span>
                  <span className="text-teal-400 font-mono font-bold">{feedback.code_analysis?.space_complexity || 'O(1)'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
