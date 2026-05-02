import { useState, useRef, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Layers, BrainCircuit, CalendarClock, FlaskConical, Beaker, Lock, Network, ArrowLeft, Search, Paperclip, Send, File as FileIcon, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ConceptMapGenerator } from './ConceptMapGenerator';
import { QuizGenerator } from './QuizGenerator';
import { FlashcardsGenerator } from './FlashcardsGenerator';
import { SimulationsGenerator } from './SimulationsGenerator';
import { StudyPlanner } from './StudyPlanner';
import { AudioOverviewGenerator } from './AudioOverviewGenerator';
import { Input } from '@/components/ui/input';
import { Headphones } from 'lucide-react';

const tools = [
  {
    id: 'audio-overview',
    name: 'Audio Overview',
    description: 'Listen to a lively, AI-hosted podcast discussion of your topic.',
    icon: <Headphones className="w-5 h-5 text-indigo-500" />,
    color: 'bg-indigo-500/10 border-indigo-500/20',
    available: true,
  },
  {
    id: 'concept-map',
    name: 'Concept Map Generator',
    description: 'Provide a topic and let AI map out related concepts and their connections.',
    icon: <Network className="w-5 h-5 text-purple-500" />,
    color: 'bg-purple-500/10 border-purple-500/20',
    available: true,
  },
  {
    id: 'simulations',
    name: 'Interactive Simulations',
    description: 'Explore physics and chemistry through hands-on simulations.',
    icon: <FlaskConical className="w-5 h-5 text-blue-500" />,
    color: 'bg-blue-500/10 border-blue-500/20',
    available: true,
  },
  {
    id: 'flashcards',
    name: 'AI Flashcards',
    description: 'Auto-generated flashcards from your previous conversations.',
    icon: <Layers className="w-5 h-5 text-rose-500" />,
    color: 'bg-rose-500/10 border-rose-500/20',
    available: true,
  },
  {
    id: 'quiz',
    name: 'Quiz Generator',
    description: 'Test your knowledge with adaptive multiple-choice quizzes.',
    icon: <BrainCircuit className="w-5 h-5 text-orange-500" />,
    color: 'bg-orange-500/10 border-orange-500/20',
    available: true,
  },
  {
    id: 'planner',
    name: 'Study Planner',
    description: 'Organize your study schedule and track your progress.',
    icon: <CalendarClock className="w-5 h-5 text-green-500" />,
    color: 'bg-green-500/10 border-green-500/20',
    available: true,
  }
];

