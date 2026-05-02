import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { BookMarked, Layers, BrainCircuit, FileQuestion, Trash2, Calendar, ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface SavedResource {
  id: string;
  type: 'quiz' | 'flashcards' | 'concept_map';
  title: string;
  content: string;
  createdAt: number;
}

export function ResourceLibrary({ onOpenResource, onClose }: { onOpenResource: (resource: SavedResource) => void, onClose?: () => void }) {
  const [resources, setResources] = useState<SavedResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'resources'), where('userId', '==', auth.currentUser.uid));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedResource));
        setResources(fetched.sort((a, b) => b.createdAt - a.createdAt));
      } catch (error) {
        console.error('Error fetching resources:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.error('Delete Resource?', {
      description: 'Are you sure you want to permanently delete this resource?',
      action: {
        label: 'Delete',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'resources', id));
            setResources(prev => prev.filter(r => r.id !== id));
            toast.success('Resource deleted');
          } catch (error) {
            console.error('Error deleting resource:', error);
            toast.error('Failed to delete resource');
          }
        }
      }
    });
  };

  const handleExport = (resource: SavedResource, e: React.MouseEvent) => {
    e.stopPropagation();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(resource.content);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `${resource.title.replace(/\s+/g, '_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success('Resource exported to JSON');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'concept_map': return <Layers className="w-5 h-5" />;
      case 'flashcards': return <BrainCircuit className="w-5 h-5" />;
      case 'quiz': return <FileQuestion className="w-5 h-5" />;
      default: return <BookMarked className="w-5 h-5" />;
    }
  };

  const getColor = (type: string) => {
    switch (type) {
      case 'concept_map': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'flashcards': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'quiz': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-primary/10 text-primary border-primary/20';
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="p-6 sm:p-8 md:p-12 bg-background border-b relative overflow-hidden shrink-0">
        {onClose && (
           <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 hover:bg-muted/50 rounded-xl">
             <ArrowLeft className="w-5 h-5" />
           </Button>
        )}
        <div className="absolute top-0 right-0 p-8 opacity-[0.03]">
           <BookMarked className="w-64 h-64 transform -rotate-12" />
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-3 relative z-10 text-center sm:text-left mt-4 sm:mt-0">
           <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary border text-primary-foreground flex items-center justify-center shadow-sm">
              <BookMarked className="w-7 h-7 sm:w-8 sm:h-8" />
           </div>
           <div>
             <h2 className="text-2xl sm:text-4xl font-serif tracking-tight text-foreground/90 leading-tight">Resource Library</h2>
             <p className="text-muted-foreground max-w-lg mt-1 font-medium font-sans text-sm sm:text-base">
               Your saved quizzes, flashcards, and concept maps.
             </p>
           </div>
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 sm:px-8 md:px-12 py-6 sm:py-8 bg-muted/10">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground font-serif">Loading resources...</div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-center border border-dashed border-border/60 rounded-3xl bg-background/50">
             <div className="w-20 h-20 bg-muted/60 border border-border/80 shadow-sm rounded-2xl flex items-center justify-center mb-6">
                <BookMarked className="w-10 h-10 text-muted-foreground/60" />
             </div>
             <h3 className="text-xl font-serif tracking-tight mb-2 text-foreground/80">No saved resources</h3>
             <p className="text-muted-foreground font-sans text-sm max-w-sm">Use the Laboratory to generate study materials, and they will be saved automatically to this library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-10">
            {resources.map((resource) => (
              <div 
                key={resource.id} 
                onClick={() => onOpenResource(resource)}
                className="group flex flex-col justify-between p-6 rounded-2xl border border-border/60 bg-card hover:bg-muted/5 hover:shadow-md hover:border-primary/40 transition-all duration-300 cursor-pointer relative"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getColor(resource.type)}`}>
                       {getIcon(resource.type)}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-opacity"
                        onClick={(e) => handleExport(resource, e)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 -mr-2 transition-opacity"
                        onClick={(e) => handleDelete(resource.id, e)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <h3 className="text-xl font-serif leading-tight text-foreground/90 group-hover:text-primary transition-colors tracking-tight mb-3 line-clamp-2">{resource.title || 'Untitled Resource'}</h3>
                  <div className="text-[10px] font-sans font-semibold uppercase tracking-widest text-muted-foreground mb-6">
                    {resource.type.replace('_', ' ')}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-sans font-medium text-muted-foreground/80 bg-muted/30 border border-border/40 w-fit px-3 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5" />
                  {format(new Date(resource.createdAt), 'MMM d, yyyy')}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

