import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as math from 'mathjs';
import { SlidersHorizontal } from 'lucide-react';

interface IVariable {
  name: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

interface IFunction {
  name: string;
  expr: string;
}

interface IInteractiveGraphData {
  title?: string;
  variables: IVariable[];
  domain: [number, number];
  functions: IFunction[];
  samples?: number;
}

export function InteractiveGraph({ data }: { data: string }) {
  let spec: IInteractiveGraphData;
  try {
    spec = JSON.parse(data);
  } catch (e) {
    return <div className="p-4 bg-red-50 text-red-600 rounded">Invalid interactive graph specification.</div>;
  }

  const [vars, setVars] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    spec.variables.forEach(v => {
      init[v.name] = v.default;
    });
    return init;
  });

  const handleVarChange = (name: string, value: number) => {
    setVars(prev => ({ ...prev, [name]: value }));
  };

  const chartData = useMemo(() => {
    const samples = spec.samples || 50;
    const [minX, maxX] = spec.domain;
    const stepX = (maxX - minX) / samples;
    const dataPoints = [];

    // Compile functions once
    const compiled = spec.functions.map(f => {
      try {
        return { name: f.name, node: math.evaluate(f.expr) ? math.compile(f.expr) : null };
      } catch (e) {
        return { name: f.name, node: null };
      }
    });

    for (let i = 0; i <= samples; i++) {
      const x = minX + i * stepX;
      const point: any = { x: Number(x.toFixed(3)) };
      
      compiled.forEach(f => {
        if (f.node) {
          try {
            point[f.name] = Number(f.node.evaluate({ ...vars, x }).toFixed(3));
          } catch(e) {
            point[f.name] = 0;
          }
        }
      });
      dataPoints.push(point);
    }
    return dataPoints;
  }, [spec, vars]);

  const colors = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div style={{ touchAction: 'pan-y' }} className="w-full my-6 bg-card border border-border/50 rounded-3xl overflow-hidden shadow-sm flex flex-col">
      {spec.title && (
        <div className="px-6 py-4 border-b border-border/50 bg-muted/30 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground tracking-tight">{spec.title}</span>
        </div>
      )}
      
      <div className="p-6 flex flex-col md:flex-row gap-8 lg:gap-12">
        <div className="flex-1" style={{ minHeight: '350px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis dataKey="x" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', backgroundColor: 'hsl(var(--card))' }}
                itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
              />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '16px', fontWeight: 500 }} />
              {spec.functions.map((f, i) => (
                <Line 
                  key={f.name} 
                  type="monotone" 
                  dataKey={f.name} 
                  stroke={colors[i % colors.length]} 
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5, fill: 'hsl(var(--background))', stroke: colors[i % colors.length], strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {spec.variables.length > 0 && (
          <div className="w-full md:w-72 flex flex-col gap-6 shrink-0 flex-col justify-center">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2">Control Variables</h4>
            <div className="bg-muted/30 p-5 rounded-2xl border border-border/40 space-y-6">
               {spec.variables.map(v => (
                 <div key={v.name} className="flex flex-col gap-2 relative">
                   <div className="flex justify-between text-sm items-center">
                     <label className="text-foreground font-semibold">{v.label}</label>
                     <span className="text-primary font-mono text-[13px] bg-primary/10 px-2.5 py-0.5 rounded-md">{vars[v.name]}</span>
                   </div>
                   <input 
                     type="range" 
                     min={v.min} 
                     max={v.max} 
                     step={v.step} 
                     value={vars[v.name]} 
                     onChange={(e) => handleVarChange(v.name, parseFloat(e.target.value))}
                     className="w-full h-1.5 bg-muted rounded-full outline-none accent-primary transition-all slider-thumb-primary"
                   />
                 </div>
               ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
