import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight, ChevronDown, FileText } from 'lucide-react';
import { DocsNode, DocsFolder, docsTree } from './docsData';

const SidebarItem = ({ node, path }: { node: DocsNode, path: string }) => {
  // Start with top-level folders open
  const [isOpen, setIsOpen] = useState(path === ''); 
  const currentPath = `${path}/${node.id}`;

  if (node.type === 'folder') {
    const folder = node as DocsFolder;
    return (
      <div className={`${path !== '' ? 'ml-3 border-l border-border/40 pl-2' : 'mb-2'}`}>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`flex w-full items-center justify-between py-1.5 px-2 text-sm transition-colors rounded-md ${path === '' ? 'font-semibold text-foreground hover:bg-muted/50' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
        >
          <div className="flex items-center gap-2 truncate">
            {isOpen ? <ChevronDown className="w-3.5 h-3.5 opacity-70" /> : <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
            <span className="truncate">{node.title}</span>
          </div>
        </button>
        {isOpen && (
          <div className="mt-1">
            {folder.children.map(child => (
              <SidebarItem key={child.id} node={child} path={currentPath} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Endpoint or Markdown
  const isEndpoint = node.type === 'endpoint';
  const method = isEndpoint ? (node as any).method : null;

  const methodColors: Record<string, string> = {
    'GET': 'bg-green-500/10 text-green-500 border border-green-500/20',
    'POST': 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
  };

  return (
    <div className={`${path !== '' ? 'ml-3 border-l border-border/40 pl-2' : ''}`}>
      <NavLink
        to={`/docs${currentPath}`}
        className={({ isActive }) => `flex w-full items-center justify-between py-1.5 px-2 text-sm rounded-md transition-colors ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'}`}
      >
        <div className="flex items-center gap-2 truncate">
          {!isEndpoint && <FileText className="w-3.5 h-3.5 opacity-50" />}
          <span className="truncate">{node.title}</span>
        </div>
        {isEndpoint && method && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${methodColors[method] || 'bg-muted text-muted-foreground'}`}>
            {method}
          </span>
        )}
      </NavLink>
    </div>
  );
};

export const DocsSidebar = () => {
  return (
    <div className="w-[300px] flex-shrink-0 h-full overflow-y-auto border-r border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 custom-scrollbar">
      <div className="space-y-1">
        {docsTree.map(node => (
          <SidebarItem key={node.id} node={node} path="" />
        ))}
      </div>
    </div>
  );
};
