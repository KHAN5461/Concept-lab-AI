import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Library, BookOpen, Atom, Subscript, ThumbsUp, ThumbsDown, Sparkles, Menu, FlaskConical, Telescope, Compass, Brain, Calculator, Trash2, Plus, MessageSquare, Share, LogIn, LogOut, Loader2, ArrowRight, Beaker, MoreHorizontal, Copy, User as UserIcon, Trophy, Settings, BookMarked, Pencil, Download, Code, ChevronUp, ChevronDown, ChevronRight, X, Square } from 'lucide-react';
import { AppSidebar } from './components/layout/AppSidebar';
import { ChatInputArea } from './components/chat/ChatInputArea';
import { cn } from './lib/utils';
import { SimulationViewer } from './components/SimulationViewer';
import { InteractiveGraph } from './components/InteractiveGraph';
import { ConceptMapViewer } from './components/ConceptMapViewer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useProfile, type UserProfile, defaultProfile } from './lib/profile';
import { SettingsView } from './components/SettingsView';
import { ResourceLibrary } from './components/ResourceLibrary';
import { Laboratory } from './components/Laboratory';
import { LabWorkspace } from './components/LabWorkspace';
import { LoginView } from './components/LoginView';
import { useLabStore } from './store/useLabStore';
import { toast } from 'sonner';
import { streamChat, type Message } from './lib/gemini';
import { motion, AnimatePresence } from 'motion/react';
import 'katex/dist/katex.min.css';

export type AIPersona = 'Socratic Tutor' | 'Beginner Explainer' | 'Advanced Researcher';
export type StudyMode = 'Learn Mode' | 'Practice Mode' | 'Quiz Mode';

