import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Check, Copy } from 'lucide-react';

export const CodeBlock = ({ code, language, title }: { code: string, language?: string, title?: React.ReactNode }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Card className="bg-muted/60 dark:bg-[#0D1117] border-border/40 mt-4 mb-8 overflow-hidden rounded-xl">
      {title && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/40 bg-muted dark:bg-[#161B22] font-mono text-xs text-muted-foreground">
          {title}
        </div>
      )}
      <div className="relative group">
        <button onClick={handleCopy} className="absolute right-3 top-3 p-1.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 opacity-0 group-hover:opacity-100 transition-all z-10 backdrop-blur-sm">
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
        </button>
        <div className="p-4 overflow-x-auto">
          <pre className="text-[13px] leading-relaxed font-mono">
            <code className={`text-black dark:text-zinc-300 ${language ? `language-${language}` : ''}`}>{code}</code>
          </pre>
        </div>
      </div>
    </Card>
  );
};
