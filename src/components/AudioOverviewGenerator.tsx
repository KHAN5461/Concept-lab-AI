import { useState, useRef, useEffect } from 'react';
import { Play, Square, Loader2, Volume2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generatePodcastDialogue } from '../lib/gemini';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export function AudioOverviewGenerator({ onBack, initialTopic, savedData }: { onBack: () => void, initialTopic?: string, savedData?: string }) {
  const [isLoading, setIsLoading] = useState(!savedData);
  const [dialogue, setDialogue] = useState<{speaker: string, text: string}[] | null>(() => {
    if (!savedData) return null;
    try {
      return JSON.parse(savedData);
    } catch {
      return null;
    }
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
    }
    return () => {
      synthRef.current?.cancel();
    };
  }, []);

  const generate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePodcastDialogue(initialTopic || 'General subject');
      setDialogue(result);
    } catch (err: any) {
      setError(err.message || 'Failed to generate overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!savedData && !dialogue && !isLoading && !error) {
      generate();
    }
  }, [savedData, dialogue, isLoading, error]);

  const playAudio = async () => {
    if (!dialogue || !synthRef.current) return;
    
    setIsPlaying(true);
    isPlayingRef.current = true;
    setCurrentLineIndex(0);

    const playLine = (index: number) => {
      if (!isPlayingRef.current) return; // user stopped
      if (index >= dialogue.length) {
        setIsPlaying(false);
        isPlayingRef.current = false;
        setCurrentLineIndex(-1);
        return;
      }
      setCurrentLineIndex(index);
      
      const line = dialogue[index];
      const utterance = new SpeechSynthesisUtterance(line.text);
      
      const voices = synthRef.current?.getVoices() || [];
      if (line.speaker.includes('2') || line.speaker.toLowerCase().includes('guest')) {
         utterance.voice = voices.find(v => v.name.includes('Female')) || voices[0];
         utterance.pitch = 1.1;
      } else {
         utterance.voice = voices.find(v => v.name.includes('Male')) || voices[Math.floor(voices.length / 2)] || voices[0];
         utterance.pitch = 0.9;
      }

      utterance.rate = 1.05;

      utterance.onend = () => {
         playLine(index + 1);
      };

      synthRef.current?.speak(utterance);
    };

    synthRef.current.cancel();
    playLine(0);
  };

  const stopAudio = () => {
    setIsPlaying(false);
    isPlayingRef.current = false;
    synthRef.current?.cancel();
    setCurrentLineIndex(-1);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      <div className="w-full mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-sans tracking-tight">Audio Overview (Podcast)</h2>
          <p className="text-muted-foreground mt-1">Deep dive into {initialTopic || 'this topic'}</p>
        </div>
        <Button variant="ghost" onClick={() => { stopAudio(); onBack(); }}>Back to Lab</Button>
      </div>

      {isLoading && (
        <div className="py-20 flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground font-medium animate-pulse">Writing podcast script...</p>
        </div>
      )}

      {error && (
        <div className="w-full p-6 bg-red-500/10 text-red-600 rounded-2xl flex flex-col items-center">
          <p className="font-semibold text-center">{error}</p>
          <Button variant="outline" className="mt-4" onClick={generate}>Try Again</Button>
        </div>
      )}

      {dialogue && !isLoading && (
        <div className="w-full">
          <div className="w-full bg-card border rounded-3xl p-6 shadow-sm mb-6 flex items-center justify-between transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Deep Dive Podcast</h3>
                <p className="text-xs text-muted-foreground">{dialogue.length} segments</p>
              </div>
            </div>
            {!isPlaying ? (
              <Button onClick={playAudio} className="rounded-full gap-2 px-6">
                <Play className="w-4 h-4 fill-current" /> Play Episode
              </Button>
            ) : (
              <Button onClick={stopAudio} variant="destructive" className="rounded-full gap-2 px-6 shadow-lg">
                <Square className="w-4 h-4 fill-current" /> Stop Audio
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {dialogue.map((line, idx) => (
              <div key={idx} className={`p-5 rounded-2xl border transition-all duration-300 ${currentLineIndex === idx ? 'border-primary shadow-md bg-primary/5 scale-[1.02]' : 'bg-card'}`}>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${line.speaker.includes('1') ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                  {line.speaker}
                  {currentLineIndex === idx && <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse ml-2" />}
                </div>
                <p className={`leading-relaxed ${currentLineIndex === idx ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{line.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
