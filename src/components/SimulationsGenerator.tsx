import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlaskConical, ArrowLeft, ArrowRight, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { SimulationViewer } from './SimulationViewer';
import { generateSimulation } from '../lib/gemini';

const mockSimulations = [
  {
    id: "projectile",
    title: "Projectile Motion",
    description: "Launch a projectile and observe its trajectory under the influence of gravity.",
    data: "{\"type\":\"chart\",\"title\":\"Projectile Trajectory\",\"xKey\":\"time\",\"yKeys\":[\"height\", \"distance\"],\"data\":[{\"time\":0,\"height\":0,\"distance\":0},{\"time\":1,\"height\":15,\"distance\":10},{\"time\":2,\"height\":20,\"distance\":20},{\"time\":3,\"height\":15,\"distance\":30},{\"time\":4,\"height\":0,\"distance\":40}]}"
  },
  {
    id: "pendulum",
    title: "Simple Pendulum",
    description: "Observe the periodic motion of a pendulum and how length affects its period.",
    data: "{\"type\":\"chart\",\"title\":\"Pendulum Angle over Time\",\"xKey\":\"time\",\"yKeys\":[\"angle\"],\"data\":[{\"time\":0,\"angle\":30},{\"time\":1,\"angle\":0},{\"time\":2,\"angle\":-30},{\"time\":3,\"angle\":0},{\"time\":4,\"angle\":30},{\"time\":5,\"angle\":0}]}"
  }
];

