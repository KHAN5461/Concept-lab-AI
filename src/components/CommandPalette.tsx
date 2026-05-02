import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { Search, MessageSquare, Beaker, BookMarked, Settings, Plus, BrainCircuit, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: any[];
  switchSession: (id: string) => void;
  setActiveView: (view: any) => void;
  createNewSession: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  sessions,
  switchSession,
  setActiveView,
  createNewSession
}: CommandPaletteProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const runCommand = (command: () => void) => {
    command();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden border-none shadow-2xl max-w-2xl sm:rounded-2xl">
        <Command className="flex flex-col bg-card h-full max-h-[80vh] overflow-hidden">
          <div className="flex items-center border-b border-border/40 px-4 py-3 gap-3">
            <Search className="w-5 h-5 text-muted-foreground" />
            <Command.Input
              placeholder="Search conversations, tools, or shortcuts..."
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-base font-medium placeholder:text-muted-foreground/40"
            />
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-muted rounded-lg border border-border/40">
              <span className="text-[10px] font-bold text-muted-foreground">ESC</span>
            </div>
          </div>
          <Command.List className="flex-1 overflow-y-auto p-2 scrollbar-hide py-4">
            <Command.Empty className="py-12 flex flex-col items-center justify-center text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Search className="w-6 h-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No matches found for this query.</p>
            </Command.Empty>

            <Command.Group heading="Shortcuts" className="px-2 mb-4">
              <Command.Item
                onSelect={() => runCommand(() => { setActiveView('chat'); createNewSession(); })}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted aria-selected:bg-primary/10 aria-selected:text-primary transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-aria-selected:bg-primary group-aria-selected:text-primary-foreground transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">New Conversation</span>
                  <span className="text-[11px] opacity-60">Start a fresh neural exploration</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => setActiveView('laboratory'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted aria-selected:bg-primary/10 aria-selected:text-primary transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-aria-selected:bg-primary group-aria-selected:text-primary-foreground transition-colors">
                  <Beaker className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Neural Laboratory</span>
                  <span className="text-[11px] opacity-60">Flashcards, Quizzes, and Simulations</span>
                </div>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => setActiveView('resources'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted aria-selected:bg-primary/10 aria-selected:text-primary transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-aria-selected:bg-primary group-aria-selected:text-primary-foreground transition-colors">
                  <BookMarked className="w-4 h-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">Resource Library</span>
                  <span className="text-[11px] opacity-60">Access your saved learning assets</span>
                </div>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Recent Conversations" className="px-2">
              {sessions.map(session => (
                <Command.Item
                  key={session.id}
                  onSelect={() => runCommand(() => { setActiveView('chat'); switchSession(session.id); })}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted aria-selected:bg-primary/10 aria-selected:text-primary transition-all group"
                >
                  <div className="w-8 h-8 rounded-lg bg-secondary border border-border/40 flex items-center justify-center group-aria-selected:bg-primary group-aria-selected:text-primary-foreground transition-colors">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-semibold truncate">{session.title}</span>
                    <span className="text-[11px] opacity-60">Jump back into this session</span>
                  </div>
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Settings" className="px-2 mt-4">
              <Command.Item
                onSelect={() => runCommand(() => setActiveView('settings'))}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer hover:bg-muted aria-selected:bg-primary/10 aria-selected:text-primary transition-all group"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center group-aria-selected:bg-primary group-aria-selected:text-primary-foreground transition-colors">
                  <Settings className="w-4 h-4" />
                </div>
                <span className="text-sm font-semibold">Preferences</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          <div className="border-t border-border/40 px-4 py-3 bg-muted/30 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="px-1 py-0.5 bg-muted border border-border/40 rounded">↑↓</span>
                <span>Navigate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1 py-0.5 bg-muted border border-border/40 rounded">ENTER</span>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-primary" />
              <span>Context Search</span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