import { auth, loginWithGoogle, logout, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';

import { handleFirestoreError, OperationType } from './lib/firebase-errors';
import { useAppSessions, getInitialSessions, type Session, type Source } from './hooks/useAppSessions';
import { ChatMessage } from './components/chat/ChatMessage';
import { CodeBlock } from './components/chat/CodeBlock';
import { Toaster } from '@/components/ui/sonner';
import { CommandPalette } from './components/CommandPalette';

export default function App() {
  const { profile, setProfile, addExp, addQuizCompleted, updateTraits, updateProfileDetails } = useProfile();
  
  const [user, setUser] = useState<User | null>(null);
  const {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession,
    updateSessionMessages,
    switchSession,
    createNewSession,
    clearHistory,
    renameSession,
    duplicateSession,
    deleteSession,
    deleteSessions
  } = useAppSessions(user);
  
  const [activeView, setActiveView] = useState<'chat' | 'laboratory' | 'resources' | 'settings' | 'login'>('chat');
  const [activeResource, setActiveResource] = useState<any | null>(null);
  const [laboratoryInitialText, setLaboratoryInitialText] = useState<string>('');

  const handleSendToLaboratory = async (text: string) => {
    if (!user) {
      setActiveView('login');
      toast('Please sign in to send content to the laboratory.');
      return;
    }
    try {
      const res = await fetch('/api/upload-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, filename: 'AI Gen Content' })
      });
      const data = await res.json();
      if (data.id) {
        useLabStore.getState().addSource({ id: data.id, filename: data.filename });
        useLabStore.getState().setSelectedSource(data.id);
        setActiveView('laboratory');
        toast.success('Generated content sent to laboratory');
      } else {
        toast.error('Failed to send to laboratory: ' + data.error);
      }
    } catch (e) {
      toast.error('Failed to send to laboratory');
    }
  };

  const remoteProfileSyncing = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        const guestSessions = getInitialSessions();
        setSessions(guestSessions);
        try {
          const active = localStorage.getItem('conceptlab_guest_active_session');
          if (active && guestSessions.some(s => s.id === active)) {
            setActiveSessionId(active);
          } else {
            setActiveSessionId(guestSessions.length > 0 ? guestSessions[0].id : null);
          }
        } catch(e) {}
      } else {
        // Sync guest sessions to Firebase if any exist
        try {
          const saved = localStorage.getItem('conceptlab_guest_sessions');
          if (saved) {
            const guestSessions = JSON.parse(saved);
            if (guestSessions && guestSessions.length > 0) {
              guestSessions.forEach((s: Session) => {
                 if (s.messages && s.messages.length > 0) {
                   setDoc(doc(db, 'sessions', s.id), {
                     userId: currentUser.uid,
                     title: s.title,
                     messages: s.messages,
                     updatedAt: s.updatedAt
                   }).catch(e => console.error(e));
                 }
              });
              localStorage.removeItem('conceptlab_guest_sessions');
              localStorage.removeItem('conceptlab_guest_active_session');
            }
          }
        } catch(e) {}
      }
    });
    return unsub;
  }, []);

  // Sync profile from Firestore
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, 'profiles', user.uid), (doc) => {
      if (doc.exists()) {
        remoteProfileSyncing.current = true;
        setProfile({ ...defaultProfile, ...doc.data() } as UserProfile);
        setTimeout(() => remoteProfileSyncing.current = false, 100);
      }
    }, (error) => {
      console.error("Profile sync error", error);
      handleFirestoreError(error, OperationType.GET, `profiles/${user.uid}`);
    });
    return () => unsub();
  }, [user, setProfile]);

  // Sync profile to Firestore on change
  useEffect(() => {
    if (!user || remoteProfileSyncing.current) return;
    const saveProfile = async () => {
      try {
        await setDoc(doc(db, 'profiles', user.uid), {
          ...defaultProfile,
          ...profile,
          userId: user.uid,
          name: user.displayName || profile.name || 'Explorer'
        });
      } catch (error) {
        console.error("Profile save error", error);
        handleFirestoreError(error, OperationType.UPDATE, `profiles/${user.uid}`);
      }
    };
    saveProfile();
  }, [profile, user]);

  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef(false);
  const [persona, setPersona] = useState<AIPersona>('Socratic Tutor');
  const [studyMode, setStudyMode] = useState<StudyMode>('Learn Mode');
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        setSessions(prevSessions => {
          if (prevSessions.length === 0) return prevSessions;
          const currentIndex = prevSessions.findIndex(s => s.id === activeSessionId);
          if (currentIndex === -1) return prevSessions;
          
          let newIndex;
          if (e.key === 'ArrowUp') {
            newIndex = currentIndex > 0 ? currentIndex - 1 : prevSessions.length - 1;
          } else {
            newIndex = currentIndex < prevSessions.length - 1 ? currentIndex + 1 : 0;
          }
          
          setActiveSessionId(prevSessions[newIndex].id);
          return prevSessions;
        });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSessionId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareData = params.get('share');
    if (shareData) {
      try {
        const decoded = decodeURIComponent(atob(shareData));
        const parsed = JSON.parse(decoded);
        
        const newSession: Session = {
          id: Date.now().toString(),
          title: `Shared: ${parsed.t}`,
          messages: parsed.m.map((msg: any) => ({
            id: Math.random().toString(),
            role: msg.r,
            text: msg.text
          })),
          updatedAt: Date.now()
        };
        
        setSessions(prev => [newSession, ...prev]);
        setActiveSessionId(newSession.id);
        
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (e) {
        console.error('Failed to parse share data');
      }
    }
  }, []);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem('conceptlab_guest_sessions', JSON.stringify(sessions));
      } catch (e) {}
    }
  }, [sessions, user]);

  useEffect(() => {
    if (!user) {
      try {
        if (activeSessionId) {
          localStorage.setItem('conceptlab_guest_active_session', activeSessionId);
        } else {
          localStorage.removeItem('conceptlab_guest_active_session');
        }
      } catch (e) {}
    }
  }, [activeSessionId, user]);

  const isScrolledUp = useRef(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    if (!viewportRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = viewportRef.current;
    isScrolledUp.current = Math.abs(scrollHeight - clientHeight - scrollTop) > 100;
  };

  useEffect(() => {
    if (!isScrolledUp.current) {
      bottomRef.current?.scrollIntoView();
    }
  }, [messages]);

  const handleRemoveSource = (fileName: string) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id === activeSessionId && s.sources) {
        return { ...s, sources: s.sources.filter(src => src.name !== fileName) };
      }
      return s;
    }));
  };

  const [isSwitchingSession, setIsSwitchingSession] = useState(false);

  const switchSessionWithView = (id: string | null) => {
    if (id === activeSessionId) return;
    setIsSwitchingSession(true);
    switchSession(id);
    if (id) setActiveView('chat');
    // Minimal delay to allow render transition
    setTimeout(() => setIsSwitchingSession(false), 200);
  };

  const createNewSessionWithView = () => {
    createNewSession();
    setActiveView('chat');
  };


  const handleShareSession = async () => {
    if (!activeSession) return;
    
    // Create a very simple serialization (for demo purposes)
    const exportData = JSON.stringify({
      t: activeSession.title,
      m: activeSession.messages.map(m => ({r: m.role, text: m.text}))
    });
    
    const encoded = btoa(encodeURIComponent(exportData));
    const url = `${window.location.origin}${window.location.pathname}?share=${encoded}`;
    
    try {
      await navigator.clipboard.writeText(url);
      alert('Share link copied to clipboard!');
    } catch {
      alert('Could not copy link to clipboard');
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Alt + N for New Chat
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        createNewSessionWithView();
        setTimeout(() => textareaRef.current?.focus(), 0);
        return;
      }

      // Alt + Up/Down for navigating sessions
      if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        if (sessions.length <= 1) return;
        const currentIndex = sessions.findIndex(s => s.id === activeSessionId);
        if (currentIndex === -1) return;
        
        let newIndex = currentIndex;
        if (e.key === 'ArrowUp') {
           newIndex = currentIndex > 0 ? currentIndex - 1 : sessions.length - 1;
        } else {
           newIndex = currentIndex < sessions.length - 1 ? currentIndex + 1 : 0;
        }
        switchSessionWithView(sessions[newIndex].id);
        return;
      }

      // Press '/' to focus input, if not already focusing an input
      if (e.key === '/' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        textareaRef.current?.focus();
        return;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [sessions, activeSessionId, createNewSessionWithView, switchSessionWithView]);



  const [isCompressing, setIsCompressing] = useState(false);

  const compressContext = async () => {
    if (!activeSession || activeSession.messages.length < 10) return;
    setIsCompressing(true);
    toast.loading('Compressing conversation context...');
    
    try {
      const chatContext = activeSession.messages.map(m => `${m.role}: ${m.text}`).join('\n');
      const response = await streamChat([{
        id: 'compress',
        role: 'user',
        text: `Summarize the key points and conclusions of this conversation so far in under 300 words. Maintain all critical facts and technical details. This summary will be used as background context for continuing the discussion.\n\nCONVERSATION:\n${chatContext}`
      }], '', 'Advanced Researcher', 'Learn Mode');
      
      let summary = '';
      for await (const chunk of response) {
        summary += chunk;
      }
      
      const compressedMessage: Message = {
        id: 'context-summary-' + Date.now(),
        role: 'model',
        text: `🧠 **Context Compressed**\n\nI've summarized our previous ${activeSession.messages.length} messages to optimize our neural context window. Here's what we've covered:\n\n${summary}\n\n*Previous history is archived. We can now dive deeper into new aspects with more focus.*`,
      };
      
      // Keep only the summary + maybe the very last user message if any? 
      // For simplicity, we just clear and add summary.
      updateSessionMessages(activeSession.id, [compressedMessage]);
      toast.success('Context efficiently compressed');
    } catch (error) {
      toast.error('Compression unsuccessful');
    } finally {
      setIsCompressing(false);
    }
  };

  const sendPrompt = async (text: string, attachedFiles: File[] = []) => {
    let messageText = text;

    if (text.trim().startsWith('/')) {
      const match = text.trim().match(/^\/(\w+)(?:\s+(.*))?$/);
      if (match) {
        const cmd = match[1].toLowerCase();
        let arg = match[2];
        
        const currentSession = sessions.find(s => s.id === activeSessionId);
        const lastMessage = currentSession?.messages.filter(m => m.role === 'model').pop();
        
        if (!arg && lastMessage) {
           arg = lastMessage.text;
        } else if (!arg) {
           arg = 'General topic';
        }

        let targetTool: string | null = null;
        if (['flashcard', 'flashcards'].includes(cmd)) targetTool = 'flashcards';
        if (['quiz', 'test'].includes(cmd)) targetTool = 'quiz';
        if (['map', 'conceptmap'].includes(cmd)) targetTool = 'concept-map';
        if (['plan', 'planner'].includes(cmd)) targetTool = 'planner';
        if (['sim', 'simulation'].includes(cmd)) targetTool = 'simulations';

        if (targetTool) {
          if (!user) {
            setActiveView('login');
            toast('Please sign in to use the laboratory.');
            return;
          }
          // Do not pass content because content is for saved JSON datasets
          setActiveResource({ type: targetTool, title: arg });
          setActiveView('laboratory');
          return;
        }
      }
    }

    if ((!text.trim() && attachedFiles.length === 0) || isLoading) return;

    if (attachedFiles.length > 0) {
      let fileContext = `\n\n[Attached ${attachedFiles.length} file(s)]\n`;
      for (const file of attachedFiles) {
        try {
          const content = await file.text();
          fileContext += `\n--- ATTACHED FILE: ${file.name} ---\n${content.substring(0, 30000)}\n`;
        } catch (e) {
          console.error(`Failed to read file ${file.name}`);
        }
      }
      messageText = text.trim() + fileContext;
    }

    let currentSessionId = activeSessionId;
    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      const newSession: Session = {
        id: currentSessionId,
        title: 'New Chat',
        messages: [],
        updatedAt: Date.now()
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(currentSessionId);
    }

    const userMessage: Message = { id: Date.now().toString(), role: 'user', text: messageText };
    
    // Auto-detect basic topics and give EXP
    const lowerText = text.toLowerCase();
    if (lowerText.includes('physics') || lowerText.includes('force') || lowerText.includes('motion') || lowerText.includes('newton')) {
      addExp('physics', 10);
    } else if (lowerText.includes('chem') || lowerText.includes('reaction') || lowerText.includes('bond') || lowerText.includes('electron')) {
      addExp('chemistry', 10);
    } else if (lowerText.includes('math') || lowerText.includes('equation') || lowerText.includes('solve') || lowerText.includes('integral')) {
      addExp('math', 10);
    } else {
      addExp('general', 5);
    }

    if (lowerText.includes('quiz')) {
      addQuizCompleted();
    }
    
    updateSessionMessages(currentSessionId, prev => [...prev, userMessage]);
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    updateSessionMessages(currentSessionId, prev => [...prev, { id: modelMessageId, role: 'model', text: '' }]);

    // Grab the existing messages directly from the specific session so it's fresh
    const specificSession = sessions.find(s => s.id === currentSessionId);
    const existingMessages = specificSession ? specificSession.messages : [];
    const chatHistory = [...existingMessages, userMessage];

    const profileContext = `User Level: ${profile.level}. Total XP: ${profile.totalExp}.
Physics Level: ${profile.subjects.physics.level}
Chemistry Level: ${profile.subjects.chemistry.level}
Math Level: ${profile.subjects.math.level}
Strengths: ${profile.strengths.join(', ')}
Weaknesses: ${profile.weaknesses.join(', ')}`;

    try {
      abortRef.current = false;
      const stream = streamChat(chatHistory, profileContext, persona, studyMode);
      for await (const chunk of stream) {
        if (abortRef.current) break;
        updateSessionMessages(currentSessionId, prev => prev.map(msg => 
          msg.id === modelMessageId ? { ...msg, text: msg.text + chunk } : msg
        ));
      }
    } catch (error) {
      console.error(error);
      if (!abortRef.current) {
        updateSessionMessages(currentSessionId, prev => prev.map(msg => 
          msg.id === modelMessageId ? { ...msg, text: msg.text + '\n\n**Oops!** We encountered an issue connecting to the AI. Please try sending your message again.' } : msg
        ));
      }
    } finally {
      setIsLoading(false);
      abortRef.current = false;
    }
  };



  const handleFeedback = async (id: string, feedback: 'up' | 'down') => {
    if (!activeSessionId) return;
    updateSessionMessages(activeSessionId, prev => prev.map(msg => 
      msg.id === id ? { ...msg, feedback: msg.feedback === feedback ? undefined : feedback } : msg
    ));

    if (user && feedback) {
      try {
        const feedbackId = Date.now().toString(36) + Math.random().toString(36).substring(2);
        await setDoc(doc(db, 'feedbacks', feedbackId), {
          userId: user.uid,
          sessionId: activeSessionId,
          messageId: id,
          value: feedback,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error("Feedback error", error);
      }
    }
  };



  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isSplitView, setIsSplitView] = useState(false);

  // Monitor screen size for split-view eligibility
  const [canSplit, setCanSplit] = useState(window.innerWidth > 1440);
  useEffect(() => {
    const check = () => {
      const splitEligible = window.innerWidth > 1440;
      setCanSplit(splitEligible);
      if (!splitEligible) {
        setIsSplitView(false);
      }
    };
    window.addEventListener('resize', check);
    check();
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <div className="flex bg-background h-[100dvh] overflow-hidden font-sans selection:bg-primary/20 selection:text-primary">
      
      <CommandPalette 
        open={commandPaletteOpen} 
        onOpenChange={setCommandPaletteOpen}
        sessions={sessions}
        switchSession={switchSessionWithView}
        setActiveView={setActiveView}
        createNewSession={createNewSessionWithView}
      />
      <div className="w-[340px] border-r border-border/40 flex-col hidden md:flex shrink-0 bg-background/50 backdrop-blur-xl relative z-40">
        <div className="absolute right-0 top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-border/40 to-transparent" />
        <AppSidebar
          user={user}
          profile={profile}
          activeView={activeView}
          setActiveView={setActiveView}
          setActiveResource={setActiveResource}
          sessions={sessions}
          activeSessionId={activeSessionId}
          createNewSession={createNewSessionWithView}
          switchSession={switchSessionWithView}
          renameSession={renameSession}
          duplicateSession={duplicateSession}
          deleteSession={deleteSession}
          deleteSessions={deleteSessions}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full bg-background relative min-w-0 transition-shadow duration-300 overflow-hidden">
        
        {/* Header - Conditionally visible */}
        {activeView !== 'settings' && activeView !== 'laboratory' && (
          <header className="h-14 md:h-16 border-b border-border/40 flex items-center px-3 md:px-6 justify-between bg-background/80 backdrop-blur-xl z-20 shrink-0 sticky top-0">
            <div className="flex items-center gap-1 min-w-0">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger 
                  render={(props) => (
                    <Button {...props} variant="ghost" size="icon" className="md:hidden rounded-xl h-9 w-9">
                      <Menu className="w-5 h-5" />
                    </Button>
                  )}
                />
                <SheetContent side="left" className="p-0 w-[280px] border-r-0">
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                  <AppSidebar
                    user={user}
                    profile={profile}
                    activeView={activeView}
                    setActiveView={setActiveView}
                    setActiveResource={setActiveResource}
                    sessions={sessions}
                    activeSessionId={activeSessionId}
                    createNewSession={createNewSessionWithView}
                    switchSession={switchSessionWithView}
                    renameSession={renameSession}
                    duplicateSession={duplicateSession}
                    deleteSession={deleteSession}
                    deleteSessions={deleteSessions}
                    onItemClick={() => setIsMobileMenuOpen(false)}
                  />
                </SheetContent>
              </Sheet>
              
              <div className="font-serif font-bold text-lg flex items-center gap-2 md:hidden tracking-tight shrink-0">
                <span className="text-primary truncate max-w-[120px]">ConceptLab</span>
              </div>

              <div className="hidden md:flex items-center gap-3">
                <div className="h-4 w-[1px] bg-border/60 mx-1" />
                <span className="font-bold text-[14px] tracking-tight text-foreground/80 truncate max-w-[200px] lg:max-w-[400px]">
                  {activeView === 'chat' ? (activeSession?.title || 'New Chat') : 
                   activeView === 'resources' ? 'Library' : 'Login'}
                </span>
                {activeView === 'chat' && messages.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/5 text-primary font-bold uppercase tracking-wider border border-primary/10">
                    {messages.length} SMS
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
              {activeView === 'chat' && (
                <>
                  {activeSession && activeSession.messages.length > 10 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={(props) => (
                          <Button 
                            {...props}
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                               props.onClick?.(e);
                               compressContext();
                            }}
                            disabled={isCompressing}
                            className="h-8 w-8 rounded-lg text-primary hover:bg-primary/5 transition-all"
                          >
                            {isCompressing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                          </Button>
                        )} />
                        <TooltipContent>Compress Context (AI Summary)</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  {canSplit && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger render={(props) => (
                          <Button 
                            {...props}
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                               props.onClick?.(e);
                               setIsSplitView(!isSplitView);
                            }}
                            className={cn("h-8 w-8 rounded-lg transition-all", isSplitView ? "bg-primary/10 text-primary" : "text-muted-foreground")}
                          >
                            <BookOpen className="w-4 h-4" />
                          </Button>
                        )} />
                        <TooltipContent>Toggle Split View</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <div className="hidden lg:flex items-center gap-2 mr-2">
                    <Select value={studyMode} onValueChange={(v) => setStudyMode(v as StudyMode)}>
                      <SelectTrigger className="w-[130px] h-8 text-[11px] font-bold uppercase tracking-wider rounded-lg border-border/40 bg-muted/30">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Learn Mode">Learn Mode</SelectItem>
                        <SelectItem value="Practice Mode">Practice Mode</SelectItem>
                        <SelectItem value="Quiz Mode">Quiz Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {messages.length > 0 && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/5 transition-all md:hidden" onClick={handleShareSession}>
                      <Share className="w-4 h-4" />
                    </Button>
                  )}
                  {messages.length > 0 && (
                    <Button variant="ghost" size="sm" className="hidden md:flex h-8 px-3 text-[12px] font-bold uppercase tracking-wider rounded-lg hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/20 transition-all font-sans" onClick={handleShareSession}>
                      <Share className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  )}
                </>
              )}
              {activeView !== 'chat' && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   className="h-8 md:h-9 px-3 text-[11px] font-bold uppercase tracking-wider rounded-lg hover:bg-primary/5 hover:text-primary transition-all font-sans" 
                   onClick={() => setActiveView('chat')}
                 >
                   <MessageSquare className="w-4 h-4 mr-2" />
                   Chat
                 </Button>
              )}
            </div>
          </header>
        )}


        {activeView === 'settings' ? (
          <div className="flex-1 min-w-0 relative">
            <SettingsView profile={profile} user={user} onClose={() => setActiveView('chat')} updateProfile={updateProfileDetails} />
          </div>
        ) : (activeView === 'laboratory' && !isSplitView) ? (
          <div className="flex-1 min-w-0 relative">
            <LabWorkspace onClose={() => setActiveView('chat')} />
          </div>
        ) : activeView === 'login' ? (
          <div className="flex-1 min-w-0 relative">
            <LoginView onClose={() => setActiveView('chat')} />
          </div>
        ) : activeView === 'resources' ? (
          <div className="flex-1 min-w-0 relative">
            <ResourceLibrary 
              onClose={() => setActiveView('chat')}
              onOpenResource={(r) => {
                if (!user) {
                  setActiveView('login');
                  toast('Please sign in to use the laboratory.');
                  return;
                }
                setActiveResource(r);
                setActiveView('laboratory');
              }} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
            <div className={cn(
              "flex-1 flex flex-col min-h-0 relative z-0 transition-all duration-500 overflow-hidden",
              (isSplitView && activeView === 'chat') ? "border-r border-border/40" : ""
            )}>

              {messages.length === 0 ? (
                <ScrollArea className="flex-1 min-h-0" viewportRef={viewportRef} onScroll={handleScroll}>
                  <div className="h-full min-h-[60dvh] flex items-center justify-center p-6">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                      className="max-w-4xl w-full flex flex-col items-center pb-12"
                    >
                      
                      <motion.div 
                        initial={{ y: 20, rotate: -10, opacity: 0 }}
                        animate={{ y: 0, rotate: 0, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.6, type: "spring" }}
                        className="relative mb-10"
                      >
                        <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
                        <div className="relative w-24 h-24 rounded-[2.5rem] bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/20">
                          <Library className="w-10 h-10 text-primary-foreground" />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-background border border-border shadow-lg rounded-xl px-3 py-1 flex items-center gap-1.5 animate-bounce">
                           <Sparkles className="w-3 h-3 text-primary" />
                           <span className="text-[10px] font-bold tracking-tighter uppercase">AI Active</span>
                        </div>
                      </motion.div>
                      
                      <motion.h1 
                         initial={{ opacity: 0, y: 10 }}
                         animate={{ opacity: 1, y: 0 }}
                         transition={{ delay: 0.2 }}
                         className="text-3xl sm:text-6xl font-serif font-black mb-4 sm:mb-6 tracking-tight text-center text-foreground px-4"
                      >
                         Master <span className="text-primary italic">Anything</span>.
                      </motion.h1>
                      <motion.p 
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         transition={{ delay: 0.3 }}
                         className="text-muted-foreground font-sans max-w-[600px] text-center mb-6 sm:mb-12 text-[14px] sm:text-[17px] leading-relaxed font-medium px-6"
                      >
                        ConceptLab is your neural-accelerated STEM learning partner. High-fidelity simulations, interactive graphs, and Socratic guidance.
                      </motion.p>
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full max-w-2xl px-4"
                      >
                        {[
                          { icon: FlaskConical, text: "Explain Special Relativity", desc: "Complex physics simplified", color: "text-orange-500", bg: "bg-orange-500/10" },
                          { icon: Atom, text: "Simulate Quantum Tunneling", desc: "Visual interactive learning", color: "text-purple-500", bg: "bg-purple-500/10" },
                          { icon: Brain, text: "Map Neural Networks", desc: "Visualizing intelligence", color: "text-emerald-500", bg: "bg-emerald-500/10" },
                          { icon: Calculator, text: "Solve Taylor Series", desc: "Step-by-step derivation", color: "text-blue-500", bg: "bg-blue-500/10" }
                        ].map((item, i) => (
                          <button 
                            key={i}
                            onClick={() => sendPrompt(item.text)}
                            className="group flex items-start gap-4 p-5 rounded-[22px] border bg-card hover:bg-muted/50 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all text-left relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                               <ArrowRight className="w-4 h-4 text-primary" />
                            </div>
                            <div className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 transition-all group-hover:scale-110 group-hover:rotate-3 shadow-sm", item.bg, item.color)}>
                               <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-[15px] leading-snug tracking-tight mb-1">{item.text}</span>
                              <span className="text-[12px] text-muted-foreground font-medium opacity-70 tracking-tight">{item.desc}</span>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    </motion.div>
                  </div>
                </ScrollArea>
              ) : (
                <ScrollArea className="flex-1 min-h-0" viewportRef={viewportRef} onScroll={handleScroll}>
                  <AnimatePresence mode="wait">
                    <motion.div 
                      key={activeSessionId}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isSwitchingSession ? 0.3 : 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col pb-6"
                    >
                      {messages.map((m, index) => (
                        <ChatMessage 
                          key={m.id} 
                          message={m} 
                          isGenerating={isLoading && index === messages.length - 1 && m.role === 'model'} 
                          onFeedback={handleFeedback} 
                          onSendToLaboratory={handleSendToLaboratory} 
                        />
                      ))}
                      <div ref={bottomRef} className="h-10" />
                    </motion.div>
                  </AnimatePresence>
                </ScrollArea>
              )}
              
              <ChatInputArea 
                isLoading={isLoading}
                onSend={(text, files) => sendPrompt(text, files)}
                onStop={() => { abortRef.current = true; setIsLoading(false); }}
                textareaRef={textareaRef}
              />
            </div>
            {isSplitView && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: "40%", opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="h-full bg-background relative shrink-0"
              >
                 <LabWorkspace onClose={() => setIsSplitView(false)} isSplit />
              </motion.div>
            )}
          </div>
        )}
      </div>
      <Toaster position="top-center" expand={false} richColors />
    </div>
  );
}

