import React, { useState } from 'react';
import { Code, Download, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

export const CodeBlock = ({ match, codeStr, props, children }: any) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const downloadCode = () => {
    const element = document.createElement("a");
    const file = new Blob([codeStr], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `code.${match[1] || 'txt'}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleCopy = () => {
     navigator.clipboard.writeText(codeStr);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden my-4 text-sm font-mono border border-border/50 bg-[#1e1e1e] shadow-sm">
      <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-white/5 select-none text-gray-300">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium tracking-wide">Code</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleCopy} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Copy code">
             {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={downloadCode} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Download file">
             <Download className="w-4 h-4" />
          </button>
          <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/10 rounded-md transition-colors flex items-center gap-1.5">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            <span className="text-[10px] uppercase font-bold tracking-wider">{isExpanded ? 'Collapse' : 'Expand'}</span>
          </button>
        </div>
      </div>
      {isExpanded && (
        <SyntaxHighlighter
          {...props}
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          className="!m-0 !bg-transparent !p-4 custom-scrollbar text-[13px]"
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )}
    </div>
  );
};
