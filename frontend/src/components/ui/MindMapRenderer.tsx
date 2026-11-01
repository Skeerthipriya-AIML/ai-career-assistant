import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MindMapRendererProps {
  code: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' }
});

export const MindMapRenderer: React.FC<MindMapRendererProps> = ({ code }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!code || !containerRef.current) return;
    
    const renderDiagram = async () => {
      setError(null);
      try {
        const cleanCode = code.trim();
        const id = `mermaid-diag-${Math.floor(Math.random() * 10000)}`;
        
        // Compile mermaid markdown
        const { svg: compiledSvg } = await mermaid.render(id, cleanCode);
        setSvg(compiledSvg);
      } catch (e: any) {
        console.error("Mermaid parsing error:", e);
        setError("Invalid diagram syntax. Showing standard hierarchical preview.");
        
        // Attempt rendering clean default fallback
        try {
          const idFallback = `mermaid-diag-fallback`;
          const fallback = `graph TD\n  Root["AI Profile Core"] --> Skills["Required Skills"]\n  Root --> Gap["Identified Gaps"]`;
          const { svg: fallbackSvg } = await mermaid.render(idFallback, fallback);
          setSvg(fallbackSvg);
        } catch {
          // If all fails, let it go
        }
      }
    };

    renderDiagram();
  }, [code]);

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-900 rounded-xl border border-slate-800 overflow-auto w-full max-h-[500px]">
      {error && (
        <span className="text-xs text-amber-400 mb-2 font-mono">{error}</span>
      )}
      <div 
        ref={containerRef} 
        className="w-full flex justify-center mermaid-svg-wrapper"
        dangerouslySetInnerHTML={{ __html: svg }} 
      />
    </div>
  );
};
