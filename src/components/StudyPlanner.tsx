import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CalendarClock, ArrowLeft, Loader2, Calendar as CalendarIcon, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateStudyPlan } from '../lib/gemini';

export function StudyPlanner({ onBack, initialTopic = 'Mastering Web Development' }: { onBack: () => void, initialTopic?: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<any[] | null>(null);

  const fetchPlan = async (overrideTopic?: string) => {
    setIsLoading(true);
    setError(null);
    setPlan(null);
    try {
      const data = await generateStudyPlan(overrideTopic || initialTopic);
      setPlan(data);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('Quota')) {
        setError(err.message);
      } else {
        setError("We encountered an issue creating your study plan. Please try again or provide more details in your prompt.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, [initialTopic]);

  const handleRetry = () => {
    fetchPlan();
  };

  const toggleDay = (idx: number) => {
     if (!plan) return;
     const newPlan = [...plan];
     newPlan[idx].completed = !newPlan[idx].completed;
     setPlan(newPlan);
  }

  const completedCount = plan ? plan.filter(p => p.completed).length : 0;
  const totalCount = plan ? plan.length : 0;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="flex flex-col h-full items-start px-4 md:px-8 py-8 w-full max-w-5xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-8 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> <span className="font-medium text-sm">Laboratory</span>
      </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/20">
            <CalendarClock className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Study Planner</h1>
            <p className="text-muted-foreground font-medium text-[15px] mt-1 flex items-center gap-2">
               <span className="text-green-500 italic">Topic: {initialTopic}</span>
            </p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="w-full flex-1 flex flex-col items-center justify-center animate-in fade-in duration-500">
           <div className="w-full max-w-3xl mx-auto space-y-6 relative">
              <div className="p-8 rounded-[32px] bg-card border border-border/50 shadow-sm flex flex-col items-center gap-4">
                 <div className="w-16 h-16 bg-muted/60 animate-pulse rounded-full" />
                 <div className="w-1/3 h-6 bg-muted/60 animate-pulse rounded-full" />
                 <div className="w-full h-2 bg-muted/60 animate-pulse rounded-full mt-4" />
              </div>
              <div className="space-y-4 pt-4">
                 <div className="w-1/4 h-6 bg-muted/60 animate-pulse rounded-lg mb-4" />
                 {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl border border-border/50">
                       <div className="w-10 h-10 bg-muted/60 animate-pulse rounded-xl shrink-0" />
                       <div className="flex-1 space-y-3">
                          <div className="w-1/2 h-5 bg-muted/60 animate-pulse rounded-md" />
                          <div className="w-3/4 h-4 bg-muted/60 animate-pulse rounded-md" />
                       </div>
                    </div>
                 ))}
              </div>
              <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-20 rounded-[32px]">
                 <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                   <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                 </div>
                 <p className="font-medium text-lg tracking-tight">Architecting your study schedule...</p>
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

      {plan && !error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-3xl mx-auto">
           <div className="mb-10 p-6 md:p-8 rounded-[32px] bg-card border border-border/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-green-500/5 to-transparent pointer-events-none" />
              <div className="relative z-10">
                 <h2 className="text-2xl md:text-3xl font-semibold tracking-tight mb-2">Track Your Progress</h2>
                 <p className="text-muted-foreground font-medium mb-6">Stay focused and complete your milestones.</p>
                 
                 <div className="flex items-center justify-between mb-3 text-sm font-bold uppercase tracking-wider">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="text-green-600 dark:text-green-500">{completedCount} / {totalCount} completed</span>
                 </div>
                 
                 <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    />
                 </div>
              </div>
           </div>

           <div className="space-y-4">
              <h3 className="text-xl font-semibold px-2 mb-2 flex items-center gap-2">
                 <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                 Your Personalized Schedule
              </h3>
              
              {plan.map((day, idx) => (
                 <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: idx * 0.1 }}
                 >
                    <motion.div whileTap={{ scale: 0.98 }}>
                       <button
                          className={`w-full text-left p-5 md:p-6 rounded-[24px] border-2 transition-all duration-300 flex items-start gap-5 ${day.completed ? 'bg-green-50/50 dark:bg-green-950/20 border-green-500/30 shadow-sm' : 'bg-card border-transparent hover:border-green-500/30 hover:bg-green-500/5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md'}`}
                          onClick={() => toggleDay(idx)}
                       >
                          <motion.div 
                            initial={false}
                            animate={{ 
                               backgroundColor: day.completed ? '#22c55e' : 'transparent',
                               scale: day.completed ? [1, 1.2, 1] : 1
                            }}
                            transition={{ duration: 0.3 }}
                            className={`w-8 h-8 rounded-full flex items-center justify-center border-2 shrink-0 mt-0.5 ${day.completed ? 'border-green-500 text-white' : 'border-muted-foreground/30 text-transparent bg-background'}`}
                          >
                             <AnimatePresence>
                               {day.completed && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                  >
                                     <CheckCircle2 className="w-5 h-5" />
                                  </motion.div>
                               )}
                             </AnimatePresence>
                          </motion.div>
                          
                          <div className="flex-1">
                             <div className={`text-lg font-semibold tracking-tight transition-colors duration-300 mb-1 ${day.completed ? 'text-green-800 dark:text-green-300' : 'text-foreground'}`}>
                               {day.day}
                             </div>
                             <div className={`text-[15px] font-medium leading-relaxed transition-colors duration-300 ${day.completed ? 'text-green-700/80 dark:text-green-400/80' : 'text-muted-foreground/80'}`}>
                               {day.desc}
                             </div>
                          </div>
                          
                          <div className={`shrink-0 w-3 h-3 rounded-full mt-2 transition-colors duration-300 ${day.completed ? 'bg-green-500' : 'bg-muted'}`} />
                       </button>
                    </motion.div>
                 </motion.div>
              ))}
           </div>
        </motion.div>
      )}
    </div>
  );
}
