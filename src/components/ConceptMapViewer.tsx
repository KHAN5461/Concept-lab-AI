import React, { useState, useRef, useEffect } from 'react';
import { Network, ChevronDown, ChevronRight, Maximize2, Minimize2, ZoomIn, ZoomOut, Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';

interface ConceptNode {
  name: string;
  description?: string;
  children?: ConceptNode[];
}

interface ConceptMapData {
  title?: string;
  root: ConceptNode;
}

function NodeRenderer({ node, depth = 0 }: { node: ConceptNode; depth?: number }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  
  const depthColors = [
    'bg-primary/5 border-primary/20 text-foreground',
    'bg-blue-500/5 border-blue-500/20 text-foreground',
    'bg-emerald-500/5 border-emerald-500/20 text-foreground',
    'bg-amber-500/5 border-amber-500/20 text-foreground',
    'bg-purple-500/5 border-purple-500/20 text-foreground'
  ];
  const colorClass = depthColors[depth % depthColors.length];

  return (
    <div className="flex flex-col items-start w-full relative">
      <motion.div 
        layout
        className={cn(
          "px-6 py-4 rounded-[22px] border shadow-sm my-2 transition-all duration-300 relative group cursor-pointer max-w-md",
          colorClass,
          hasChildren ? "hover:shadow-lg hover:-translate-y-1 hover:border-primary/40" : "hover:shadow-md"
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {hasChildren && (
            <div className="p-1.5 rounded-xl bg-background/80 shadow-sm text-muted-foreground group-hover:text-primary transition-all shrink-0">
               {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          )}
          <div className="font-bold text-[16px] tracking-tight">{node.name}</div>
        </div>
        {node.description && (
          <div className={cn(
            "text-[14px] opacity-70 mt-3 leading-relaxed pl-4 border-l-2 border-foreground/10 font-medium",
            hasChildren ? "ml-10" : "ml-2"
          )}>
            {node.description}
          </div>
        )}
      </motion.div>
      
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, x: -10 }}
            animate={{ opacity: 1, height: 'auto', x: 0 }}
            exit={{ opacity: 0, height: 0, x: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
            className="flex w-full mt-1 relative"
          >
            {/* Thread Visuals */}
            <div className="absolute left-[26px] top-[-10px] w-px h-full bg-gradient-to-b from-border via-border/60 to-transparent z-0" />
            
            <div className="flex flex-col gap-4 pl-16 z-10 w-full relative pt-2 pb-4">
              {node.children!.map((child, idx) => (
                <div key={idx} className="relative w-full">
                  {/* Horizontal Connector */}
                  <div className="absolute left-[-40px] top-7 w-12 h-px bg-border z-0" />
                  <div className="absolute left-[-40px] top-7 w-2 h-2 rounded-full border border-border bg-background -translate-y-1/2 z-10" />
                  <NodeRenderer node={child} depth={depth + 1} />
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ConceptMapViewer({ data }: { data: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);

  let spec: ConceptMapData;
  try {
    spec = JSON.parse(data);
  } catch (e) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-12 bg-destructive/5 text-destructive border border-destructive/10 rounded-[32px]">
         <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
           <Network className="w-8 h-8 opacity-60" />
         </div>
         <p className="font-bold text-xl tracking-tight">Logical Structure Fault</p>
         <p className="text-sm opacity-70 max-w-md text-center mt-3 leading-relaxed font-medium">The conceptual engine could not synthesize a valid hierarchy for this dataset. Please refine your query.</p>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "flex flex-col w-full h-full bg-background rounded-[40px] border border-border/60 overflow-hidden shadow-2xl shadow-primary/5 transition-all duration-700",
        isFullscreen ? "fixed inset-0 z-50 rounded-none bg-background pt-10" : "relative"
      )}
    >
      <div className="px-8 py-6 border-b border-border/40 bg-muted/20 flex items-center justify-between shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-sm">
            <Network className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-extrabold tracking-tight text-foreground text-[13px] uppercase opacity-70 mb-0.5">Conceptual Mapping</h3>
            <span className="font-bold text-lg leading-none">{spec.title || "Untitled Model"}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-2xl border border-border/40 mr-4">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setScale(Math.max(0.5, scale - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-[10px] font-bold w-10 text-center uppercase tracking-tighter">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setScale(Math.min(2, scale + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" size="icon" className="rounded-2xl h-11 w-11 border-border/60 hover:bg-muted/80 shadow-sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10 md:p-20 bg-muted/5 relative">
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border))_1.5px,transparent_1.5px)] [background-size:32px_32px] opacity-10 pointer-events-none" />
        <div 
          className="min-w-max relative z-10 transition-transform duration-300 ease-out origin-top-left"
          style={{ transform: `scale(${scale})` }}
        >
          <NodeRenderer node={spec.root} />
        </div>
      </div>
      
      <div className="px-8 py-4 border-t border-border/40 bg-muted/10 flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-[0.2em] shrink-0">
          <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
             Synchronized
          </div>
          <span>Deep Context Engine</span>
      </div>
    </div>
  );
}
