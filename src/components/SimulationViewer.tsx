import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, Play, Pause, RotateCcw, Maximize2, Minimize2, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '../lib/utils';

interface SimulationData {
  title?: string;
  type: string;
  data?: any[];
  xKey?: string;
  yKeys?: string[];
}

export function SimulationViewer({ data }: { data: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  let simData: SimulationData;
  try {
    simData = JSON.parse(data);
  } catch (e) {
    return (
      <div className="p-8 bg-destructive/5 border border-destructive/20 rounded-3xl text-destructive flex flex-col items-center gap-3">
        <Activity className="w-10 h-10 opacity-40" />
        <span className="font-semibold text-lg">Simulation Parsing Error</span>
        <p className="text-sm opacity-80 text-center max-w-xs leading-relaxed">The logic engine encountered a syntax error in the simulated dataset.</p>
      </div>
    );
  }

  const [isPlaying, setIsPlaying] = useState(false);
  const [activeIndex, setActiveIndex] = useState(simData.data ? simData.data.length - 1 : 0);

  useEffect(() => {
     let interval: NodeJS.Timeout;
     if (isPlaying && simData.data) {
        if (activeIndex >= simData.data.length - 1) {
           setActiveIndex(0); // auto-restart
        }
        interval = setInterval(() => {
           setActiveIndex(prev => {
              if (prev >= simData.data!.length - 1) {
                 setIsPlaying(false);
                 return prev;
              }
              return prev + 1;
           });
        }, 600);
     }
     return () => clearInterval(interval);
  }, [isPlaying, activeIndex, simData.data]);

  const handleReset = () => {
    setIsPlaying(false);
    setActiveIndex(0);
  };

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

  if (simData.type === 'chart' && simData.data && simData.xKey && simData.yKeys) {
    const colors = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
    const visibleData = simData.data.slice(0, activeIndex + 1);
    const maxIndex = simData.data.length - 1;

    return (
      <div 
        ref={containerRef}
        style={{ touchAction: 'pan-y' }}
        className={cn(
          "w-full my-8 bg-card border border-border/80 rounded-[32px] overflow-hidden shadow-2xl shadow-primary/5 transition-all duration-500",
          isFullscreen ? "fixed inset-0 z-50 rounded-none bg-background" : "relative"
        )}
      >
        <div className="px-6 py-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold tracking-tight text-foreground text-sm uppercase opacity-80">Empirical Simulation</h3>
              <p className="text-xs text-muted-foreground font-medium">{simData.title || "Interactive Data Set"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-muted-foreground hover:text-foreground" onClick={toggleFullscreen}>
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
          </div>
        </div>
        
        <div className={cn("p-6 flex flex-col gap-8", isFullscreen && "h-full justify-center max-w-6xl mx-auto")}>
           {/* Interactive Controls */}
           <div className="flex flex-col md:flex-row items-center gap-6 bg-muted/15 p-5 rounded-[24px] border border-border/40 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Button 
                  size="icon" 
                  variant={isPlaying ? "default" : "secondary"} 
                  className="h-12 w-12 rounded-[18px] shrink-0 shadow-lg" 
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-12 w-12 rounded-[18px] shrink-0 hover:bg-background/80" 
                  onClick={handleReset}
                >
                  <RotateCcw className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex-1 w-full px-4 flex items-center gap-6">
                 <span className="text-[11px] text-muted-foreground font-bold font-mono tracking-widest w-8 bg-muted/40 px-2 py-1 rounded-md text-center">
                    {String(activeIndex).padStart(2, '0')}
                 </span>
                 <Slider 
                    value={[activeIndex]} 
                    max={maxIndex} 
                    step={1} 
                    onValueChange={(val) => {
                       setActiveIndex(val[0]);
                       setIsPlaying(false);
                    }}
                    className="flex-1 cursor-pointer"
                 />
                 <span className="text-[11px] text-muted-foreground font-bold font-mono tracking-widest w-8 bg-muted/40 px-2 py-1 rounded-md text-center">
                    {String(maxIndex).padStart(2, '0')}
                 </span>
              </div>
           </div>

           <div className={cn("relative transition-all duration-500", isFullscreen ? "h-[60vh]" : "h-[400px]")}>
             <ResponsiveContainer width="100%" height="100%">
               <LineChart data={visibleData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                 <defs>
                   {colors.map((color, i) => (
                     <linearGradient key={`gradient-${i}`} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                       <stop offset="5%" stopColor={color} stopOpacity={0.1}/>
                       <stop offset="95%" stopColor={color} stopOpacity={0}/>
                     </linearGradient>
                   ))}
                 </defs>
                 <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                 <XAxis 
                   dataKey={simData.xKey} 
                   tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                   tickLine={false} 
                   axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1.5 }}
                   domain={['dataMin', 'dataMax']}
                   type="number"
                   padding={{ left: 20, right: 20 }}
                 />
                 <YAxis 
                   tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontWeight: 600 }} 
                   tickLine={false} 
                   axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1.5 }}
                   padding={{ top: 20, bottom: 20 }}
                 />
                 <Tooltip 
                   contentStyle={{ 
                     borderRadius: '16px', 
                     border: '1px solid hsl(var(--border))', 
                     boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                     backgroundColor: 'hsl(var(--card))',
                     padding: '12px 16px'
                   }}
                   itemStyle={{ fontSize: '12px', fontWeight: 700, textTransform: 'capitalize', padding: '2px 0' }}
                   labelStyle={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'hsl(var(--primary))', marginBottom: '8px', letterSpacing: '0.1em' }}
                 />
                 <Legend 
                   wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '30px', textTransform: 'uppercase', letterSpacing: '0.05em' }} 
                   iconType="circle" 
                   iconSize={8}
                 />
                 {simData.yKeys.map((key, index) => (
                   <Line 
                     key={key} 
                     type="monotone" 
                     dataKey={key} 
                     stroke={colors[index % colors.length]} 
                     strokeWidth={4}
                     dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--background))', stroke: colors[index % colors.length] }}
                     activeDot={{ r: 7, strokeWidth: 0, fill: colors[index % colors.length] }}
                     animationDuration={400}
                     isAnimationActive={!isPlaying}
                   />
                 ))}
               </LineChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
      Unsupported simulation type or missing data format.
    </div>
  );
}
