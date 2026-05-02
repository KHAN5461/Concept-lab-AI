import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookMarked, Library, LogIn, MessageSquare, Plus, ChevronRight, Beaker, MoreHorizontal, Pencil, Copy, Trash2, Search, X, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfile } from '../../lib/profile';
import { User } from 'firebase/auth';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface AppSidebarProps {
  user: User | null;
  profile: UserProfile;
  activeView: string;
  setActiveView: (view: any) => void;
  setActiveResource: (resource: any) => void;
  sessions: any[];
  activeSessionId: string | null;
  createNewSession: () => void;
  switchSession: (id: string | null) => void;
  renameSession: (id: string, newTitle: string) => Promise<void>;
  duplicateSession: (id: string) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  deleteSessions: (ids: string[]) => Promise<void>;
  onItemClick?: () => void;
}

export function AppSidebar({
  user,
  profile,
  activeView,
  setActiveView,
  setActiveResource,
  sessions,
  activeSessionId,
  createNewSession,
  switchSession,
  renameSession,
  duplicateSession,
  deleteSession,
  deleteSessions,
  onItemClick
}: AppSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const [startY, setStartY] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0].clientY < 200) { // Only track pull from top
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY === 0) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;
    if (diff > 0 && diff < 80) {
      setPullProgress(diff);
    }
  };

  const handleTouchEnd = async () => {
    if (pullProgress > 60) {
      setIsRefreshing(true);
      // Simulate sync
      await new Promise(r => setTimeout(r, 1000));
      toast.success('Conversations synchronized');
      setIsRefreshing(false);
    }
    setPullProgress(0);
    setStartY(0);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await deleteSessions(Array.from(selectedIds));
      toast.success(`${selectedIds.size} chats deleted`);
      setSelectedIds(new Set());
      setIsMultiSelectMode(false);
    } catch (error) {
      toast.error('Failed to delete some chats');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRenaming = (session: any) => {
    setEditingSessionId(session.id);
    setRenameValue(session.title);
  };

  const handleRename = async () => {
    if (editingSessionId && renameValue.trim()) {
      await renameSession(editingSessionId, renameValue.trim());
      setEditingSessionId(null);
    } else {
      setEditingSessionId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteSession(deleteId);
      toast.success('Chat deleted');
    } catch (error) {
      toast.error('Failed to delete chat');
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="p-4 flex flex-col gap-4 border-b border-border/40 bg-background/50 backdrop-blur-md shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(var(--primary),0.3)]">
              <Library className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="font-serif font-bold text-xl tracking-tight leading-none flex items-center">
              ConceptLab
              <span className="text-primary rounded-full ml-1.5 px-2 py-0.5 bg-primary/10 text-[9px] uppercase tracking-wider font-bold border border-primary/10">PRO</span>
            </div>
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-muted/50 border border-border/40 rounded-xl py-2 pl-9 pr-8 text-[13px] outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-muted-foreground/40 font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-md text-muted-foreground/40 hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      
      <div 
        className="flex-1 overflow-hidden relative" 
        onTouchStart={handleTouchStart} 
        onTouchMove={handleTouchMove} 
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="flex flex-col items-center justify-center overflow-hidden transition-all duration-300"
          style={{ height: pullProgress > 0 || isRefreshing ? '40px' : '0' }}
        >
          {isRefreshing ? (
             <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          ) : (
             <div className="text-[10px] font-bold text-primary/40 uppercase tracking-widest" style={{ opacity: pullProgress / 60 }}>
               Pull to sync
             </div>
          )}
        </div>
        <ScrollArea className="h-full py-4 px-3">
          <div className="mb-6">
            <Button 
              className="w-full gap-2 shadow-sm relative group h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 hover:shadow-md transition-all active:scale-[0.98]" 
              onClick={() => { setActiveView('chat'); setActiveResource(null); createNewSession(); onItemClick?.(); }}
            >
              <Plus className="w-4 h-4" />
              <span className="font-semibold text-sm">New Chat</span>
              <kbd className="absolute right-2.5 opacity-50 pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded bg-background/20 px-1.5 font-mono text-[9px] font-medium text-primary-foreground border border-white/10">
                Alt+N
              </kbd>
            </Button>
          </div>

          <div className="mb-8 space-y-1.5">
            <Button 
              variant={activeView === 'laboratory' ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 h-10 px-3 rounded-xl transition-all font-medium text-[13px]",
                activeView === 'laboratory' ? "bg-background shadow-sm border border-border/50 text-foreground" : "hover:bg-background/80 text-muted-foreground"
              )}
              onClick={() => {
                if (!user) setActiveView('login');
                else setActiveView('laboratory');
                onItemClick?.();
              }}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeView === 'laboratory' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Beaker className="w-3.5 h-3.5" />
              </div>
              <span>Laboratory</span>
            </Button>

            <Button 
              variant={activeView === 'resources' ? 'secondary' : 'ghost'}
              className={cn(
                "w-full justify-start gap-3 h-10 px-3 rounded-xl transition-all font-medium text-[13px]",
                activeView === 'resources' ? "bg-background shadow-sm border border-border/50 text-foreground" : "hover:bg-background/80 text-muted-foreground"
              )}
              onClick={() => { setActiveView('resources'); onItemClick?.(); }}
            >
              <div className={cn(
                "p-1.5 rounded-lg transition-colors",
                activeView === 'resources' ? "bg-orange-500/10 text-orange-600 dark:text-orange-400" : "bg-muted text-muted-foreground"
              )}>
                <BookMarked className="w-3.5 h-3.5" />
              </div>
              <span>Library</span>
            </Button>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between px-3 mb-2.5">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.1em]">Recent Discussions</h4>
              <div className="flex items-center gap-2">
                {searchQuery && <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 rounded-md">{filteredSessions.length} found</span>}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-6 text-[10px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5 px-2"
                  onClick={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    setSelectedIds(new Set());
                  }}
                >
                  {isMultiSelectMode ? 'Cancel' : 'Manage'}
                </Button>
              </div>
            </div>
            
            {isMultiSelectMode && selectedIds.size > 0 && (
              <div className="mb-3 p-2 bg-destructive/5 border border-destructive/10 rounded-xl flex items-center justify-between mx-1">
                 <span className="text-[10px] font-bold text-destructive pl-2">{selectedIds.size} selected</span>
                 <div className="flex items-center gap-1">
                   <Button 
                     variant="ghost" 
                     size="sm" 
                     className="h-7 text-[10px] font-bold uppercase text-muted-foreground"
                     onClick={() => setSelectedIds(new Set())}
                   >
                     Clear
                   </Button>
                   <Button 
                     variant="destructive" 
                     size="sm" 
                     className="h-7 rounded-lg text-[10px] font-black uppercase shadow-sm"
                     onClick={deleteSelected}
                     disabled={isDeleting}
                   >
                     {isDeleting ? '...' : 'Delete'}
                   </Button>
                 </div>
              </div>
            )}
            
            <div className="space-y-0.5">
              {filteredSessions.length === 0 && (
                <div className="text-[12px] text-muted-foreground/60 px-4 py-6 text-center border border-dashed border-border/40 rounded-xl mx-1 bg-background/30">
                  {searchQuery ? "No matches found" : "Start your first discussion"}
                </div>
              )}
              {filteredSessions.map(session => (
                <div 
                  key={session.id} 
                  className={cn(
                    "relative group",
                    isMultiSelectMode && "cursor-pointer"
                  )}
                  onClick={() => isMultiSelectMode && toggleSelect(session.id)}
                >
                  {editingSessionId === session.id ? (
                    <div className="flex items-center gap-1.5 px-2 py-1.5 bg-background shadow-sm border border-primary/30 rounded-xl mb-1 mx-1 animate-in zoom-in-95">
                      <Input
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="h-7 text-[12px] font-medium border-0 focus-visible:ring-0 px-1 bg-transparent"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename();
                          if (e.key === 'Escape') setEditingSessionId(null);
                        }}
                      />
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-primary hover:bg-primary/5" onClick={handleRename}>
                        <Check className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-1">
                      {isMultiSelectMode && (
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center shrink-0 ml-1",
                          selectedIds.has(session.id) ? "bg-primary border-primary" : "border-border/40 hover:border-primary/40"
                        )}>
                          {selectedIds.has(session.id) && <Check className="w-3.5 h-3.5 text-primary-foreground stroke-[3]" />}
                        </div>
                      )}
                      <div className="relative flex-1 min-w-0">
                        <Button
                          variant={activeSessionId === session.id && activeView === 'chat' ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 px-3 h-9 font-normal pr-10 rounded-lg transition-all",
                            activeSessionId === session.id && activeView === 'chat' ? "font-semibold bg-background shadow-sm border border-border/40 text-foreground" : "hover:bg-background/80 text-muted-foreground hover:text-foreground",
                            isMultiSelectMode && "pointer-events-none"
                          )}
                          onClick={() => { switchSession(session.id); onItemClick?.(); }}
                        >
                          <MessageSquare className={cn(
                            "w-3.5 h-3.5 shrink-0 transition-all", 
                            activeSessionId === session.id && activeView === 'chat' ? "text-primary scale-110" : "opacity-40"
                          )} />
                          <span className="truncate text-[13px]">{session.title}</span>
                        </Button>
                        <div className="absolute right-1 top-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all flex items-center bg-background/80 backdrop-blur-sm md:bg-transparent md:backdrop-blur-none rounded-lg z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "icon" }),
                                "h-8 w-8 md:h-7 md:w-7 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg shrink-0"
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="w-3.5 h-3.5 md:w-3 md:h-3" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-border/40 p-1">
                              <DropdownMenuItem onSelect={() => startRenaming(session)} className="gap-2 cursor-pointer rounded-lg px-2.5 py-1.5">
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                                <span className="text-[13px]">Rename</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => duplicateSession(session.id)} className="gap-2 cursor-pointer rounded-lg px-2.5 py-1.5">
                                <Copy className="w-4 h-4 text-muted-foreground" />
                                <span className="text-[13px]">Duplicate</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 border-border/40" />
                              <DropdownMenuItem onSelect={() => setDeleteId(session.id)} className="gap-2 cursor-pointer rounded-lg px-2.5 py-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="w-4 h-4 shrink-0" />
                                <span className="text-[13px]">Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>

      <div className="p-3 mt-auto border-t border-border/40 bg-background/50 backdrop-blur-md shrink-0">
        {user ? (
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 h-12 px-2.5 rounded-xl hover:bg-muted font-medium text-[13px] border border-transparent hover:border-border/40 transition-all active:scale-[0.98]"
            onClick={() => { setActiveView('settings'); onItemClick?.(); }}
          >
            <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10 border border-primary/20 shrink-0 flex items-center justify-center relative shadow-sm">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="text-primary text-[10px] font-bold">
                  {(user?.displayName || profile?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col items-start leading-tight flex-1 overflow-hidden">
              <span className="font-semibold text-[13px] truncate w-full text-left">{user?.displayName || profile?.name || 'Explorer'}</span>
              <span className="text-[10px] text-muted-foreground w-full truncate text-left font-bold tracking-tight opacity-70">LEVEL {profile?.level || 1} EXPLORER</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="w-full justify-start gap-4 h-12 px-4 rounded-xl hover:bg-primary hover:text-primary-foreground font-semibold text-[14px] transition-all"
            onClick={() => { setActiveView('login'); onItemClick?.(); }}
          >
            <LogIn className="w-5 h-5 opacity-70" />
            <span>Sign In to Sync</span>
          </Button>
        )}
      </div>
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <DialogTitle>Delete Conversation?</DialogTitle>
            <DialogDescription>
              This will permanently delete this discussion and all associated messages. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting} className="rounded-xl">
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting} className="rounded-xl gap-2">
              {isDeleting ? (
                <>
                  <span className="animate-spin text-[10px]">●</span>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
