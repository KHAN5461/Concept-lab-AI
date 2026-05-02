import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import TextareaAutosize from 'react-textarea-autosize';
import { Button, buttonVariants } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Plus, X, ArrowRight, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatInputAreaProps {
  isLoading: boolean;
  onSend: (text: string, files: File[]) => void;
  onStop: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
}

export function ChatInputArea({ isLoading, onSend, onStop, textareaRef }: ChatInputAreaProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const clearInput = () => {
    setInput('');
    setAttachments([]);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || (!input.trim() && attachments.length === 0)) return;
    onSend(input, attachments);
    clearInput();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="shrink-0 w-full bg-background pt-2 pb-6 md:pb-8 px-3 sm:px-4 z-40 relative border-t border-border/10">
      <motion.div 
         initial={{ y: 20, opacity: 0 }} 
         animate={{ y: 0, opacity: 1 }} 
         className="max-w-4xl mx-auto w-full"
      >
        <div className="relative shadow-[0_12px_40px_rgba(0,0,0,0.06)] bg-card border border-border/40 rounded-xl sm:rounded-3xl overflow-hidden flex flex-col focus-within:ring-2 focus-within:ring-primary/10 focus-within:border-primary/40 transition-all duration-300">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2.5 p-4 pb-0 overflow-x-auto min-h-[40px]">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-primary/5 border border-primary/10 px-3.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-primary shadow-sm hover:bg-primary/10 transition-colors">
                  <span className="truncate max-w-[140px]">{file.name}</span>
                  <button 
                    onClick={() => handleRemoveAttachment(i)} 
                    className="text-primary/60 hover:text-primary transition-colors p-1 -mr-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <TextareaAutosize 
            ref={textareaRef as any}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Interrogate your knowledge..."
            className="w-full bg-transparent border-0 focus:ring-0 resize-none min-h-[52px] max-h-[40vh] py-4 px-5 text-base md:text-lg outline-none font-medium text-foreground/90 leading-relaxed placeholder:text-muted-foreground/30 transition-all"
            minRows={1}
            disabled={isLoading}
          />
          <div className="flex items-center justify-between w-full px-4 pb-4">
             <div className="flex items-center gap-1.5">
                <input type="file" accept=".txt,.md,.csv,.json,.rtf,.html,.log,.pdf" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      onClick={(e) => { e.preventDefault(); fileInputRef.current?.click(); }}
                      className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-10 w-10 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all")}
                    >
                      <Plus className="w-5.5 h-5.5" />
                    </TooltipTrigger>
                    <TooltipContent className="font-bold text-[10px] uppercase tracking-widest px-2 py-1">Attach Context</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
             </div>
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">Shift+Enter for new line</span>
              <Button 
                size="icon" 
                disabled={(!input.trim() && attachments.length === 0 && !isLoading)}
                onClick={(e) => {
                  e.preventDefault();
                  if (isLoading) {
                    onStop();
                  } else {
                    handleSubmit();
                  }
                }}
                className={cn(
                  "h-10 w-10 md:h-11 md:w-11 rounded-xl md:rounded-2xl transition-all duration-300 shadow-lg shadow-primary/10", 
                  (input.trim() || attachments.length > 0 || isLoading) ? "bg-primary text-primary-foreground shadow-primary/20 scale-100 hover:shadow-primary/30 hover:-translate-y-0.5" : "bg-muted text-muted-foreground scale-95 opacity-50"
                )}
              >
                {isLoading ? <Square className="w-4 h-4 fill-current animate-pulse" /> : <ArrowRight className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>
        <div className="text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/20 mt-4 px-4">
          Powered by ConceptLab Neural Engine
        </div>
      </motion.div>
    </div>
  );
}