export function SimulationsGenerator({ onBack, initialTopic }: { onBack: () => void, initialTopic?: string }) {
  const [activeSim, setActiveSim] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(!!initialTopic);
  const [error, setError] = useState<string | null>(null);
  const [preparingId, setPreparingId] = useState<string | null>(null);

  const fetchSim = async (overrideTopic?: string) => {
    const topicToUse = overrideTopic || initialTopic;
    if (!topicToUse) return;
    setIsLoading(true);
    setError(null);
    setActiveSim(null);
    try {
      const res = await generateSimulation(topicToUse);
      setActiveSim({
         id: "custom",
         title: res.title || topicToUse,
         description: res.description || `Simulation of ${topicToUse}`,
         data: typeof res.data === 'string' ? res.data : JSON.stringify(res.data)
      });
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('Quota')) {
        setError(err.message);
      } else {
        setError("We encountered an issue creating your simulation. Please try again or provide more details in your prompt.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialTopic) {
        fetchSim();
    }
  }, [initialTopic]);

  const handleRetry = () => {
    fetchSim();
  };

  const handleSelectSim = (sim: any) => {
     setPreparingId(sim.id);
     setTimeout(() => {
        setActiveSim(sim);
        setPreparingId(null);
     }, 1500);
  };

  if (isLoading || preparingId) {
      return (
        <div className="flex flex-col h-full items-start px-4 md:px-8 py-8 w-full max-w-5xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> <span className="font-medium text-sm">Laboratory</span>
          </Button>

          <div className="w-full flex-1 min-h-[500px] flex flex-col items-center justify-center animate-in fade-in duration-500">
             <div className="w-full relative rounded-[32px] overflow-hidden border border-border/50 shadow-sm bg-card h-[600px] flex items-center justify-center">
                 <div className="absolute inset-0 p-8 flex flex-col">
                    {/* Skeleton Header */}
                    <div className="flex items-center justify-between mb-8 opacity-60">
                        <div className="h-8 bg-muted animate-pulse rounded-lg w-1/3"></div>
                        <div className="flex gap-2">
                           <div className="h-8 w-8 bg-muted animate-pulse rounded-full"></div>
                           <div className="h-8 w-8 bg-muted animate-pulse rounded-full"></div>
                        </div>
                    </div>
                    {/* Skeleton Main View */}
                    <div className="flex-1 flex gap-6">
                        <div className="flex-1 bg-muted/50 animate-pulse rounded-2xl border border-muted flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4 text-muted-foreground/50">
                               <FlaskConical className="w-12 h-12" />
                               <div className="h-4 w-32 bg-muted-foreground/20 rounded-full"></div>
                            </div>
                        </div>
                        <div className="w-1/4 flex flex-col gap-4">
                            <div className="h-24 bg-muted/60 animate-pulse rounded-2xl w-full"></div>
                            <div className="h-24 bg-muted/60 animate-pulse rounded-2xl w-full"></div>
                            <div className="h-24 bg-muted/60 animate-pulse rounded-2xl w-full"></div>
                        </div>
                    </div>
                 </div>
                 {/* Center Spinner Overlay */}
                 <div className="absolute inset-0 bg-background/40 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                   <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                     <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                   </div>
                   <p className="font-medium text-lg tracking-tight">
                     {isLoading ? `Initializing Sandbox: "${initialTopic}"...` : 'Rendering Environment...'}
                   </p>
                 </div>
             </div>
          </div>
        </div>
      );
  }

  if (error) {
     return (
        <div className="flex flex-col h-full items-start px-4 md:px-8 py-8 w-full max-w-5xl mx-auto">
          <Button variant="ghost" onClick={onBack} className="mb-8 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> <span className="font-medium text-sm">Laboratory</span>
          </Button>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl mx-auto">
             <div className="border border-red-200 bg-red-50 dark:bg-red-950/20 shadow-sm rounded-3xl p-10 flex flex-col items-center text-center mt-8">
                 <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                 </div>
                 <h3 className="text-2xl font-semibold mb-3 tracking-tight">Simulation Stalled</h3>
                 <p className="text-muted-foreground max-w-md mb-8 text-[15px] leading-relaxed">
                   {error}
                 </p>
                 <Button onClick={handleRetry} variant="default" className="gap-2 rounded-xl px-8 h-12 shadow-md">
                    <RefreshCcw className="w-4 h-4" /> Try Again
                 </Button>
             </div>
          </motion.div>
        </div>
     );
  }

  if (activeSim) {
     return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full items-start px-4 md:px-8 py-8 w-full max-w-5xl mx-auto">
          <Button variant="ghost" onClick={activeSim.id === 'custom' ? onBack : () => setActiveSim(null)} className="mb-8 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> <span className="font-medium text-sm">{activeSim.id === 'custom' ? 'Laboratory' : 'Simulations'}</span>
          </Button>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-10 gap-6">
             <div className="flex items-center gap-4">
               <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                 <FlaskConical className="w-7 h-7" />
               </div>
               <div>
                 <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">{activeSim.title}</h1>
                 <p className="text-muted-foreground font-medium text-[15px] mt-1 line-clamp-1">{activeSim.description}</p>
               </div>
             </div>
          </div>

          <div className="w-full bg-card rounded-[32px] shadow-sm border border-border/50 p-6 md:p-10 relative overflow-hidden h-[600px] flex flex-col">
             <SimulationViewer data={activeSim.data} />
          </div>
        </motion.div>
     );
  }

  return (
    <div className="flex flex-col h-full items-start px-4 md:px-8 py-8 w-full max-w-5xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-8 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> <span className="font-medium text-sm">Laboratory</span>
      </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FlaskConical className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Sandbox Environments</h1>
            <p className="text-muted-foreground font-medium text-[15px] mt-1 flex items-center gap-2">
               Explore concepts through interactive data models.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mt-4">
         {mockSimulations.map((sim, idx) => (
            <motion.div key={sim.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}>
               <button 
                  onClick={() => handleSelectSim(sim)}
                  className="w-full text-left h-full group p-6 rounded-[24px] border-2 border-transparent bg-card shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-md hover:border-blue-500/30 hover:bg-blue-500/5 transition-all duration-300 flex flex-col focus:outline-none"
               >
                  <div className="flex items-start justify-between mb-4 w-full">
                     <h3 className="text-xl font-semibold tracking-tight text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors pr-4">{sim.title}</h3>
                     <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all text-muted-foreground -mr-2">
                        <ArrowRight className="w-4 h-4" />
                     </div>
                  </div>
                  <p className="text-[15px] text-muted-foreground/90 leading-relaxed font-medium mt-auto">
                     {sim.description}
                  </p>
               </button>
            </motion.div>
         ))}
      </div>
    </div>
  );
}
