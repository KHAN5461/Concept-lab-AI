import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { motion, AnimatePresence } from 'motion/react';
import { useLabStore } from '../store/useLabStore';
import { Button, buttonVariants } from '@/components/ui/button';
import { Upload, ScrollText, Layers, BrainCircuit, FileSearch, Loader2, MessageSquare, BookMarked, FileText, FileImage, FileType2, Globe, ArrowLeft, Clock, ChevronRight, SlidersHorizontal, Menu, Database, Sparkles, Plus, MoreHorizontal, PenBox, Copy, Trash2, ThumbsUp, ThumbsDown, Check, Maximize2, Minimize2, Send, Wand2, Hash, RotateCcw, X, Minus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db, auth } from '../lib/firebase';
import { collection, addDoc, query, where, onSnapshot, doc, deleteDoc, updateDoc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const FlashcardItem = ({ fc, index }: { fc: any, index: number }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-card border border-border/60 hover:border-primary/40 rounded-xl p-6 md:p-8 shadow-sm relative group overflow-hidden transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="font-mono text-[10px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded border border-primary/10 tracking-widest">
            NODE_{String(index + 1).padStart(2, '0')}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 italic">Conceptual Artifact</span>
        </div>
        {showAnswer && (
          <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-500/5 text-emerald-600 text-[9px] font-bold uppercase tracking-widest rounded border border-emerald-500/20">
            <Check className="w-3 h-3" /> Synthesis_Resolved
          </div>
        )}
      </div>
      
      <h3 className="text-xl md:text-2xl font-serif font-black leading-tight text-foreground mb-8 text-balance">{fc.question}</h3>
      
      {!showAnswer ? (
        <Button 
          onClick={() => setShowAnswer(true)} 
          className="w-full h-12 rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-bold tracking-widest text-[10px] uppercase shadow-none transition-all active:scale-[0.98]"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-2 opacity-70 group-hover:rotate-180 transition-transform duration-700" />
          Expose Core Logic
        </Button>
      ) : (
        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
          <div className="mb-4 flex items-center gap-3">
             <div className="h-px flex-1 bg-border/40" />
             <span className="text-[8px] font-mono font-black text-muted-foreground/30 uppercase tracking-widest">Extracted_Insight</span>
             <div className="h-px flex-1 bg-border/40" />
          </div>
          <p className="text-base md:text-lg font-serif text-muted-foreground leading-relaxed italic font-medium bg-muted/20 p-5 rounded-lg border border-border/40">
             {fc.answer}
          </p>
        </div>
      )}
    </motion.div>
  );
};

const QuizQuestionItem = ({ q, index }: { q: any, index: number }) => {
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-card border border-border/40 hover:border-border/60 transition-all rounded-[2.5rem] p-8 md:p-12 shadow-sm relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
        <BrainCircuit className="w-32 h-32" />
      </div>

      <div className="flex gap-6 items-start mb-10 relative">
        <div className="w-10 h-10 rounded-xl bg-muted/50 border border-border/40 text-muted-foreground font-mono text-xs font-bold flex items-center justify-center shrink-0">
           {String(index + 1).padStart(2, '0')}
        </div>
        <div className="space-y-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary/50 flex items-center gap-2">
            PROBE_ID: {index + 1}
          </div>
          <h3 className="text-xl md:text-2xl font-serif font-black leading-tight text-foreground text-balance pt-1 italic">{q.question}</h3>
        </div>
      </div>
      
      <div className="grid gap-4 pl-0 md:pl-16 relative">
         {q.options.map((opt: string, j: number) => {
           const isSelected = selectedOpt === opt;
           const isCorrect = opt === q.correct;
           const showResult = selectedOpt !== null;
           
           let bgState = 'bg-muted/5 border-border/40 hover:border-primary/40 cursor-pointer shadow-sm';
           let iconState = 'border-border/60 bg-muted/20';
           let textState = 'text-foreground/90 font-medium font-sans';
           
           if (showResult) {
             if (isCorrect) {
               bgState = 'bg-emerald-500/5 border-emerald-500/40 ring-1 ring-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.05)]';
               iconState = 'bg-emerald-500 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]';
               textState = 'text-emerald-900 dark:text-emerald-300 font-bold';
             } else if (isSelected) {
               bgState = 'bg-rose-500/5 border-rose-500/40 ring-1 ring-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.05)]';
               iconState = 'bg-rose-500 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]';
               textState = 'text-rose-900 dark:text-rose-300 font-bold';
             } else {
               bgState = 'bg-muted/20 border-transparent opacity-40 grayscale';
             }
           } else if (isSelected) {
              bgState = 'bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary),0.1)]';
              iconState = 'bg-primary border-primary shadow-[0_0_12px_rgba(var(--primary),0.4)]';
              textState = 'text-primary font-bold';
           }
           
           return (
             <motion.div 
               key={j} 
               whileHover={!showResult ? { x: 4 } : {}}
               onClick={() => !showResult && setSelectedOpt(opt)}
               className={`p-5 rounded-[1.5rem] border transition-all duration-300 ${bgState} ${!showResult ? 'active:scale-[0.99]' : ''}`}
             >
               <div className={`text-[16px] flex items-center gap-5 ${textState}`}>
                 <div className={`w-3.5 h-3.5 rounded-full shrink-0 border-2 ${iconState} transition-all duration-500`} />
                 <span className="leading-relaxed flex-1">{opt}</span>
                 {showResult && isCorrect && <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />}
                 {showResult && isSelected && !isCorrect && <X className="w-5 h-5 text-rose-500" strokeWidth={3} />}
               </div>
               
               {showResult && (isCorrect || isSelected) && (
                 <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="overflow-hidden"
                 >
                   <div className="mt-5 pt-5 border-t border-border/20">
                     <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/50 mb-2 italic">Logic Verification</div>
                     <p className={`text-[14px] font-serif leading-relaxed italic ${isCorrect ? 'text-emerald-700/90 dark:text-emerald-400/90' : 'text-rose-700/90 dark:text-rose-400/90'}`}>
                       {isCorrect ? q.explanation : (q.incorrectExplanations?.[opt] || "This deduction does not align with the source material.")}
                     </p>
                   </div>
                 </motion.div>
               )}
             </motion.div>
           )
         })}
      </div>
    </motion.div>
  )
};

