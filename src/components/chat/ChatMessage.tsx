import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Library, Loader2, ThumbsUp, ThumbsDown, Beaker, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { buttonVariants } from '@/components/ui/button';
import { CodeBlock } from './CodeBlock';
import { SimulationViewer } from '../SimulationViewer';
import { InteractiveGraph } from '../InteractiveGraph';
import { ConceptMapViewer } from '../ConceptMapViewer';
import { Message } from '../../lib/gemini';

export const markdownComponents: any = {
  h1: ({node, ...props}: any) => <h1 className="text-2xl font-bold mt-8 mb-4 tracking-tight" {...props}/>,
  h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold mt-6 mb-3 tracking-tight" {...props}/>,
  h3: ({node, ...props}: any) => <h3 className="text-lg font-semibold mt-4 mb-2 tracking-tight" {...props}/>,
  p: ({node, ...props}: any) => <p className="mb-4 text-foreground/90 leading-relaxed" {...props}/>,
  ul: ({node, ...props}: any) => <ul className="list-disc pl-5 mb-4 space-y-2 text-foreground/90" {...props}/>,
  ol: ({node, ...props}: any) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-foreground/90" {...props}/>,
  li: ({node, ...props}: any) => <li className="" {...props}/>,
  strong: ({node, ...props}: any) => <strong className="font-semibold text-foreground tracking-tight" {...props}/>,
  blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-primary/20 bg-muted/50 p-4 rounded-r-xl italic text-muted-foreground mb-4 shadow-sm" {...props}/>,
  code: ({node, inline, className, children, ...props}: any) => {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match) {
      const codeStr = String(children).replace(/\n$/, '');
      if (match[1] === 'simulation') return <SimulationViewer data={codeStr} />;
      if (match[1] === 'interactive') return <InteractiveGraph data={codeStr} />;
      if (match[1] === 'conceptmap') return <ConceptMapViewer data={codeStr} />;
      return <CodeBlock match={match} codeStr={codeStr} props={props} children={children} />;
    }
    return <code className="bg-muted/80 text-primary px-1.5 py-0.5 rounded-md text-sm font-mono" {...props}>{children}</code>;
  }
};

export function ChatMessage({ message, isGenerating, onFeedback, onSendToLaboratory }: { message: Message, isGenerating?: boolean, onFeedback?: (id: string, feedback: 'up' | 'down') => void, onSendToLaboratory?: (text: string) => void }) {
  const isUser = message.role === 'user';
  
  let displayText = message.text || '';
  let parsedFiles: string[] = [];
  
  if (isUser) {
    const attachmentMatch = displayText.match(/\n\n\[Attached .*? file\(s\)\][\s\S]*$/);
    if (attachmentMatch) {
      displayText = displayText.replace(attachmentMatch[0], '');
      parsedFiles = ['Attached File(s)'];
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn("w-full px-3 sm:px-4 py-5 sm:py-6 flex justify-center", isUser ? "bg-background" : "bg-muted/10 border-y border-border/20")}
    >
      <div className={cn("w-full max-w-3xl flex gap-3.5 sm:gap-4 group")}>
        <div className="flex-shrink-0 mt-0.5">
          {isUser ? (
            <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-secondary border border-border/40 flex items-center justify-center shadow-sm select-none">
              <span className="text-[10px] font-bold tracking-tight">ME</span>
            </div>
          ) : (
            <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-lg shadow-primary/20 select-none transform transition-all group-hover:scale-105 group-hover:shadow-primary/30">
              <Library className="w-4 h-4" />
            </div>
          )}
        </div>
        <div className={cn("min-w-0 flex-1 prose prose-slate dark:prose-invert max-w-none break-words")}>
          {isUser ? (
            <div className="flex flex-col gap-3">
              {parsedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {parsedFiles.map((f, i) => (
                    <div key={`file-${i}`} className="flex items-center gap-1.5 bg-primary/5 border border-primary/10 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-primary">
                       <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                       <span>{f}</span>
                    </div>
                  ))}
                </div>
              )}
              {displayText && <div className="whitespace-pre-wrap text-[15px] leading-relaxed font-medium text-foreground/90 tracking-tight">{displayText}</div>}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="markdown-body text-[15px] leading-relaxed text-foreground/90 font-serif">
                <ReactMarkdown 
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={markdownComponents}
                >
                  {message.text || ' '}
                </ReactMarkdown>
                {isGenerating && !message.text && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex flex-col gap-4 mt-6 w-full md:max-w-[70%]"
                  >
                    <div className="flex items-center gap-3 text-primary mt-2">
                       <div className="p-2 bg-primary/10 rounded-xl">
                          <Loader2 className="w-4 h-4 animate-spin" />
                       </div>
                       <span className="text-[14px] font-bold tracking-tight uppercase">Synthesizing insight...</span>
                    </div>
                    <div className="w-full h-1 bg-muted overflow-hidden rounded-full max-w-[300px]">
                       <motion.div className="h-full bg-primary" initial={{ width: "0%" }} animate={{ width: "100%" }} transition={{ duration: 3, ease: "easeInOut", repeat: Infinity }} />
                    </div>
                  </motion.div>
                )}
                {isGenerating && message.text && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="flex items-center gap-2 text-primary mt-4 h-6 px-3 bg-primary/5 border border-primary/10 w-fit rounded-full"
                  >
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-[11px] font-bold uppercase tracking-widest animate-pulse">Streaming Response</span>
                  </motion.div>
                )}
              </div>
              {message.text && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-3 mt-4 pt-4 border-t border-border/10 opacity-100 md:opacity-40 md:hover:opacity-100 transition-opacity"
                >
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        onClick={() => {
                          navigator.clipboard.writeText(message.text);
                        }}
                        className={buttonVariants({ variant: "ghost", size: "icon", className: "h-9 w-9 rounded-lg hover:bg-muted transition-all text-muted-foreground" })}
                      >
                        <Copy className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>Copy content</TooltipContent>
                    </Tooltip>
                    
                    {onFeedback && (
                      <>
                        <div className="w-[1px] h-4 bg-border/40 mx-0.5" />
                        <Tooltip>
                          <TooltipTrigger
                            onClick={() => onFeedback(message.id, 'up')}
                            className={buttonVariants({ variant: "ghost", size: "icon", className: cn("h-9 w-9 rounded-lg hover:bg-green-500/10 hover:text-green-600 transition-all", message.feedback === 'up' && "text-green-600 bg-green-500/10") })}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </TooltipTrigger>
                          <TooltipContent>Helpful</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger
                            onClick={() => onFeedback(message.id, 'down')}
                            className={buttonVariants({ variant: "ghost", size: "icon", className: cn("h-9 w-9 rounded-lg hover:bg-red-500/10 hover:text-red-600 transition-all", message.feedback === 'down' && "text-red-600 bg-red-500/10") })}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </TooltipTrigger>
                          <TooltipContent>Not helpful</TooltipContent>
                        </Tooltip>
                      </>
                    )}

                    <div className="w-[1px] h-4 bg-border/40 mx-0.5" />
                    <Tooltip>
                      <TooltipTrigger
                        onClick={() => onSendToLaboratory?.(message.text)}
                        className={buttonVariants({ variant: "ghost", size: "icon", className: "h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-all text-muted-foreground" })}
                      >
                        <Beaker className="w-4 h-4" />
                      </TooltipTrigger>
                      <TooltipContent>Send to Laboratory</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
