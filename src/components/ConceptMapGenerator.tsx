import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Network, ArrowLeft, Loader2, AlertCircle, RefreshCcw, BookMarked } from 'lucide-react';
import { motion } from 'motion/react';
import { ConceptMapViewer } from './ConceptMapViewer';
import { generateConceptMap } from '../lib/gemini';
import { db, auth } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';

export function ConceptMapGenerator({ onBack, initialTopic = 'Artificial Intelligence', savedData }: { onBack: () => void, initialTopic?: string, savedData?: string }) {
  const [isLoading, setIsLoading] = useState(!savedData);
  const [error, setError] = useState<string | null>(null);
  const [mapData, setMapData] = useState<string | null>(savedData || null);
  const [isSaved, setIsSaved] = useState(!!savedData);

  const handleSave = async () => {
    if (!mapData || !auth.currentUser || isSaved) return;
    try {
      const resourceId = Date.now().toString(36) + Math.random().toString(36).substring(2);
      await setDoc(doc(db, 'resources', resourceId), {
        userId: auth.currentUser.uid,
        type: 'concept_map',
        title: initialTopic,
        content: mapData,
        createdAt: Date.now()
      });
      setIsSaved(true);
      toast.success('Concept Map saved to Library');
    } catch(e) {
      console.error(e);
      toast.error('Failed to save Concept Map');
    }
  };

  const generate = async (topic?: string) => {
    setIsLoading(true);
    setError(null);
    setMapData(null);
    try {
      const result = await generateConceptMap(topic || initialTopic || 'Artificial Intelligence');
      setMapData(result);
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.message.includes('Quota')) {
        setError(err.message);
      } else {
        setError("We encountered an issue creating your concept map. Please try again or provide more details in your prompt.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!savedData) generate();
  }, [initialTopic, savedData]);

  const handleRetry = () => {
    generate();
  };

  return (
    <div className="flex flex-col h-full items-start px-4 md:px-8 py-8 w-full max-w-5xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="mb-8 -ml-4 gap-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> <span className="font-medium text-sm">Laboratory</span>
      </Button>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between w-full mb-10 gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Network className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">Concept Map</h1>
            <p className="text-muted-foreground font-medium text-[15px] mt-1 flex items-center gap-2">
               <span className="text-purple-500 italic">Topic: {initialTopic || 'Concepts'}</span>
            </p>
          </div>
        </div>
        {!isLoading && !error && mapData && (
          <Button variant="outline" className="rounded-xl gap-2 h-10 shadow-sm border-border/80" onClick={handleSave} disabled={isSaved}>
            <BookMarked className="w-4 h-4" />
            <span>{isSaved ? 'Saved to Library' : 'Save Map'}</span>
          </Button>
        )}
      </div>

      {isLoading && (
        <div className="w-full flex-1 flex flex-col items-center justify-center animate-in fade-in duration-500">
             <div className="w-full relative rounded-[32px] overflow-hidden border border-border/50 shadow-sm bg-card h-[600px] flex items-center justify-center">
                 <div className="absolute inset-0 p-8 flex flex-col items-center justify-center">
                    {/* Simulated Graph Skeleton Nodes */}
                    <div className="relative w-full h-full max-w-lg max-h-[400px]">
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-12 bg-muted-foreground/20 animate-pulse rounded-full z-10" />
                       <div className="absolute top-1/4 left-1/4 w-24 h-10 bg-muted/60 animate-pulse rounded-full z-10" />
                       <div className="absolute bottom-1/4 right-1/4 w-24 h-10 bg-muted/60 animate-pulse rounded-full z-10" />
                       <div className="absolute top-1/4 right-1/3 w-28 h-10 bg-muted/60 animate-pulse rounded-full z-10" />
                       <div className="absolute bottom-1/3 left-1/4 w-20 h-10 bg-muted/60 animate-pulse rounded-full z-10" />
                       
                       {/* SVG lines for skeleton */}
                       <svg className="absolute inset-0 w-full h-full text-muted-foreground/10" pointerEvents="none">
                          <line x1="50%" y1="50%" x2="25%" y2="25%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                          <line x1="50%" y1="50%" x2="75%" y2="75%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                          <line x1="50%" y1="50%" x2="66%" y2="25%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                          <line x1="50%" y1="50%" x2="25%" y2="66%" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
                       </svg>
                    </div>
                 </div>
                 {/* Center Spinner Overlay */}
                 <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                   <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mb-4">
                     <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                   </div>
                   <p className="font-medium text-lg tracking-tight">Mapping conceptual relationships...</p>
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

      {mapData && !error && (
        <div className="w-full relative rounded-[32px] overflow-hidden border border-border/50 shadow-sm bg-card h-[600px]">
          <ConceptMapViewer data={mapData} />
        </div>
      )}
    </div>
  );
}
