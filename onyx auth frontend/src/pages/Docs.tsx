import React, { useMemo, useState, useEffect } from 'react';
import { useLocation, Routes, Route, Navigate, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, ArrowRight, Menu, X } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { DocsSidebar } from './docs/DocsSidebar';
import { EndpointView } from './docs/EndpointView';
import { docsTree, findDocsNode, getFlatDocsNodes } from './docs/docsData';
import { motion } from "motion/react";

const DocsContent = () => {
  const location = useLocation();
  const currentPath = location.pathname.replace('/docs/', '').replace('/docs', '');
  const pathParts = currentPath.split('/').filter(Boolean);
  
  const currentNode = useMemo(() => {
    if (pathParts.length === 0) {
      return findDocsNode(docsTree as any, ['getting-started', 'introduction']);
    }
    return findDocsNode(docsTree as any, pathParts);
  }, [pathParts]);

  const flatNodes = useMemo(() => getFlatDocsNodes(docsTree as any), []);

  if (pathParts.length === 0) {
    return <Navigate to="/docs/getting-started/introduction" replace />;
  }

  if (!currentNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-20 animate-in fade-in">
        <h2 className="text-2xl font-bold mb-2">404 - Document Not Found</h2>
        <p>The documentation page you are looking for does not exist.</p>
      </div>
    );
  }

  if (currentNode.type === 'folder') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground pt-20 animate-in fade-in">
        <h2 className="text-2xl font-bold mb-2">{currentNode.title}</h2>
        <p>Please select a topic from the sidebar to view its contents.</p>
      </div>
    );
  }

  const currentIndex = flatNodes.findIndex(n => n.path === pathParts.join('/'));
  const prevNode = currentIndex > 0 ? flatNodes[currentIndex - 1] : null;
  const nextNode = currentIndex !== -1 && currentIndex < flatNodes.length - 1 ? flatNodes[currentIndex + 1] : null;

  return (
    <div className="pb-24">
      <EndpointView node={currentNode as any} />
      <div className="mt-16 pt-8 border-t border-border flex items-center justify-between gap-4">
        {prevNode ? (
          <Link to={`/docs/${prevNode.path}`} className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors">
            <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex flex-col items-start min-w-0 overflow-hidden">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Previous</span>
              <span className="font-medium text-sm text-foreground truncate w-full">{prevNode.title}</span>
            </div>
          </Link>
        ) : <div className="flex-1" />}
        
        {nextNode ? (
          <Link to={`/docs/${nextNode.path}`} className="flex-1 min-w-0 flex items-center justify-end gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted/50 transition-colors text-right">
            <div className="flex flex-col items-end min-w-0 overflow-hidden">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Next</span>
              <span className="font-medium text-sm text-foreground truncate w-full">{nextNode.title}</span>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        ) : <div className="flex-1" />}
      </div>
    </div>
  );
};

const Docs = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEO title="API & SDK Documentation" description="What is Dexter Auth? Dexter Auth is an advanced authentication and software licensing platform designed for C++, C#, and ImGui developers." path="/docs" />
      
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button 
            className="md:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground rounded-md transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Home</span>
          </Link>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center space-x-2 text-primary">
          <BookOpen className="w-5 h-5" />
          <span className="font-bold tracking-tight">Docs</span>
        </div>
        <div className="w-[110px] hidden sm:block" />
      </nav>

      {/* Layout */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="pt-16 flex flex-1 h-screen overflow-hidden"
      >
        {/* Sidebar - Desktop */}
        <motion.aside 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
          className="hidden md:block shrink-0"
        >
          <DocsSidebar />
        </motion.aside>

        {/* Sidebar - Mobile Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden flex pt-16">
            <div 
              className="fixed inset-0 bg-background/80 backdrop-blur-sm pt-16" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="relative w-[300px] max-w-[80vw] h-full bg-background border-r border-border/50 shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300">
               <DocsSidebar />
            </aside>
          </div>
        )}

        {/* Content */}
        <motion.main 
          id="docs-main" 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25, ease: "easeOut" }}
          className="flex-1 min-w-0 overflow-y-auto p-[clamp(2rem,5vw,4rem)] scroll-smooth relative custom-scrollbar"
        >
          {/* Decorative Background Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -z-10 pointer-events-none" />

          <motion.div 
            key={location.pathname}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mx-auto max-w-5xl pb-[clamp(4rem,10vw,6rem)]"
          >
            <Routes>
              <Route path="*" element={<DocsContent />} />
            </Routes>
          </motion.div>
        </motion.main>
      </motion.div>
    </div>
  );
};

export default Docs;
