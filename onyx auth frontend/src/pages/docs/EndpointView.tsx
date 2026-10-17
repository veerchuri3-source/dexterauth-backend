import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocsEndpoint, DocsMarkdown } from './docsData';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Badge } from '@/components/ui/badge';
import { Info, AlertTriangle, AlertCircle, Lightbulb, ShieldAlert } from 'lucide-react';

const MultiCodeBlock = ({ samples }: { samples: { language: string, code: string }[] }) => {
  const [activeIdx, setActiveIdx] = useState(0);
  if (!samples || samples.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-muted/10 overflow-hidden mb-8">
      <div className="flex border-b border-border/50 bg-muted/20">
        {samples.map((s, idx) => (
          <button
            key={idx}
            onClick={() => setActiveIdx(idx)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${activeIdx === idx ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
          >
            {s.language.charAt(0).toUpperCase() + s.language.slice(1)}
          </button>
        ))}
      </div>
      <div className="p-4">
        <CodeBlock code={samples[activeIdx].code} language={samples[activeIdx].language} />
      </div>
    </div>
  );
};

export const EndpointView = ({ node }: { node: DocsEndpoint | DocsMarkdown }) => {
  if (node.type === 'markdown') {
    const hasH1InContent = node.content.trim().startsWith('# ');
    return (
      <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        {!hasH1InContent && (
          <h1 className="text-3xl font-bold mb-6 tracking-tight">{node.title}</h1>
        )}
        <div className="prose prose-invert max-w-none text-muted-foreground prose-h1:text-white prose-headings:text-white prose-strong:text-white prose-a:text-blue-400">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              blockquote: ({ node, children, ...props }) => {
                const getFirstText = (nodes: React.ReactNode): string => {
                  const arr = React.Children.toArray(nodes);
                  for (const child of arr) {
                    if (typeof child === 'string') {
                      if (child.trim() !== '') return child;
                    } else if (React.isValidElement(child) && child.props && child.props.children) {
                      const txt = getFirstText(child.props.children);
                      if (txt.trim() !== '') return txt;
                    }
                  }
                  return '';
                };

                const firstText = getFirstText(children);
                const isAlert = firstText.trim().match(/^\[!(WARNING|CAUTION|NOTE|IMPORTANT|TIP)\]/i);

                if (isAlert) {
                  const type = isAlert[1].toUpperCase();
                  const pattern = /^\[!(WARNING|CAUTION|NOTE|IMPORTANT|TIP)\]\s*/i;

                  const cleanFirstText = (nodes: React.ReactNode, rx: RegExp): { cleaned: React.ReactNode, done: boolean } => {
                    let done = false;
                    const cleaned = React.Children.map(nodes, (child) => {
                      if (done) return child;
                      if (typeof child === 'string') {
                        if (child.trim() !== '') {
                          done = true;
                          return child.replace(rx, '').trimStart();
                        }
                        return child;
                      }
                      if (React.isValidElement(child) && child.props && child.props.children) {
                        const result = cleanFirstText(child.props.children, rx);
                        if (result.done) {
                          done = true;
                          return React.cloneElement(child as any, {}, result.cleaned);
                        }
                      }
                      return child;
                    });
                    return { cleaned, done };
                  };

                  const { cleaned: cleanedChildren } = cleanFirstText(children, pattern);

                  let boxStyles = '';
                  let icon = null;
                  let title = '';

                  if (type === 'WARNING') {
                    boxStyles = 'bg-amber-500/10 border-l-4 border-amber-500 text-amber-200/90 rounded-r-lg';
                    icon = <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />;
                    title = 'Warning';
                  } else if (type === 'CAUTION') {
                    boxStyles = 'bg-red-500/10 border-l-4 border-red-500 text-red-200/90 rounded-r-lg';
                    icon = <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />;
                    title = 'Caution';
                  } else if (type === 'NOTE') {
                    boxStyles = 'bg-blue-500/10 border-l-4 border-blue-500 text-blue-200/90 rounded-r-lg';
                    icon = <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />;
                    title = 'Note';
                  } else if (type === 'IMPORTANT') {
                    boxStyles = 'bg-violet-500/10 border-l-4 border-violet-500 text-violet-200/90 rounded-r-lg';
                    icon = <ShieldAlert className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />;
                    title = 'Important';
                  } else if (type === 'TIP') {
                    boxStyles = 'bg-emerald-500/10 border-l-4 border-emerald-500 text-emerald-200/90 rounded-r-lg';
                    icon = <Lightbulb className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />;
                    title = 'Tip';
                  }

                  return (
                    <div className={`p-4 my-6 flex gap-3 ${boxStyles} not-prose`}>
                      {icon}
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs uppercase tracking-wider block mb-1">{title}</span>
                        <div className="text-sm leading-relaxed">{cleanedChildren}</div>
                      </div>
                    </div>
                  );
                }

                return (
                  <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-6 text-muted-foreground">
                    {children}
                  </blockquote>
                );
              }
            }}
          >
            {node.content}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  const endpoint = node as DocsEndpoint;

  const methodColors: Record<string, string> = {
    'GET': 'bg-green-500/10 text-green-500 border-green-500/20',
    'POST': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };

  return (
    <div className="max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{endpoint.title}</h1>
        {endpoint.method && (
          <Badge className={`text-xs font-bold px-2 py-1 ${methodColors[endpoint.method] || 'bg-muted'}`} variant="outline">
            {endpoint.method}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/30 border border-border/50 mb-6 font-mono text-sm text-muted-foreground break-all">
        {endpoint.url || 'N/A'}
      </div>

      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        {endpoint.description}
      </p>

      {endpoint.infoAlert && (
        <div className="flex gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 mb-8">
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5 text-blue-400" />
          <div className="text-sm leading-relaxed">{endpoint.infoAlert}</div>
        </div>
      )}

      {/* Body Params */}
      {endpoint.bodyParams && endpoint.bodyParams.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 border-b border-border/50 pb-2">Body Parameters</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-muted/20">
                  <th className="py-3 px-4 text-sm font-semibold text-muted-foreground w-1/4">Name</th>
                  <th className="py-3 px-4 text-sm font-semibold text-muted-foreground w-1/6">Type</th>
                  <th className="py-3 px-4 text-sm font-semibold text-muted-foreground w-1/2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {endpoint.bodyParams.map((p, idx) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-medium text-foreground">{p.name}</span>
                        {p.required ? (
                          <span className="text-[10px] font-bold text-red-400 uppercase">Required</span>
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">Optional</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs text-primary">{p.type}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-muted-foreground mb-1">{p.description}</div>
                      <div className="text-xs text-muted-foreground/70 font-mono">Example: {p.example}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Code Samples */}
      {endpoint.codeSamples && endpoint.codeSamples.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 border-b border-border/50 pb-2">Request Code Samples</h3>
          <MultiCodeBlock samples={endpoint.codeSamples} />
        </div>
      )}

      {/* Responses */}
      {endpoint.responses && endpoint.responses.length > 0 && (
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-4 border-b border-border/50 pb-2">Responses</h3>
          <div className="space-y-4">
            {endpoint.responses.map((r, idx) => (
              <div key={idx} className="rounded-xl border border-border/50 overflow-hidden bg-muted/5">
                <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 bg-muted/20">
                  <div className={`w-2 h-2 rounded-full ${r.status >= 200 && r.status < 300 ? 'bg-green-500' : r.status >= 400 && r.status < 500 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <span className="font-mono text-sm font-bold">{r.status}</span>
                  <span className="text-sm text-muted-foreground">{r.label}</span>
                </div>
                <div className="p-4">
                  <CodeBlock code={r.body} language="json" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
