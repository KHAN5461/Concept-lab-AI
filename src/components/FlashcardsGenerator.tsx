import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Layers, ArrowLeft, Loader2, ChevronLeft, ChevronRight, RotateCcw, Shuffle, AlertCircle, RefreshCcw, Check, X, Brain, BookMarked } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateFlashcards } from '../lib/gemini';
import { db, auth } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc } from 'firebase/firestore';
import { toast } from 'sonner';

interface FlashcardData {
  id?: string;
  front: string;
  back: string;
  nextReview: number;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export function FlashcardsGenerator({ onBack, initialTopic = 'Web Development Basics', savedData }: { onBack: () => void, initialTopic?: string, savedData?: string }) {
  const [isLoading, setIsLoading] = useState(!savedData);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<FlashcardData[] | null>(() => {
    if (!savedData) return null;
    try {
      return JSON.parse(savedData);
    } catch {
      return null;
    }
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<'generate' | 'review'>('generate');
  const [isSaved, setIsSaved] = useState(!!savedData);

  const handleSave = async () => {
    if (!cards || !auth.currentUser || isSaved) return;
    try {
      const resourceId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      await setDoc(doc(db, 'resources', resourceId), {
        userId: auth.currentUser.uid,
        type: 'flashcards',
        title: initialTopic,
        content: JSON.stringify(cards),
        createdAt: Date.now()
      });
      setIsSaved(true);
      toast.success('Flashcards saved to Library');
    } catch(e) {
      console.error(e);
      toast.error('Failed to save flashcards');
    }
  };

  const fetchCards = async (overrideTopic?: string) => {
    setIsLoading(true);
    setError(null);
    setCards(null);
    setIsFlipped(false);
    try {
      const data = await generateFlashcards(overrideTopic || initialTopic);
      const newCards: FlashcardData[] = data.map((c: any) => ({
        front: c.front,
        back: c.back,
        nextReview: Date.now(),
        interval: 1,
        easeFactor: 2.5,
        repetitions: 0
      }));
      setCards(newCards);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('Quota')) {
        setError(err.message);
      } else {
        setError("We encountered an issue creating your flashcards. Please try again or provide more details in your prompt.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadDueCards = async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    setError(null);
    setIsFlipped(false);
    try {
       const q = query(collection(db, 'flashcards'), where('userId', '==', auth.currentUser.uid));
       const snap = await getDocs(q);
       const loaded: FlashcardData[] = [];
       const now = Date.now();
       snap.forEach(d => {
         const data = d.data() as FlashcardData;
         if (data.nextReview <= now) {
            loaded.push({ ...data, id: d.id });
         }
       });
       if (loaded.length === 0) {
         setError("No flashcards are due for review right now! Try generating some new ones.");
       } else {
         setCards(loaded.sort((a,b) => a.nextReview - b.nextReview));
         setCurrentIndex(0);
       }
    } catch (e) {
       console.error("Failed to load flashcards", e);
       setError("Failed to load due flashcards.");
    } finally {
       setIsLoading(false);
    }
  };

  useEffect(() => {
    if (savedData) return;
    if (mode === 'generate') {
      fetchCards();
    } else {
      loadDueCards();
    }
  }, [initialTopic, mode, savedData]);

  const handleRetry = () => {
    if (mode === 'generate') fetchCards();
    else loadDueCards();
  };

  const gradeCard = async (grade: number) => {
    if (!cards || !auth.currentUser) return;
    const card = cards[currentIndex];
    
    // Simple SM-2 implementation
    let { interval, easeFactor, repetitions } = card;
    
    if (grade >= 3) {
      if (repetitions === 0) interval = 1;
      else if (repetitions === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      
      repetitions += 1;
    } else {
      repetitions = 0;
      interval = 1;
    }
    
    easeFactor = easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;
    
    const nextReview = Date.now() + interval * 24 * 60 * 60 * 1000;
    
    const updatedCard = { ...card, interval, easeFactor, repetitions, nextReview, userId: auth.currentUser.uid };
    
    try {
      const dbPayload = { ...updatedCard };
      if ('id' in dbPayload) {
        delete dbPayload.id;
      }

      if (card.id) {
         await setDoc(doc(db, 'flashcards', card.id), dbPayload);
      } else {
         const flashcardId = Date.now().toString(36) + Math.random().toString(36).substring(2);
         await setDoc(doc(db, 'flashcards', flashcardId), dbPayload);
      }
    } catch(e) {
      console.error(e);
    }
    
    nextCard();
  };

  const nextCard = () => {
     setIsFlipped(false);
     setTimeout(() => {
        if (currentIndex < cards!.length - 1) {
           setCurrentIndex(currentIndex + 1);
        } else {
           // Finished
           setCards([]);
           setError("You've finished this set!");
        }
     }, 150);
  }

  const prevCard = () => {
     setIsFlipped(false);
     setTimeout(() => {
        if (currentIndex > 0) {
           setCurrentIndex(currentIndex - 1);
        }
     }, 150);
  }

  const shuffleCards = () => {
     if (!cards) return;
     setIsFlipped(false);
     setTimeout(() => {
         const shuffled = [...cards].sort(() => Math.random() - 0.5);
         setCards(shuffled);
         setCurrentIndex(0);
     }, 150);
  }

  return (
    <div className="flex flex-col h-full items-center px-4 md:px-8 py-10 w-full max-w-6xl mx-auto overflow-y-auto">
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-xl px-4">
          <ArrowLeft className="w-4 h-4" /> <span className="font-bold text-[10px] uppercase tracking-widest">Laboratory</span>
        </Button>
        
        <div className="flex items-center gap-3">
          {!isLoading && !error && cards && mode === 'generate' && (
            <Button variant="outline" size="sm" className="rounded-2xl gap-2 h-10 px-5 shadow-sm border-border/60 font-bold text-xs uppercase tracking-tight" onClick={handleSave} disabled={isSaved}>
              <BookMarked className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">{isSaved ? 'Archived' : 'Save Cards'}</span>
            </Button>
          )}
          <div className="flex items-center gap-1.5 bg-muted/30 p-1.5 rounded-[20px] border border-border/50 backdrop-blur-md">
             <Button variant={mode === 'generate' ? "secondary" : "ghost"} size="sm" className={`rounded-2xl h-8 px-4 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'generate' ? 'shadow-md bg-background' : 'text-muted-foreground hover:bg-background/40'}`} onClick={() => setMode('generate')}>
                Synthesis
             </Button>
             <Button variant={mode === 'review' ? "secondary" : "ghost"} size="sm" className={`rounded-2xl h-8 px-4 text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'review' ? 'shadow-md bg-background' : 'text-muted-foreground hover:bg-background/40'}`} onClick={() => setMode('review')}>
                Review
             </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center text-center w-full max-w-3xl mb-16">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-[28px] bg-primary text-primary-foreground flex items-center justify-center shadow-2xl shadow-primary/30 mb-8"
        >
          <Layers className="w-10 h-10" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Mnemonic Nexus</h1>
        <p className="text-muted-foreground font-medium text-lg max-w-lg mb-2">Architecting long-term retention through active recall.</p>
        {mode === 'generate' ? (
          <div className="px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-primary font-bold text-[11px] uppercase tracking-[0.2em] mt-2">
             Focus: {initialTopic}
          </div>
        ) : (
           <div className="px-4 py-1.5 rounded-full bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">
             Scheduled Maintenance
          </div>
        )}
      </div>

      {isLoading && (
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[400px]">
           <div className="relative w-full max-w-2xl mx-auto h-[450px]">
              <div className="absolute inset-0 bg-card rounded-[48px] border border-border/40 shadow-sm flex items-center justify-center p-12 w-full h-full">
                 <div className="flex flex-col items-center gap-8 w-full opacity-40">
                    <div className="w-20 h-20 bg-muted animate-pulse rounded-[32px]" />
                    <div className="w-3/4 h-10 bg-muted animate-pulse rounded-2xl" />
                    <div className="space-y-3 w-full flex flex-col items-center">
                      <div className="w-1/2 h-4 bg-muted animate-pulse rounded-full" />
                      <div className="w-1/3 h-4 bg-muted animate-pulse rounded-full" />
                    </div>
                 </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                 <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-md">
                   <Loader2 className="w-10 h-10 animate-spin text-primary" />
                 </div>
                 <p className="font-bold text-xl tracking-tight uppercase opacity-60">Mapping Knowledge Nodes...</p>
              </div>
           </div>
        </div>
      )}

      {error && !isLoading && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto">
           <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 shadow-sm rounded-3xl p-10 flex flex-col items-center text-center mt-8">
               <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
               </div>
               <h3 className="text-2xl font-semibold mb-3 tracking-tight">Generation Stalled</h3>
               <p className="text-muted-foreground max-w-md mb-8 text-[15px] leading-relaxed">
                 {error}
               </p>
               <Button onClick={handleRetry} variant="default" className="gap-2 rounded-xl px-8 h-12 shadow-md">
                  <RefreshCcw className="w-4 h-4" /> Try Again
               </Button>
           </div>
        </motion.div>
      )}

      {cards && cards.length > 0 && !error && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl mx-auto flex flex-col items-center">
          
          {/* Card Container */}
          <div className="relative w-full aspect-[16/10] mb-12 cursor-pointer group" style={{ perspective: '2000px' }} onClick={() => setIsFlipped(!isFlipped)}>
             <motion.div 
               className="w-full h-full relative transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]"
               style={{ transformStyle: 'preserve-3d' }}
               animate={{ rotateY: isFlipped ? 180 : 0 }}
             >
                {/* Front Side */}
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center p-12 md:p-20 text-center bg-card shadow-[0_30px_60px_-12px_rgba(0,0,0,0.12)] rounded-[48px] group-hover:shadow-[0_45px_80px_-15px_rgba(0,0,0,0.15)] transition-all border border-border/60"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                   <div className="absolute top-10 left-10 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/40 animate-pulse" />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground opacity-40">Surface Layer</span>
                   </div>
                   
                   <h3 className="text-3xl md:text-5xl font-black leading-[1.2] tracking-tighter text-foreground/90 max-w-2xl">{cards[currentIndex].front}</h3>
                   
                   <div className="absolute bottom-10 inset-x-0 flex justify-center">
                      <div className="text-[10px] uppercase tracking-[0.2em] font-black text-primary/40 flex items-center gap-3 bg-primary/5 px-6 py-2.5 rounded-full border border-primary/10 transition-all group-hover:bg-primary/10 group-hover:text-primary/60">
                        <RotateCcw className="w-3.5 h-3.5" /> Reveal Core
                      </div>
                   </div>
                </div>

                {/* Back Side */}
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center p-12 md:p-20 text-center bg-muted/20 border border-border/80 shadow-2xl rounded-[48px] backdrop-blur-xl"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                   <div className="absolute top-10 left-10 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40" />
                      <span className="text-[10px] uppercase tracking-[0.3em] font-black text-muted-foreground opacity-40">Core Insight</span>
                   </div>
                   
                   <div className="w-full max-w-2xl bg-background/50 p-8 rounded-[32px] border border-border/40 shadow-inner">
                      <p className="text-xl md:text-3xl leading-relaxed text-foreground font-bold tracking-tight italic">"{cards[currentIndex].back}"</p>
                   </div>
                </div>
             </motion.div>
          </div>

          <AnimatePresence mode="popLayout">
            {!isFlipped ? (
              <motion.div 
                key="controls"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-between w-full max-w-md mb-6 bg-muted/20 p-4 rounded-[40px] border border-border/40"
              >
                 <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); prevCard(); }} disabled={currentIndex === 0} className="rounded-2xl w-16 h-16 hover:bg-background shadow-none transition-all active:scale-95 disabled:opacity-20">
                   <ChevronLeft className="w-8 h-8" />
                 </Button>
                 
                 <div className="flex flex-col items-center gap-2">
                    <div className="text-[11px] font-black tracking-[0.3em] uppercase text-muted-foreground/60">
                       Stack Status
                    </div>
                    <div className="flex gap-1.5 px-3 py-1.5 bg-background/60 rounded-full border border-border/40">
                       <span className="text-xs font-black">{currentIndex + 1}</span>
                       <span className="text-[10px] font-bold opacity-30">/</span>
                       <span className="text-xs font-black opacity-40">{cards.length}</span>
                    </div>
                 </div>
                 
                 <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); nextCard(); }} disabled={currentIndex === cards.length - 1} className="rounded-2xl w-16 h-16 hover:bg-background shadow-none transition-all active:scale-95 disabled:opacity-20">
                   <ChevronRight className="w-8 h-8" />
                 </Button>
              </motion.div>
            ) : (
              <motion.div 
                key="grades"
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                className="flex items-center justify-center gap-4 w-full max-w-lg"
              >
                <button 
                  className="flex flex-col items-center gap-3 p-6 w-1/3 rounded-[32px] border-2 border-destructive/10 bg-destructive/5 hover:bg-destructive shadow-sm hover:shadow-destructive/20 hover:text-destructive-foreground transition-all duration-300 group"
                  onClick={(e) => { e.stopPropagation(); gradeCard(2); }}
                >
                  <X className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase tracking-widest font-black">Hard</span>
                </button>
                <button 
                  className="flex flex-col items-center gap-3 p-6 w-1/3 rounded-[32px] border-2 border-amber-500/10 bg-amber-500/5 hover:bg-amber-500 shadow-sm hover:shadow-amber-500/20 hover:text-white transition-all duration-300 group"
                  onClick={(e) => { e.stopPropagation(); gradeCard(3); }}
                >
                  <Check className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase tracking-widest font-black">Good</span>
                </button>
                <button 
                  className="flex flex-col items-center gap-3 p-6 w-1/3 rounded-[32px] border-2 border-emerald-500/10 bg-emerald-500/5 hover:bg-emerald-500 shadow-sm hover:shadow-emerald-500/20 hover:text-white transition-all duration-300 group"
                  onClick={(e) => { e.stopPropagation(); gradeCard(5); }}
                >
                  <Brain className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] uppercase tracking-widest font-black">Easy</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 w-full max-w-md h-1.5 bg-muted/40 rounded-full overflow-hidden border border-border/10">
             <motion.div 
               className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]"
               initial={{ width: `${(currentIndex / cards.length) * 100}%` }}
               animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
               transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
             />
          </div>

        </motion.div>
      )}
    </div>
  );
}
