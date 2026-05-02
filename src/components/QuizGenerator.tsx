import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BrainCircuit, ArrowLeft, Loader2, CheckCircle2, Circle, AlertCircle, RefreshCcw, Handshake, BookMarked } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { generateQuiz } from '../lib/gemini';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export function QuizGenerator({ onBack, initialTopic = 'General Knowledge', savedData }: { onBack: () => void, initialTopic?: string, savedData?: string }) {
  const [isLoading, setIsLoading] = useState(!savedData);
  const [error, setError] = useState<string | null>(null);
  const [quiz, setQuiz] = useState<any[] | null>(() => {
    if (!savedData) return null;
    try {
      return JSON.parse(savedData);
    } catch {
      return null;
    }
  });
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [isSaved, setIsSaved] = useState(!!savedData);

  const handleSave = async () => {
    if (!quiz || !auth.currentUser || isSaved) return;
    try {
      const resourceId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      await setDoc(doc(db, 'resources', resourceId), {
        userId: auth.currentUser.uid,
        type: 'quiz',
        title: initialTopic,
        content: JSON.stringify(quiz),
        createdAt: Date.now()
      });
      setIsSaved(true);
      toast.success('Quiz saved to Library');
    } catch(e) {
      console.error(e);
      toast.error('Failed to save quiz');
    }
  };

  const fetchQuiz = async (overrideTopic?: string) => {
    setIsLoading(true);
    setError(null);
    setQuiz(null);
    try {
      const data = await generateQuiz(overrideTopic || initialTopic);
      setQuiz(data);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('Quota')) {
        setError(err.message);
      } else {
        setError("We encountered an issue creating your quiz. Please try again or provide more details in your prompt.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!savedData) {
      fetchQuiz();
    }
  }, [initialTopic, savedData]);

  const handleRetry = () => {
    fetchQuiz();
  };

  const handleAnswer = (idx: number) => {
    if (selectedOpt !== null) return;
    setSelectedOpt(idx);
    
    if (idx === quiz![currentQIndex].answer) {
      setScore(s => s + 1);
    }
    
    setUserAnswers(prev => [...prev, idx]);
    
    setTimeout(() => {
      if (currentQIndex < quiz!.length - 1) {
        setCurrentQIndex(currentQIndex + 1);
        setSelectedOpt(null);
      } else {
        setShowResult(true);
      }
    }, 1800);
  }

  return (
    <div className="flex flex-col h-full items-center px-4 md:px-8 py-10 w-full max-w-6xl mx-auto overflow-y-auto">
      <div className="w-full max-w-4xl flex items-center justify-between mb-12">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/40 rounded-xl px-4">
          <ArrowLeft className="w-4 h-4" /> <span className="font-bold text-[10px] uppercase tracking-widest">Laboratory</span>
        </Button>
        
        {!isLoading && !error && quiz && (
          <Button variant="outline" className="rounded-2xl gap-2 h-11 px-6 shadow-sm border-border/60 hover:bg-muted/40 transition-all font-bold text-xs uppercase tracking-tight" onClick={handleSave} disabled={isSaved}>
            <BookMarked className="w-4 h-4 text-orange-500" />
            <span>{isSaved ? 'Archived in Library' : 'Save Results'}</span>
          </Button>
        )}
      </div>

      <div className="flex flex-col items-center text-center w-full max-w-3xl mb-16">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-[28px] bg-gradient-to-br from-orange-400 to-orange-600 text-white flex items-center justify-center shadow-2xl shadow-orange-500/30 mb-8"
        >
          <BrainCircuit className="w-10 h-10" />
        </motion.div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-3">Adaptive Evaluator</h1>
        <p className="text-muted-foreground font-medium text-lg max-w-lg mb-2">Testing depth of knowledge through semantic challenge.</p>
        <div className="px-4 py-1.5 rounded-full bg-orange-500/5 border border-orange-500/10 text-orange-600 dark:text-orange-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">
           Topic: {initialTopic}
        </div>
      </div>

      {isLoading && (
        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-[400px]">
           <div className="relative w-full max-w-2xl mx-auto">
              <div className="w-full p-10 rounded-[40px] bg-card border border-border/40 shadow-sm flex flex-col items-center">
                 <div className="w-24 h-4 bg-muted/60 animate-pulse rounded-full mb-10" />
                 <div className="w-full h-8 bg-muted/60 animate-pulse rounded-full mb-4" />
                 <div className="w-4/5 h-8 bg-muted/40 animate-pulse rounded-full mb-12" />
                 
                 <div className="w-full grid gap-4">
                    {[1, 2, 3, 4].map(i => (
                       <div key={i} className="w-full h-16 rounded-[20px] bg-muted/20 animate-pulse border border-border/20" />
                    ))}
                 </div>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                 <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 backdrop-blur-md">
                   <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
                 </div>
                 <p className="font-bold text-xl tracking-tight uppercase opacity-60">Synthesizing Challenge...</p>
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

      {quiz && !showResult && !error && (
        <motion.div 
           key={currentQIndex}
           initial={{ opacity: 0, scale: 0.98, y: 10 }} 
           animate={{ opacity: 1, scale: 1, y: 0 }} 
           exit={{ opacity: 0, scale: 0.98, y: -10 }}
           transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
           className="w-full max-w-3xl mx-auto"
        >
          <div className="mb-12">
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20 text-[10px] font-extrabold uppercase tracking-[0.2em]">
                       Question {currentQIndex + 1} / {quiz.length}
                    </div>
                 </div>
                 <div className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    Accuracy: <span className="text-foreground">{Math.round((score / Math.max(1, currentQIndex)) * 100)}%</span>
                 </div>
              </div>
              <h2 className="text-3xl md:text-5xl font-bold leading-[1.2] tracking-tighter text-center">{quiz[currentQIndex].question}</h2>
          </div>

          <div className="flex flex-col gap-4">
            {quiz[currentQIndex].options.map((opt: string, idx: number) => {
              let btnClass = "group relative justify-start text-left h-auto py-6 px-8 rounded-[24px] border-2 transition-all duration-500 font-bold text-[18px] tracking-tight leading-snug ";
              
              if (selectedOpt !== null) {
                 if (idx === quiz![currentQIndex].answer) {
                    btnClass += " border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-xl shadow-emerald-500/10";
                 } else if (idx === selectedOpt) {
                    btnClass += " border-destructive bg-destructive/10 text-destructive shadow-xl shadow-destructive/10";
                 } else {
                    btnClass += " opacity-20 border-border bg-card grayscale";
                 }
              } else {
                 btnClass += " hover:border-orange-500/50 hover:bg-orange-500/5 bg-card border-border/60 hover:shadow-2xl hover:shadow-orange-500/5 hover:-translate-y-1 active:scale-[0.98]";
              }

              return (
                <button 
                  key={idx} 
                  className={btnClass}
                  onClick={() => handleAnswer(idx)}
                  disabled={selectedOpt !== null}
                >
                  <div className="flex items-center gap-6 w-full">
                     <div className="shrink-0 relative">
                        {selectedOpt !== null && idx === quiz![currentQIndex].answer ? (
                           <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><CheckCircle2 className="w-7 h-7 text-emerald-500" /></motion.div>
                        ) : selectedOpt !== null && idx === selectedOpt ? (
                           <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}><AlertCircle className="w-7 h-7 text-destructive" /></motion.div>
                        ) : (
                           <div className="w-7 h-7 rounded-full border-2 border-border group-hover:border-orange-500/40 transition-colors" />
                        )}
                        <span className="absolute -left-12 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/30 group-hover:text-orange-500/20 transition-colors">0{idx + 1}</span>
                     </div>
                     <span className="flex-1">{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="mt-16 w-full h-1 bg-muted rounded-full overflow-hidden">
             <motion.div 
               className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
               initial={{ width: `${(currentQIndex / quiz.length) * 100}%` }}
               animate={{ width: `${((currentQIndex + 1) / quiz.length) * 100}%` }}
               transition={{ duration: 0.8, ease: "circOut" }}
             />
          </div>
        </motion.div>
      )}

      {showResult && (
         <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-5xl mx-auto pb-20">
            <div className="text-center py-24 px-10 border-2 border-orange-500/10 rounded-[48px] bg-card overflow-hidden relative mb-20 shadow-2xl shadow-orange-500/5">
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(249,115,22,0.08)_0%,transparent_70%)] pointer-events-none" />
               <motion.div 
                 initial={{ y: 20, opacity: 0 }}
                 animate={{ y: 0, opacity: 1 }}
                 transition={{ delay: 0.2 }}
                 className="w-28 h-28 bg-orange-500 text-white rounded-[32px] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-orange-500/40 relative z-10 rotate-3"
               >
                  <Handshake className="w-14 h-14" />
               </motion.div>
               <h2 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter relative z-10 uppercase italic">Assessment Complete</h2>
               <p className="text-muted-foreground text-2xl mb-12 font-bold tracking-tight relative z-10 max-w-2xl mx-auto">
                 Cognitive proficiency secured at <span className="text-orange-500 font-black">{Math.round((score / quiz!.length) * 100)}%</span> accuracy rate.
               </p>
               <Button onClick={onBack} size="lg" className="rounded-2xl px-12 h-16 text-lg font-black uppercase tracking-widest shadow-xl relative z-10 bg-foreground text-background hover:bg-foreground/90 transition-all hover:scale-105 active:scale-95">
                  Secure Sessions
               </Button>
            </div>

            <div className="grid gap-10">
              <div className="flex items-center justify-between border-b border-border pb-6">
                 <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-muted/60">
                       <BrainCircuit className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black tracking-tight uppercase italic">Granular Analysis</h3>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] mt-1">Deep structure verification</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-6">
                    <div className="text-right">
                       <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Score</div>
                       <div className="text-3xl font-black">{score}/{quiz!.length}</div>
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {quiz!.map((q, idx) => {
                  const userChoice = userAnswers[idx];
                  const isCorrect = userChoice === q.answer;
                  return (
                    <motion.div 
                      key={idx} 
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "group shadow-sm border rounded-[36px] overflow-hidden bg-card transition-all duration-500 hover:shadow-2xl", 
                        isCorrect ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-destructive/20 hover:border-destructive/40'
                      )}
                    >
                      <div className="p-8 md:p-10">
                         <div className="flex items-center justify-between mb-8">
                           {isCorrect ? (
                             <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Validated
                             </span>
                           ) : (
                             <span className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                               <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" /> Error Detected
                             </span>
                           )}
                           <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.4em]">Q.0{idx + 1}</span>
                         </div>
                         
                         <h4 className="text-2xl md:text-3xl font-bold mt-2 leading-[1.3] mb-10 tracking-tight">{q.question}</h4>
                         
                         <div className="space-y-3 mb-10">
                           {q.options.map((opt: string, optIdx: number) => {
                             let boxClass = "px-6 py-5 rounded-[22px] border text-[16px] font-bold tracking-tight flex items-center gap-4 transition-all duration-300 ";
                             if (optIdx === q.answer) {
                               boxClass += "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 shadow-lg shadow-emerald-500/5";
                             } else if (optIdx === userChoice) {
                               boxClass += "bg-destructive/5 border-destructive/20 text-destructive shadow-lg shadow-destructive/5";
                             } else {
                               boxClass += "bg-muted/10 border-transparent text-muted-foreground/60 scale-[0.98]";
                             }
                             
                             return (
                               <div key={optIdx} className={boxClass}>
                                 <div className="shrink-0">
                                   {optIdx === q.answer && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
                                   {optIdx === userChoice && optIdx !== q.answer && <AlertCircle className="w-6 h-6 text-destructive" />}
                                   {optIdx !== q.answer && optIdx !== userChoice && <div className="w-6 h-6 rounded-full border-2 border-muted-foreground/20" />}
                                 </div>
                                 <span className="flex-1">{opt}</span>
                               </div>
                             );
                           })}
                         </div>
                         
                         <div className="mt-2 p-8 rounded-[28px] bg-muted/30 border border-border/40 relative overflow-hidden group-hover:bg-muted/40 transition-colors">
                           <div className="flex items-center gap-3 mb-4 text-primary font-black uppercase tracking-[0.3em] text-[10px] opacity-60">
                             Intellectual Grounding
                           </div>
                           <p className="text-foreground/80 leading-relaxed text-[16px] font-medium italic">
                             "{q.explanation}"
                           </p>
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
         </motion.div>
      )}
    </div>
  );
}