export function Laboratory({ onBack, initialMessage, activeResource }: { onBack?: () => void, initialMessage?: string, activeResource?: any }) {
  const [activeTool, setActiveTool] = useState<string | null>(activeResource?.type || null);
  const [topicPrompt, setTopicPrompt] = useState<string>(activeResource?.title || 'General Knowledge');
  const [message, setMessage] = useState(initialMessage || '');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [attachedTools, setAttachedTools] = useState<{id: string, name: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildingStage, setBuildingStage] = useState(0);

  // Initialize message if prop changes (e.g. from Assistant Send to Laboratory)
  useEffect(() => {
    if (initialMessage) {
      setMessage(initialMessage);
      // Wait a moment then auto-run the build
      const timer = setTimeout(() => {
         handleRun(initialMessage);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [initialMessage]);

  const handleRun = async (overrideMessage?: React.MouseEvent | string) => {
    const textToRun = typeof overrideMessage === 'string' ? overrideMessage : message;
    if (!textToRun.trim() && uploadedFiles.length === 0 && attachedTools.length === 0) return;
    setIsBuilding(true);
    setBuildingStage(0);
    
    let combinedText = textToRun;
    if (uploadedFiles.length > 0) {
      let filesText = `\n\n=== UPLOADED NOTEBOOK SOURCES ===\nThe following sources have been provided. You MUST use them to accurately fulfill the user's request. If applicable, generate outputs strictly grounded in these sources.\n\n`;
      for (let i = 0; i < uploadedFiles.length; i++) {
        const file = uploadedFiles[i];
        try {
          const content = await file.text();
          filesText += `--- SOURCE: ${file.name} ---\n${content.substring(0, 30000)}\n\n`;
        } catch (e) {
          console.error("Failed to read file", file.name);
        }
      }
      combinedText += filesText;
    }
    
    setTopicPrompt(combinedText || 'General Knowledge');
    
    // Simulate thinking process
    setTimeout(() => setBuildingStage(1), 1000); // Selecting tool...
    setTimeout(() => setBuildingStage(2), 2000); // Analyzing content...
    setTimeout(() => setBuildingStage(3), 3000); // Generating output...
    setTimeout(() => {
      setIsBuilding(false);
      setBuildingStage(0);
      setMessage('');
      setUploadedFiles([]);
      
      if (attachedTools.length > 0) {
        setActiveTool(attachedTools[0].id);
        setAttachedTools([]);
        return;
      }

      // Fallback
      if (textToRun) {
        const lower = textToRun.toLowerCase();
        if (lower.includes('flashcard') || lower.includes('card')) {
          setActiveTool('flashcards');
        } else if (lower.includes('quiz') || lower.includes('test')) {
          setActiveTool('quiz');
        } else if (lower.includes('map') || lower.includes('concept')) {
          setActiveTool('concept-map');
        } else if (lower.includes('plan') || lower.includes('schedule')) {
          setActiveTool('planner');
        } else if (lower.includes('audio') || lower.includes('podcast') || lower.includes('overview')) {
          setActiveTool('audio-overview');
        } else {
          setActiveTool('simulations');
        }
      } else {
        setActiveTool('simulations');
      }
    }, 4500);
  };

  if (isBuilding) {
    const stages = [
      "Initializing laboratory environment...",
      "Selecting the appropriate tool...",
      "Analyzing content schema...",
      "Generating structured output...",
    ];

    return (
      <div className="flex-1 h-full bg-background relative min-w-0 overflow-hidden flex flex-col items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center max-w-md w-full p-10 bg-card border rounded-3xl shadow-xl"
        >
           <div className="relative w-24 h-24 mb-10">
             <div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5" />
             <motion.div 
               animate={{ rotate: 360 }}
               transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
               className="absolute inset-0 rounded-full border border-transparent border-t-primary border-r-primary opacity-50"
             />
             <motion.div 
               animate={{ rotate: -360 }}
               transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
               className="absolute inset-2 rounded-full border border-transparent border-b-primary opacity-30"
             />
             <div className="absolute inset-0 flex items-center justify-center">
               <Beaker className="w-8 h-8 text-primary animate-pulse" />
             </div>
           </div>
           
           <h2 className="text-2xl tracking-tight font-semibold mb-3">Synthesizing Tool</h2>
           
           <div className="h-6 w-full text-center overflow-hidden">
             <AnimatePresence mode="wait">
               <motion.p
                 key={buildingStage}
                 initial={{ opacity: 0, y: 15 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -15 }}
                 className="text-muted-foreground text-sm font-medium tracking-wide"
               >
                 {stages[buildingStage] || "Finalizing..."}
               </motion.p>
             </AnimatePresence>
           </div>
           
           <div className="w-full h-1 bg-muted rounded-full mt-8 overflow-hidden">
              <motion.div 
                 className="h-full bg-primary"
                 initial={{ width: "0%" }}
                 animate={{ width: `${(buildingStage / 3) * 100}%` }}
                 transition={{ duration: 0.5 }}
              />
           </div>
        </motion.div>
      </div>
    );
  }

  if (activeTool) {
    const handleBack = () => {
      setActiveTool(null);
      if (activeResource && onBack) onBack();
    };
    return (
      <div className="flex-1 h-full bg-background relative min-w-0 overflow-hidden flex flex-col pt-16">
        <ScrollArea className="flex-1 h-full px-4 md:px-8 py-8">
          {(activeTool === 'concept-map' || activeTool === 'concept_map') && <ConceptMapGenerator onBack={handleBack} initialTopic={topicPrompt} savedData={activeResource?.content} />}
          {activeTool === 'quiz' && <QuizGenerator onBack={handleBack} initialTopic={topicPrompt} savedData={activeResource?.content} />}
          {activeTool === 'flashcards' && <FlashcardsGenerator onBack={handleBack} initialTopic={topicPrompt} savedData={activeResource?.content} />}
          {activeTool === 'simulations' && <SimulationsGenerator onBack={handleBack} initialTopic={topicPrompt} />}
          {activeTool === 'planner' && <StudyPlanner onBack={handleBack} initialTopic={topicPrompt} />}
          {activeTool === 'audio-overview' && <AudioOverviewGenerator onBack={handleBack} initialTopic={topicPrompt} />}
        </ScrollArea>
      </div>
    );
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setUploadedFiles(prev => [...prev, ...Array.from(files)]);
    }
  };

  const getDynamicSuggestions = () => {
     const input = message.toLowerCase();
     if (input.includes('flashcard') || input.includes('card')) {
        return [
           { label: "Generate 10 flashcards", icon: <Layers className="w-3.5 h-3.5" />, action: () => setMessage("Generate 10 flashcards about this topic") },
           { label: "Make a flip-card quiz", icon: <Layers className="w-3.5 h-3.5" />, action: () => setMessage("Make a flip-card quiz with front/back") },
           { label: "Spaced repetition plan", icon: <CalendarClock className="w-3.5 h-3.5" />, action: () => setMessage("Create a spaced repetition study plan for these flashcards") }
        ];
     }
     if (input.includes('quiz') || input.includes('test')) {
        return [
           { label: "Multiple choice (10 Qs)", icon: <BrainCircuit className="w-3.5 h-3.5" />, action: () => setMessage("Generate a 10-question multiple choice quiz") },
           { label: "True/False test", icon: <BrainCircuit className="w-3.5 h-3.5" />, action: () => setMessage("Generate a true/false test") },
           { label: "Short answer questions", icon: <BrainCircuit className="w-3.5 h-3.5" />, action: () => setMessage("Provide short answer questions for practice") }
        ];
     }
     if (input.includes('map') || input.includes('concept')) {
        return [
           { label: "Detailed concept map", icon: <Network className="w-3.5 h-3.5" />, action: () => setMessage("Generate a detailed concept map") },
           { label: "High-level summary map", icon: <Network className="w-3.5 h-3.5" />, action: () => setMessage("Create a high-level summary map") },
           { label: "Show connections", icon: <Network className="w-3.5 h-3.5" />, action: () => setMessage("Show connections between the main themes") }
        ];
     }
     if (uploadedFiles.length > 0) {
        return [
           { label: "Summarize sources", icon: <FileIcon className="w-3.5 h-3.5" />, action: () => setMessage("Summarize the main points of these sources") },
           { label: "Make flashcards", icon: <Layers className="w-3.5 h-3.5" />, action: () => setMessage("Make flashcards from these uploaded files") },
           { label: "Generate quiz", icon: <BrainCircuit className="w-3.5 h-3.5" />, action: () => setMessage("Generate a quiz from these files") }
        ];
     }
     
     // Default suggestions
     return [
        { label: "Make flashcards", icon: <Layers className="w-3.5 h-3.5" />, action: () => setMessage("Make flashcards from my recent notes") },
        { label: "Simulation of...", icon: <FlaskConical className="w-3.5 h-3.5" />, action: () => setMessage("Create an interactive simulation of...") },
        { label: "Generate quiz", icon: <BrainCircuit className="w-3.5 h-3.5" />, action: () => setMessage("Generate a multiple choice quiz on...") }
     ];
  };

  const currentSuggestions = getDynamicSuggestions();
  const filteredTools = tools;

  return (
    <div className="flex-1 h-full bg-background relative min-w-0 overflow-hidden flex flex-col">
      {/* Top Header */}
      <div className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-border/40 bg-background/80 backdrop-blur-md z-[60] shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
           <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl hover:bg-muted/60 transition-colors" title="Back to Chat">
              <ArrowLeft className="w-5 h-5" />
           </Button>
           <div className="h-4 w-px bg-border/60 mx-1" />
           <div className="flex flex-col">
              <h2 className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-primary/60">Module_Laboratory</h2>
              <span className="text-sm font-black tracking-tight italic">CONCEPT<span className="text-primary">LAB</span></span>
           </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12 md:px-12 pb-32">
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-20 flex flex-col items-center text-center"
          >
            <div className="relative mb-10">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full scale-150 animate-pulse" />
              <div className="relative w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/20">
                <Beaker className="w-10 h-10 text-primary-foreground" />
              </div>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-serif font-black tracking-tighter mb-6 italic">Synthesis Laboratory</h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl font-medium opacity-80 leading-relaxed font-serif italic">
              Ground the neural engine with your research materials to synthesize custom mental models and interactive tools.
            </p>
            
            {/* Message Box with File Upload */}
            <div className="w-full max-w-4xl mt-16 relative">
              <div className="relative group shadow-[0_20px_50px_rgba(0,0,0,0.1)] bg-card border border-border/40 rounded-[2.5rem] overflow-hidden focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/30 transition-all duration-500 text-left flex flex-col">
                 <textarea 
                    className="w-full min-h-[160px] p-8 pb-24 bg-transparent resize-none outline-none text-foreground text-xl placeholder:text-muted-foreground/30 font-serif italic leading-relaxed"
                    placeholder="Briefly describe the learning objective or tool requirements..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                 />
                 
                 <div className="px-8 pb-4 flex flex-wrap gap-2">
                   {uploadedFiles.length > 0 && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap gap-2">
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="inline-flex items-center gap-2 bg-emerald-500/5 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest shadow-sm">
                             <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                             <span className="truncate max-w-[180px]">{file.name}</span>
                             <button onClick={() => setUploadedFiles(prev => prev.filter((_, i) => i !== idx))} className="ml-1 hover:bg-black/5 rounded-full p-1 transition-colors">
                               <X className="w-3 h-3" />
                             </button>
                          </div>
                        ))}
                      </motion.div>
                   )}
                   {attachedTools.length > 0 && (
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-wrap gap-2">
                        {attachedTools.map((tool, idx) => (
                          <div key={idx} className="inline-flex items-center gap-2 bg-primary/5 border border-primary/20 text-primary rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest shadow-sm">
                             <Beaker className="w-3.5 h-3.5" />
                             <span className="truncate max-w-[180px]">{tool.name}</span>
                             <button onClick={() => setAttachedTools(prev => prev.filter((_, i) => i !== idx))} className="ml-1 hover:bg-black/5 rounded-full p-1 transition-colors">
                               <X className="w-3 h-3" />
                             </button>
                          </div>
                        ))}
                      </motion.div>
                   )}
                 </div>

                 <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.csv,.json"
                      multiple
                      onChange={handleFileUpload}
                    />
                    <Button 
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className={`h-12 px-6 rounded-2xl gap-3 text-[11px] font-black uppercase tracking-widest border-border/40 hover:bg-muted transition-all ${uploadedFiles.length > 0 ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/20' : ''}`}
                    >
                      <Paperclip className="w-4 h-4" />
                      {uploadedFiles.length > 0 ? `${uploadedFiles.length} SOURCES` : 'INJECT SOURCES'}
                    </Button>
                    <Button 
                      onClick={handleRun}
                      disabled={!message.trim() && uploadedFiles.length === 0 && attachedTools.length === 0}
                      className="h-12 px-10 rounded-2xl gap-3 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 transition-all active:scale-95"
                    >
                      Synthesize <Send className="w-4 h-4" />
                    </Button>
                 </div>
              </div>
              
              {/* Dynamic Suggestions */}
              <div className="flex flex-wrap justify-center gap-2.5 mt-8">
                 {currentSuggestions.map((suggestion, idx) => (
                    <button 
                      key={idx} 
                      className="inline-flex items-center gap-2 rounded-full text-[11px] h-10 px-6 text-muted-foreground bg-muted/40 hover:bg-muted hover:text-foreground border border-border/40 font-black uppercase tracking-widest transition-all hover:scale-[1.05] active:scale-[0.95]" 
                      onClick={suggestion.action}
                    >
                      <span className="opacity-40">{suggestion.icon}</span> {suggestion.label}
                    </button>
                 ))}
              </div>
            </div>
            
          </motion.div>

          {/* Tools Grid */}
          <div className="relative">
             <div className="flex items-center gap-4 border-b border-border/40 pb-6 mb-12">
               <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20">
                 <Layers className="w-5 h-5" />
               </div>
               <div className="flex flex-col">
                  <h2 className="text-2xl font-serif font-black tracking-tight italic">Standalone Pipelines</h2>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground/40">Manual_Synthesis_Entry_Points</span>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {filteredTools.map((tool, idx) => (
                 <motion.div
                   key={tool.id}
                   initial={{ opacity: 0, y: 20 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ duration: 0.5, delay: idx * 0.1 }}
                 >
                   <div 
                     className={`group h-full border rounded-[2.5rem] p-8 transition-all duration-500 flex flex-col relative overflow-hidden ${!tool.available ? 'opacity-50 grayscale bg-muted/20' : 'bg-card hover:bg-background hover:border-primary/40 hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] cursor-pointer'}`}
                     onClick={() => {
                        if (!tool.available) return;
                        setAttachedTools(prev => prev.some(t => t.id === tool.id) ? prev : [...prev, { id: tool.id, name: tool.name }]);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                     }}
                   >
                     <div className="flex items-start justify-between mb-8">
                       <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 ${tool.color}`}>
                         {tool.icon}
                       </div>
                       {!tool.available && (
                         <div className="h-6 px-3 bg-muted rounded-full border border-border/40 flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-muted-foreground/40" />
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/40">Locked</span>
                         </div>
                       )}
                     </div>
                     <div className="flex-1">
                        <h3 className="text-xl font-serif font-black tracking-tight mb-3 group-hover:text-primary transition-colors italic">{tool.name}</h3>
                        <p className="text-[13px] text-muted-foreground/70 leading-relaxed font-medium font-serif italic">
                          {tool.description}
                        </p>
                     </div>
                     <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                        <ArrowLeft className="w-32 h-32 rotate-180" />
                     </div>
                   </div>
                 </motion.div>
               ))}
             </div>
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