const LabChatMessage = ({ m, isLast }: { m: any, isLast?: boolean }) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'up'|'down'|null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isUser = m.role === 'user';

  return (
      <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex w-full gap-3 md:gap-4 group",
        isUser ? "flex-row-reverse" : "flex-row",
        isLast ? "mb-0" : "mb-8"
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        {isUser ? (
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-muted/60 border border-border/40 flex items-center justify-center shadow-sm select-none overflow-hidden">
             {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="User" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
             ) : (
                <span className="text-[10px] font-bold tracking-tight opacity-40 italic">{auth.currentUser?.email?.[0].toUpperCase() || 'U'}</span>
             )}
          </div>
        ) : (
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-center text-primary/60 shadow-sm select-none">
            <BrainCircuit className="w-4 h-4 md:w-5 md:h-5" />
          </div>
        )}
      </div>

      <div className={cn(
        "flex flex-col gap-1.5 max-w-[88%] md:max-w-[80%]",
        isUser ? "items-end" : "items-start"
      )}>
        <div className={cn(
          "px-0 py-1 sm:py-2 relative transition-all duration-300 w-full",
          isUser 
            ? "flex flex-col items-end" 
            : "flex flex-col items-start"
        )}>
          {!isUser ? (
            <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-p:font-serif prose-p:leading-relaxed prose-p:text-[16px] sm:prose-p:text-[17px] prose-strong:font-bold prose-strong:text-foreground text-foreground/90 w-full 
              prose-ul:list-disc prose-ul:ml-6 prose-ul:my-4 prose-ol:list-decimal prose-ol:ml-6 prose-ol:my-4 prose-li:my-2 prose-li:font-serif
              prose-headings:font-serif prose-headings:font-black prose-headings:italic prose-headings:tracking-tighter prose-headings:mt-6 prose-headings:mb-3
              prose-blockquote:border-l-4 prose-blockquote:border-primary/20 prose-blockquote:bg-primary/5 prose-blockquote:px-4 prose-blockquote:py-1 prose-blockquote:rounded-r-lg prose-blockquote:italic
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-[0.9em] prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
              prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/40 prose-pre:rounded-xl prose-pre:p-4">
              <ReactMarkdown 
                remarkPlugins={[remarkMath]} 
                rehypePlugins={[rehypeKatex]}
              >
                {m.content}
              </ReactMarkdown>

              {m.citations && m.citations.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full mt-4 pt-3 border-t border-border/20"
                >
                  <div className="flex flex-wrap gap-1.5 opacity-60 hover:opacity-100 transition-opacity">
                    {m.citations.map((c: string, i: number) => (
                      <TooltipProvider key={i}>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help inline-flex items-center gap-1.5 bg-muted/20 hover:bg-primary/5 hover:border-primary/20 border border-transparent rounded-md px-1.5 py-0.5 transition-all">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono font-bold text-primary/60">[{i + 1}]</span>
                              <span className="text-[8px] font-medium text-muted-foreground line-clamp-1 max-w-[80px] italic">
                                {c.substring(0, 20)}...
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] text-[11px] font-serif italic p-3 bg-card border-border/60">
                             <p className="leading-relaxed">"{c}"</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <div className="leading-relaxed tracking-tight text-[15px] font-medium bg-muted/30 px-5 py-3 rounded-2xl border border-border/40 inline-block text-foreground/90">{m.content}</div>
          )}
        </div>
        
        {!isUser && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="flex items-center gap-3 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300"
           >
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    onClick={handleCopy}
                    className="p-2 md:p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                  >
                     {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold uppercase tracking-wider">Copy</TooltipContent>
                </Tooltip>
                
                <div className="w-[1px] h-4 bg-border/40 mx-0.5" />
                
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => setFeedback(prev => prev === 'up' ? null : 'up')}
                    className={cn("p-2 md:p-1.5 hover:bg-muted rounded-lg transition-colors", feedback === 'up' ? 'text-green-600 bg-green-500/10' : 'text-muted-foreground hover:text-foreground')}
                  >
                     <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold uppercase tracking-wider">Helpful</TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger
                    onClick={() => setFeedback(prev => prev === 'down' ? null : 'down')}
                    className={cn("p-2 md:p-1.5 hover:bg-muted rounded-lg transition-colors", feedback === 'down' ? 'text-red-600 bg-red-500/10' : 'text-muted-foreground hover:text-foreground')}
                  >
                     <ThumbsDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-bold uppercase tracking-wider">Not Helpful</TooltipContent>
                </Tooltip>
              </TooltipProvider>
           </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export function LabWorkspace({ onClose, isSplit }: { onClose?: () => void, isSplit?: boolean }) {
  const {
    sources, selectedSourceId, chatHistory, selectedText, activeTool, isGeneratingTool, toolResult, toolHistory,
    addSource, removeSource, setSelectedSource, addChatMessage, setSelectedText, setToolResult, setIsGeneratingTool, addToolHistory, loadToolHistoryItem
  } = useLabStore();

  const [uploading, setUploading] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Mobile / Desktop navigation state
  const [activeTab, setActiveTab] = useState<'sources' | 'chat' | 'tools'>('sources');

  // Tool options and search
  const [toolCount, setToolCount] = useState(5);
  const [toolDifficulty, setToolDifficulty] = useState('Intermediate');
  const [savingToLibrary, setSavingToLibrary] = useState(false);
  const [pastLabSessions, setPastLabSessions] = useState<any[]>([]);
  const viewportRef = useRef<HTMLDivElement>(null);
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when chat updates or loading states change
  useEffect(() => {
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      if (scrollAnchorRef.current) {
        scrollAnchorRef.current.scrollIntoView({ behavior, block: 'end' });
      }
    };

    scrollToBottom('auto');
    const timers = [
      setTimeout(() => scrollToBottom('smooth'), 100),
      setTimeout(() => scrollToBottom('smooth'), 300),
      setTimeout(() => scrollToBottom('smooth'), 800)
    ];

    return () => timers.forEach(clearTimeout);
  }, [chatHistory, chatLoading, activeTab, selectedSourceId]);

  useEffect(() => {
    if (!auth.currentUser) return;
    const q = query(collection(db, 'labSessions'), where('userId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
      items.sort((a, b) => b.updatedAt - a.updatedAt);
      setPastLabSessions(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'labSessions');
    });
    return () => unsub();
  }, []);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const createNewLabSession = () => {
    useLabStore.getState().setSessionId(crypto.randomUUID(), 'New Lab Session');
    useLabStore.getState().loadFromData({
      sources: [],
      selectedSourceId: null,
      chatHistory: [],
      toolHistory: [],
      toolResult: null,
      activeTool: null,
      selectedText: null,
    });
  };

  const loadPastSession = (sessionData: any) => {
    useLabStore.getState().setSessionId(sessionData.id, sessionData.title);
    useLabStore.getState().loadFromData({
      sources: sessionData.sources || [],
      selectedSourceId: sessionData.sources?.[0]?.id || null,
      chatHistory: sessionData.chatHistory || [],
      toolHistory: sessionData.toolHistory || [],
      toolResult: null,
      activeTool: null,
      selectedText: null,
    });
  };

  const deleteLabSession = async (id: string) => {
    toast.error('Confirm Termination', {
      description: 'Are you sure you want to terminate this cognitive session?',
      action: {
        label: 'Terminate',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'labSessions', id));
            if (useLabStore.getState().sessionId === id) {
              createNewLabSession();
            }
            toast.success('Session terminated');
          } catch (error) {
            handleFirestoreError(error, OperationType.DELETE, `labSessions/${id}`);
            toast.error('Failed to terminate session');
          }
        }
      }
    });
  };

  const confirmRename = async () => {
    if (!editingSessionId || !renameValue.trim()) {
      setEditingSessionId(null);
      return;
    }
    
    const id = editingSessionId;
    const newTitle = renameValue.trim();
    
    try {
      await updateDoc(doc(db, 'labSessions', id), { title: newTitle, updatedAt: Date.now() });
      if (useLabStore.getState().sessionId === id) {
        useLabStore.getState().setSessionId(id, newTitle);
      }
      toast.success('Session renamed');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `labSessions/${id}`);
      toast.error('Failed to rename session');
    } finally {
      setEditingSessionId(null);
    }
  };

  const startRenaming = (session: any) => {
    setEditingSessionId(session.id);
    setRenameValue(session.title);
  };

  const duplicateLabSession = async (session: any) => {
    if (!auth.currentUser) return;
    const newId = crypto.randomUUID();
    const { id: _, ...sessionData } = session;
    const newSession = {
      ...sessionData,
      title: `${session.title} (Copy)`,
      updatedAt: Date.now(),
    };
    try {
      await setDoc(doc(db, 'labSessions', newId), newSession);
      toast.success('Session duplicated');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `labSessions/${newId}`);
      toast.error('Failed to duplicate session');
    }
  };

  // Column 1: Sources
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.id) {
        addSource({ id: data.id, filename: data.filename });
        setSelectedSource(data.id);
        setActiveTab('chat');
        toast.success(`Ingested ${data.filename}`);
      } else {
         toast.error(data.error || 'Failed to ingest document');
      }
    } catch (err) {
      console.error(err);
      toast.error('Grounded extraction failed');
    } finally {
      setUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUrlUpload = async () => {
    if (!urlInput.trim()) return;
    setUploading(true);
    try {
      const res = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput })
      });
      const data = await res.json();
      if (data.id) {
        addSource({ id: data.id, filename: data.filename });
        setSelectedSource(data.id);
        setActiveTab('chat');
        toast.success('Successfully extracted URL');
      } else {
        toast.error(data.error || 'Failed to extract URL');
      }
      setUrlInput('');
    } catch (err) {
      console.error(err);
      toast.error('URL extraction failed');
    } finally {
      setUploading(false);
    }
  };

  // Column 2: Chat
  const handleChat = async () => {
    if (!chatInput.trim() || !selectedSourceId) return;
    
    const newMsg = { id: Date.now().toString(), role: 'user' as const, content: chatInput };
    addChatMessage(newMsg);
    setChatInput('');
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newMsg.content, sourceId: selectedSourceId })
      });
      const data = await res.json();
      addChatMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text,
        citations: data.citations
      });
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  // Column 3: Tools
  const runTool = async (tool: 'flashcards' | 'quiz' | 'visualization') => {
    if (!selectedSourceId) return;
    setIsGeneratingTool(true);
    setToolResult(tool, null);

    try {
      const res = await fetch(`/api/tools/${tool}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sourceId: selectedSourceId, 
          selectedText, 
          options: { count: toolCount, difficulty: toolDifficulty }
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const resultObject = data;
      setToolResult(tool, resultObject);
      
      let title = tool === 'quiz' ? `Quiz` : 
                  tool === 'visualization' ? `Visualization` :
                  `Flashcards`;
      
      if (tool === 'quiz' && Array.isArray(data)) title = `Quiz (${data.length} Qs)`;
      if (tool === 'flashcards' && Array.isArray(data)) title = `Flashcards (${data.length} items)`;
      
      addToolHistory({ tool, result: resultObject, title });
      toast.success(`Generated ${tool} successfully`);
    } catch (err) {
      console.error(err);
      toast.error(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingTool(false);
    }
  };

  const handleSelection = () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      setSelectedText(selection);
    }
  };

  const saveToLibrary = async () => {
    if (!toolResult || !auth.currentUser) {
       toast.error('You must be signed in to save resources');
       return;
    }
    setSavingToLibrary(true);
    try {
      await addDoc(collection(db, 'resources'), {
        userId: auth.currentUser.uid,
        type: activeTool,
        title: `Generated ${activeTool?.charAt(0).toUpperCase()}${activeTool?.slice(1)}`,
        content: JSON.stringify(toolResult),
        createdAt: Date.now()
      });
      toast.success('Saved to Resource Library!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to save to library');
    } finally {
      setSavingToLibrary(false);
    }
  };

  const tabs = [
    { id: 'sources', label: 'Sources', icon: Database },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'tools', label: 'Tools', icon: Sparkles }
  ] as const;

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative" onMouseUp={handleSelection}>
      
      {/* Top Header: Pill Nav & History Burger */}
      <div className="flex items-center justify-between px-3 h-14 md:h-16 border-b bg-background/80 backdrop-blur-xl z-50 shrink-0 sticky top-0">
         <div className="flex-1 flex items-center gap-2">
           {onClose && (
             <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl hover:bg-muted h-9 w-9">
               <ArrowLeft className="w-5 h-5" />
             </Button>
           )}
           <div className="hidden sm:flex items-center gap-2 ml-1">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                 <BrainCircuit className="w-4 h-4 text-primary" />
              </div>
              <span className="font-serif font-black text-sm tracking-tight">LAB<span className="text-primary italic">ORATORY</span></span>
           </div>
         </div>

         {/* Segmented Control Pill Nav */}
         <div className="flex items-center bg-muted/60 p-1 rounded-xl sm:rounded-2xl border border-border/40 shadow-inner backdrop-blur-md gap-0.5 relative">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'sources' | 'chat' | 'tools')}
                  className={`relative flex items-center justify-center px-4 py-1.5 sm:px-6 sm:py-2 text-[11px] sm:text-xs font-black uppercase tracking-widest rounded-lg sm:rounded-xl transition-all duration-300 whitespace-nowrap outline-none ${isActive ? 'text-foreground' : 'text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted/50'}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="pill-bg"
                      className="absolute inset-0 bg-background rounded-lg sm:rounded-xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)] border border-border/40"
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-2">
                     <TabIcon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 transition-colors", isActive ? 'text-primary' : 'opacity-40')} />
                     <span className="hidden sm:inline-block">{tab.label}</span>
                  </div>
                </button>
              );
            })}
         </div>

         <div className="flex-1 flex justify-end items-center gap-1">
           <Button variant="ghost" size="icon" onClick={() => setIsFullScreen(!isFullScreen)} className="rounded-xl h-9 w-9 hidden sm:flex" title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}>
             {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
           </Button>
           <Sheet>
             <SheetTrigger 
               render={(props) => (
                 <Button 
                   {...props}
                   variant="ghost" 
                   size="icon" 
                   className="rounded-xl h-9 w-9" 
                   title="Session History"
                 >
                   <Menu className="w-5 h-5" />
                 </Button>
               )}
             />
             <SheetContent side="right" className="w-[300px] sm:w-[400px] p-0 flex flex-col border-l-0 shadow-2xl">
               <SheetHeader className="px-6 py-4 border-b border-border/40 shrink-0 text-left flex flex-row items-center justify-between bg-muted/5">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-0.5">
                       <Clock className="w-3.5 h-3.5 text-primary/60" />
                       <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40">Temporal_Archive</span>
                    </div>
                    <SheetTitle className="text-xl font-serif font-black tracking-tight italic">Cognitive Sessions</SheetTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={createNewLabSession} className="rounded-lg h-9 w-9 border border-border/40 hover:border-primary/40 transition-all bg-background" title="New Session">
                    <Plus className="w-4 h-4" />
                  </Button>
                </SheetHeader>
                <ScrollArea className="flex-1 bg-background">
                  {pastLabSessions.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center gap-4 opacity-30">
                      <div className="w-10 h-10 rounded-xl border border-dashed border-border/60 flex items-center justify-center">
                         <Minus className="w-4 h-4" />
                      </div>
                      <p className="text-[9px] font-mono font-bold uppercase tracking-widest">Archive_Null</p>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2">
                      {pastLabSessions.map(session => (
                        <div key={session.id} className="group relative">
                         {editingSessionId === session.id ? (
                           <div className="w-full flex items-center gap-2 p-2 bg-muted/20 border border-primary/30 rounded-xl animate-in zoom-in-95">
                             <Input 
                               value={renameValue} 
                               onChange={(e) => setRenameValue(e.target.value)}
                               className="h-9 text-sm font-bold italic"
                               autoFocus
                               onKeyDown={(e) => {
                                 if (e.key === 'Enter') confirmRename();
                                 if (e.key === 'Escape') setEditingSessionId(null);
                               }}
                             />
                             <Button size="icon" variant="ghost" className="h-8 w-8 text-primary" onClick={confirmRename}>
                               <Check className="w-4 h-4" />
                             </Button>
                           </div>
                         ) : (
                           <>
                             <button 
                               onClick={() => loadPastSession(session)} 
                               className={cn(
                                 "w-full flex flex-col items-start gap-1 p-4 cursor-pointer rounded-xl transition-all border text-left",
                                 useLabStore.getState().sessionId === session.id 
                                   ? "bg-primary/5 border-primary/30 shadow-sm" 
                                   : "bg-muted/10 border-transparent hover:bg-muted/30 hover:border-border/40"
                               )}
                             >
                               <div className="font-bold text-sm tracking-tight text-foreground pr-8 leading-tight italic">{session.title}</div>
                               <div className="flex items-center gap-3 mt-1">
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40">INDEX_{session.id.substring(0,6)}</span>
                                  <div className="w-1 h-1 rounded-full bg-border" />
                                  <span className="text-[8px] font-mono font-bold uppercase tracking-widest opacity-40">
                                     {new Date(session.updatedAt).toLocaleDateString()}
                                  </span>
                               </div>
                             </button>
                             <div className="absolute right-3 top-4 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all pointer-events-auto">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      className={cn(
                                        buttonVariants({ variant: "ghost", size: "icon" }),
                                        "h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                                      )}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-40 rounded-lg border-border/40 p-1">
                                      <DropdownMenuItem onSelect={() => startRenaming(session)} className="gap-2 rounded-md py-2">
                                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest">RENAME_NODE</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onSelect={() => duplicateLabSession(session)} className="gap-2 rounded-md py-2">
                                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest">CLONE_NODE</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1 opacity-50" />
                                      <DropdownMenuItem onSelect={() => deleteLabSession(session.id)} className="gap-2 rounded-md py-2 text-destructive hover:bg-destructive/10">
                                        <span className="font-mono text-[9px] font-bold uppercase tracking-widest">TERMINATE</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                              </div>
                            </>
                         )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
             </SheetContent>
           </Sheet>
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">

          {/* VIEW: SOURCES */}
          {activeTab === 'sources' && (
            <motion.div 
              key="sources"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col md:flex-row bg-background w-full overflow-hidden"
            >
              <div className="w-full md:w-[320px] lg:w-[400px] border-b md:border-b-0 md:border-r border-border/40 flex flex-col shrink-0 bg-muted/2 lg:p-8 md:h-full p-6">
                <div className="mb-10">
                  <div className="flex items-center gap-2 mb-2">
                     <Database className="w-3.5 h-3.5 text-primary" />
                     <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/60">Module_Input</span>
                  </div>
                  <h1 className="text-3xl font-serif font-black tracking-tighter text-foreground mb-4">Knowledge Base</h1>
                  <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80 decoration-primary/20 decoration-dashed underline-offset-4">
                    Ground the synthesis engine by injecting research documents or extracting contextual data from external documentation.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="relative group border border-border/60 hover:border-primary/40 rounded-2xl p-6 transition-all bg-card overflow-hidden cursor-pointer shadow-sm">
                    <input 
                      type="file" 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20" 
                      onChange={handleUpload} 
                      disabled={uploading} 
                    />
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight">Upload Dataset</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase mt-0.5">PDF / TXT / DOCX / MD</span>
                      </div>
                    </div>
                  </div>

                  <div className="border border-border/60 hover:border-primary/40 rounded-2xl p-6 transition-all bg-card shadow-sm group">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/5 flex items-center justify-center border border-blue-500/10 group-hover:rotate-12 transition-transform">
                        <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight">External Intel</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase mt-0.5">Web Scraping Module</span>
                      </div>
                    </div>
                    <div className="relative flex">
                      <Input 
                        placeholder="Documentation URL..." 
                        value={urlInput} 
                        onChange={e => setUrlInput(e.target.value)} 
                        disabled={uploading} 
                        className="h-10 text-xs rounded-xl bg-muted/20 border-border/40 focus:ring-primary/10 pl-3 pr-16 font-medium" 
                      />
                      <Button 
                        size="sm"
                        onClick={handleUrlUpload} 
                        disabled={uploading || !urlInput.trim()} 
                        className="absolute right-1 top-1 bottom-1 px-3 text-[9px] font-black uppercase tracking-widest rounded-lg h-auto"
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : "GND"}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-auto pt-6 border-t border-border/40 hidden md:block">
                  <div className="flex flex-col gap-1.5 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                     <span className="text-[9px] font-mono font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Grounding_Engine</span>
                     <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 leading-relaxed font-serif italic">
                       Content is dynamically processed to create high-fidelity reasoning paths.
                     </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto bg-muted/5 p-6 lg:p-12 scrollbar-hidden">
                <div className="max-w-4xl mx-auto">
                   {sources.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                         <div className="w-16 h-16 border-2 border-dashed border-muted-foreground/30 rounded-3xl flex items-center justify-center mb-6">
                            <Clock className="w-6 h-6" />
                         </div>
                         <h3 className="text-[10px] font-black uppercase tracking-widest">Awaiting Knowledge Inputs</h3>
                      </div>
                   ) : (
                      <div className="space-y-8 pb-20">
                        <div className="flex items-center justify-between border-b border-border/40 pb-4">
                           <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-primary" />
                             <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-foreground font-mono">Module_Inventory</h2>
                           </div>
                           <div className="font-mono text-[10px] font-bold text-muted-foreground uppercase opacity-50">
                              {sources.length} Active Nodes
                           </div>
                        </div>

                        <div className="grid gap-3">
                           {sources.map((s, idx) => {
                             const isSelected = selectedSourceId === s.id;
                             const isUrl = s.filename.startsWith('http');
                             const ext = s.filename.split('.').pop()?.toLowerCase();
                             const Icon = isUrl ? Globe : (ext === 'pdf' ? FileText : FileType2);

                             return (
                                <motion.div 
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.03 }}
                                  key={s.id} 
                                  className={cn(
                                    "flex items-center justify-between gap-4 p-4 rounded-xl border transition-all relative group",
                                    isSelected ? "bg-background border-primary/30 shadow-md translate-x-1" : "bg-card/50 border-border/40 hover:bg-background hover:border-border/60"
                                  )}
                                >
                                  <button
                                    onClick={() => {
                                      if (selectedSourceId !== s.id) setSelectedText(null);
                                      setSelectedSource(s.id);
                                    }}
                                    className="flex-1 flex items-center gap-4 min-w-0"
                                  >
                                    <div className={cn(
                                      "w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 transition-transform",
                                      isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border/40"
                                    )}>
                                      <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                      <span className={cn("text-[13px] font-bold truncate", isSelected ? 'text-primary' : 'text-foreground')}>{s.filename}</span>
                                      <span className="text-[8px] font-mono font-black uppercase tracking-widest text-muted-foreground/40 mt-0.5">
                                        ID: {s.id.substring(0, 8)}_V1.0
                                      </span>
                                    </div>
                                  </button>

                                  <div className="flex items-center gap-2 pr-2">
                                     <div className={cn("h-4 w-px bg-border/40 mx-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity")} />
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); removeSource(s.id); }}
                                       className="p-2 md:p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive md:opacity-0 md:group-hover:opacity-100 transition-all transition-colors"
                                     >
                                       <Trash2 className="w-4 h-4 md:w-3.5 md:h-3.5" />
                                     </button>
                                  </div>
                                </motion.div>
                             )
                           })}
                        </div>
                      </div>
                   )}
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: CHAT */}
          {activeTab === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col bg-background w-full"
            >
              <ScrollArea className="flex-1 h-full relative">
                <div className="max-w-4xl mx-auto w-full px-4 py-8 md:px-12 flex flex-col min-h-full">
                  {!selectedSourceId ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
                      <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6 shadow-sm">
                        <FileSearch className="w-8 h-8 text-primary" />
                      </div>
                      <h2 className="text-2xl font-serif font-black tracking-tighter mb-3 italic">Establish Grounding</h2>
                      <p className="text-muted-foreground text-sm max-w-[280px] font-medium leading-relaxed opacity-60">
                        Please select or ingest a source material to initialize the grounding pipeline.
                      </p>
                    </div>
                  ) : (!chatHistory || chatHistory.length === 0) ? (
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
                      <div className="w-12 h-12 rounded-2xl bg-muted border border-border/40 flex items-center justify-center mb-6 opacity-40">
                        <MessageSquare className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-serif font-black tracking-tight mb-2 italic opacity-60">Synthesis Stream Empty</h2>
                      <p className="text-muted-foreground text-[11px] max-w-[240px] font-mono font-bold uppercase tracking-widest opacity-30">
                        Awaiting natural language input for document grounding.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8 pb-12">
                      {chatHistory.map((msg, i) => (
                        <LabChatMessage key={msg.id} m={msg} isLast={i === chatHistory.length - 1} />
                      ))}
                      {chatLoading && (
                        <div className="flex gap-4 mb-6">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                            <BrainCircuit className="w-5 h-5 animate-pulse" />
                          </div>
                          <div className="flex flex-col gap-2 p-1">
                             <div className="h-4 w-48 bg-muted rounded-full animate-pulse" />
                             <div className="h-4 w-32 bg-muted/60 rounded-full animate-pulse" />
                          </div>
                        </div>
                      )}
                      <div ref={scrollAnchorRef} className="h-4 shrink-0" />
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* STICKY CHAT INPUT - Floating Version */}
              <div className="relative z-30 px-4 pb-6 md:px-8 md:pb-8">
                <div className="max-w-4xl mx-auto w-full relative">
                  <div className="absolute -top-12 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                  <div className="relative group shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-card/80 backdrop-blur-xl border border-border/80 rounded-2xl md:rounded-[1.5rem] overflow-hidden focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/50 transition-all duration-300">
                    <textarea 
                      className="w-full min-h-[50px] md:min-h-[64px] p-4 pr-14 md:pr-20 bg-transparent resize-none outline-none text-foreground text-sm md:text-[16px] placeholder:text-muted-foreground/50 font-serif leading-relaxed"
                      placeholder={selectedSourceId ? "Analyze grounded context..." : "Awaiting document..."}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleChat();
                        }
                      }}
                      disabled={!selectedSourceId || chatLoading}
                    />
                    <div className="absolute right-3 bottom-2 md:right-4 md:bottom-3 flex items-center">
                      <Button 
                        size="icon"
                        className="rounded-xl w-9 h-9 md:w-11 md:h-11 bg-primary text-primary-foreground shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all"
                        disabled={!chatInput.trim() || !selectedSourceId || chatLoading}
                        onClick={handleChat}
                      >
                        {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 px-4 flex items-center justify-between">
                     <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary/30">Rel_4.2_Synthesis</span>
                     {chatInput.length > 0 && <span className="text-[9px] font-mono text-muted-foreground/30">{chatInput.length} chars</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* VIEW: TOOLS */}
          {activeTab === 'tools' && (
            <motion.div 
              key="tools"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex flex-col md:flex-row bg-background overflow-y-auto md:overflow-hidden w-full"
            >
                 {/* Tools Sidebar */}
                {!isFullScreen && (
                   <div className="w-full md:w-[350px] lg:w-[400px] border-b md:border-b-0 md:border-r border-border/40 flex flex-col shrink-0 bg-background z-10 md:h-full animate-in slide-in-from-left duration-500">
                    <ScrollArea className="flex-1">
                      <div className="p-6 lg:p-8">
                        <div className="mb-10 shrink-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-primary/60" />
                            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40">Synthesis_Module</span>
                          </div>
                          <h2 className="text-3xl font-serif font-black tracking-tighter text-foreground mb-4 italic">SynthTools</h2>
                          <p className="text-[11px] text-muted-foreground font-medium leading-relaxed opacity-80 underline decoration-primary/20 decoration-dashed underline-offset-4">
                            Alchemy for your research context. Transform raw grounding data into structured mental models.
                          </p>
                        </div>

                        <div className="space-y-8 pb-6">
                          
                          {/* Tool Parameters */}
                          {(activeTool === 'flashcards' || activeTool === 'quiz') && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="p-5 bg-muted/10 border border-border/60 rounded-2xl space-y-6 relative overflow-hidden"
                            >
                              <div className="flex items-center justify-between mb-2">
                                 <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/50">Module_Parameters</span>
                                 <div className="h-px flex-1 bg-border/40 mx-3" />
                                 <SlidersHorizontal className="w-3 h-3 text-muted-foreground/30" />
                              </div>
                              
                              <div className="space-y-5">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/60">Node Density</label>
                                    <span className="font-mono text-[10px] font-bold text-primary">{toolCount}</span>
                                  </div>
                                  <Input 
                                    type="range" 
                                    min={3} 
                                    max={15}
                                    value={toolCount} 
                                    onChange={e => setToolCount(parseInt(e.target.value))}
                                    className="h-6 accent-primary"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <label className="text-[9px] font-bold uppercase tracking-widest text-foreground/60">Reasoning Depth</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(d => (
                                      <button
                                        key={d}
                                        onClick={() => setToolDifficulty(d)}
                                        className={cn(
                                          "px-3 py-2 text-[9px] font-bold uppercase tracking-widest rounded border transition-all",
                                          toolDifficulty === d 
                                            ? "bg-primary/10 border-primary/30 text-primary shadow-sm" 
                                            : "bg-background border-border/40 text-muted-foreground hover:border-border/80"
                                        )}
                                      >
                                        {d}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}

                          <div className="space-y-2">
                            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40 mb-3 block">Available_Pipelines</span>
                            <div className="grid gap-2">
                              {[
                                { id: 'flashcards', title: 'Recall Nodes', desc: 'Active memory synthesis', icon: Layers },
                                { id: 'quiz', title: 'Logic Probe', desc: 'Neural assessment module', icon: BrainCircuit },
                                { id: 'visualization', title: 'Conceptual Map', desc: 'Visual mental modeling', icon: Globe },
                              ]
                              .map(t => (
                                <button 
                                  key={t.id}
                                  className={cn(
                                    "flex items-center gap-4 p-4 transition-all text-left group relative border rounded-xl active:scale-[0.98]",
                                    activeTool === t.id && (isGeneratingTool || toolResult) 
                                      ? "bg-primary/5 border-primary/30 shadow-sm" 
                                      : "bg-background border-border/40 hover:border-border/80"
                                  )}
                                  onClick={() => runTool(t.id as any)} 
                                  disabled={!selectedSourceId || isGeneratingTool}
                                >
                                  <div className={cn(
                                    "w-10 h-10 shrink-0 rounded-lg flex items-center justify-center transition-all",
                                    activeTool === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                                  )}>
                                     {(activeTool === t.id && isGeneratingTool) ? <Loader2 className="w-4 h-4 animate-spin" /> : <t.icon className="w-4 h-4" />}
                                  </div>
                                  <div className="flex flex-col min-w-0">
                                    <span className={cn("text-[13px] font-bold tracking-tight", activeTool === t.id ? 'text-primary' : 'text-foreground')}>{t.title}</span>
                                    <span className="text-[8px] font-mono font-bold uppercase tracking-widest mt-0.5 opacity-40">{t.desc}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {selectedText && (
                             <div className="mt-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 animate-in slide-in-from-bottom-2">
                               <div className="flex items-center gap-2 mb-3">
                                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                 <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-600/80">Targeted_Selection</span>
                               </div>
                               <p className="text-[12px] font-serif italic text-amber-900/70 dark:text-amber-300/70 leading-relaxed line-clamp-4 bg-background/40 p-3 rounded border border-amber-500/10">
                                 "{selectedText}"
                               </p>
                               <Button 
                                 variant="ghost" 
                                 onClick={() => setSelectedText(null)} 
                                 className="w-full mt-3 h-8 text-[9px] font-bold uppercase tracking-widest hover:bg-amber-500/10 text-amber-700/60"
                               >
                                 Release Selection
                               </Button>
                             </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Tools Output Area */}
                <div className={`flex-1 relative bg-background/50 flex flex-col h-full transition-all duration-500 overflow-hidden ${isFullScreen ? 'fixed inset-0 z-[100] bg-background' : 'z-0'}`}>
                  {isGeneratingTool ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl gap-8 p-12 text-center animate-in fade-in zoom-in-95 duration-700">
                      <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                        <div className="absolute inset-0 rounded-full border-[2px] border-primary/10" />
                        <div className="absolute inset-0 rounded-full border-[2px] border-primary border-t-transparent animate-spin" style={{ animationDuration: '1.2s' }} />
                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20">
                          <BrainCircuit className="w-6 h-6 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-6 flex flex-col items-center justify-center">
                        <div className="space-y-2">
                           <span className="text-[10px] font-mono font-bold text-primary/60 uppercase tracking-[0.4em]">Neural_Synthesis_Active</span>
                           <h3 className="text-3xl font-serif font-black tracking-tighter text-foreground italic">Reconstructing Context</h3>
                        </div>
                        <div className="w-64 h-1 bg-muted overflow-hidden rounded-full border border-border/10">
                          <motion.div className="h-full bg-primary" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }} />
                        </div>
                      </div>
                    </div>
                  ) : !toolResult ? (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center bg-background relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                      <div className="w-20 h-20 bg-muted/20 border border-border/40 rounded-2xl flex items-center justify-center mb-8 opacity-40">
                         <Sparkles className="w-8 h-8" />
                      </div>
                      <h3 className="text-2xl font-serif font-black tracking-tighter text-foreground mb-4 italic text-muted-foreground/40">Synthesis Workbench</h3>
                      <p className="text-[10px] font-mono font-bold text-muted-foreground/30 max-w-sm leading-relaxed uppercase tracking-widest">
                         SYSTEM_IDLE: Select a pipeline module to initiate cognitive processing relative to active context nodes.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col h-full overflow-hidden bg-background">
                      <div className="border-b border-border/40 bg-background/95 backdrop-blur-md px-6 lg:px-8 h-16 flex items-center justify-between shrink-0 z-30 sticky top-0 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                            {activeTool === 'flashcards' ? <Layers className="w-5 h-5" /> : activeTool === 'quiz' ? <BrainCircuit className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h2 className="font-serif font-black tracking-tighter text-xl text-foreground capitalize italic">{activeTool}</h2>
                              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10">{toolDifficulty}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono font-bold text-muted-foreground/40 uppercase tracking-widest">Process_ID: {activeTool.toUpperCase()}_77_ALPHA</span>
                            </div>
                          </div>
                        </div>
                         <div className="flex items-center gap-2 text-muted-foreground">
                          <div className="h-4 w-px bg-border/40 mx-2" />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setIsFullScreen(!isFullScreen)}
                            className="rounded-lg h-8 w-8 hover:bg-muted"
                          >
                            {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          </Button>
                        </div>
                      </div>
                      
                      <ScrollArea className="flex-1 px-6 pt-10 md:px-12 md:pt-16 bg-muted/5 relative">
                        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                        <div className="max-w-4xl mx-auto space-y-10 pb-32 relative z-10">
                          {activeTool === 'flashcards' && toolResult && Array.isArray(toolResult) && (
                             <div className="grid gap-6">
                               {toolResult.map((fc: any, i: number) => (
                                 <FlashcardItem key={i} fc={fc} index={i} />
                               ))}
                             </div>
                          )}

                          {activeTool === 'quiz' && toolResult && Array.isArray(toolResult) && (
                             <div className="space-y-8">
                               {toolResult.map((q: any, i: number) => (
                                 <QuizQuestionItem key={i} q={q} index={i} />
                               ))}
                              </div>
                           )}

                           {activeTool === 'visualization' && (
                             <div className="bg-card border border-border/40 rounded-3xl md:rounded-[3rem] p-6 sm:p-8 md:p-16 lg:p-20 shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity" style={{ backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                                
                                <div className="relative z-10 space-y-12 max-w-5xl mx-auto">
                                  <div className="text-center space-y-6">
                                    <motion.div 
                                      initial={{ scale: 0.8, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-primary/10 shadow-inner group-hover:rotate-6 transition-all duration-700"
                                    >
                                      <Globe className="w-10 h-10 text-primary" />
                                    </motion.div>
                                    <div className="space-y-4">
                                      <h4 className="font-serif text-4xl md:text-6xl font-black text-foreground text-center text-balance tracking-tighter leading-[0.95] italic">
                                        {toolResult.title}
                                      </h4>
                                      <p className="font-serif text-lg md:text-2xl text-muted-foreground leading-relaxed text-center max-w-3xl mx-auto italic opacity-80">
                                        {toolResult.description}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="p-8 md:p-14 bg-muted/20 rounded-[3rem] border border-border/40 shadow-inner relative overflow-hidden group/inner">
                                    <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                                    
                                    <div className="flex items-center justify-center gap-3 mb-10">
                                      <div className="h-px w-10 bg-primary/20" />
                                      <h5 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary/60 italic flex items-center gap-2">
                                        <Layers className="w-3.5 h-3.5" /> Conceptual Blueprint
                                      </h5>
                                      <div className="h-px w-10 bg-primary/20" />
                                    </div>

                                    <div className="grid gap-5 sm:grid-cols-2 relative z-10">
                                      {toolResult.visualElements?.map((el: string, idx: number) => (
                                        <motion.div 
                                          key={idx} 
                                          initial={{ opacity: 0, x: -10 }}
                                          animate={{ opacity: 1, x: 0 }}
                                          transition={{ delay: idx * 0.1 }}
                                          className="flex gap-5 items-start p-6 bg-background/60 backdrop-blur-sm border border-border/40 hover:border-primary/40 rounded-[2rem] shadow-sm transition-all duration-500 group/item hover:translate-y-[-2px] hover:shadow-xl hover:shadow-primary/5 active:scale-[0.98]"
                                        >
                                          <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10 group-hover/item:bg-primary group-hover/item:text-primary-foreground group-hover/item:rotate-12 transition-all duration-500">
                                             <span className="text-xs font-black italic">{idx + 1}</span>
                                          </div>
                                          <span className="leading-relaxed font-bold text-[16px] text-foreground/80 group-hover/item:text-foreground transition-colors pt-1 italic">{el}</span>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="pt-12 text-center border-t border-border/20">
                                    <div className="inline-block px-4 py-1 rounded-full bg-muted border border-border/40 mb-6 font-black text-[9px] uppercase tracking-widest text-muted-foreground/60">
                                       Synthesis Objective
                                    </div>
                                    <p className="font-serif text-2xl md:text-3xl text-foreground font-black leading-tight italic tracking-tight">
                                      <span className="text-primary mr-2">“</span>
                                      {toolResult.howItHelps}
                                      <span className="text-primary ml-2">”</span>
                                    </p>
                                  </div>
                                </div>
                             </div>
                           )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
