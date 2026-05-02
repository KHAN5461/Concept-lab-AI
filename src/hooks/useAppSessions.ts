import { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { doc, setDoc, deleteDoc, onSnapshot, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebase-errors';
import { type Message } from '../lib/gemini';

export type Source = {
  name: string;
  content: string;
};

export type Session = {
  id: string;
  title: string;
  messages: Message[];
  sources?: Source[];
  updatedAt: number;
};

export function getInitialSessions(): Session[] {
  let loaded: Session[] = [];
  try {
    const saved = localStorage.getItem('conceptlab_guest_sessions');
    if (saved) loaded = JSON.parse(saved);
  } catch (e) {
    console.error("Failed to parse sessions", e);
  }
  
  const existingEmpty = loaded.find(s => s.title === 'New Chat' && s.messages.length === 0);
  if (!existingEmpty) {
    loaded.unshift({
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    });
  }
  return loaded;
}

export function useAppSessions(user: User | null) {
  const [sessions, setSessions] = useState<Session[]>(getInitialSessions());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(() => {
    try {
      if (!user) {
        const saved = localStorage.getItem('conceptlab_guest_active_session');
        if (saved) return saved;
      }
    } catch {}
    return getInitialSessions()[0]?.id || null;
  });

  // Persist guest sessions to localStorage
  useEffect(() => {
    if (!user) {
      localStorage.setItem('conceptlab_guest_sessions', JSON.stringify(sessions));
    }
  }, [sessions, user]);

  useEffect(() => {
    if (!user && activeSessionId) {
      localStorage.setItem('conceptlab_guest_active_session', activeSessionId);
    }
  }, [activeSessionId, user]);

  const remoteSyncing = useRef(false);
  const hasInitialLoadForUser = useRef<string | null>(null);

  // Sync from Firestore to Local State
  useEffect(() => {
    if (!user) return;
    
    const q = query(collection(db, 'sessions'), where("userId", "==", user.uid));
    const unsub = onSnapshot(q, async (snapshot) => {
      remoteSyncing.current = true;
      const loaded: Session[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        loaded.push({
          id: doc.id,
          title: data.title || 'New Chat',
          messages: data.messages || [],
          updatedAt: data.updatedAt || Date.now()
        });
      });
      loaded.sort((a, b) => b.updatedAt - a.updatedAt);
      
      const existingEmpty = loaded.find(s => s.title === 'New Chat' && s.messages.length === 0);
      if (hasInitialLoadForUser.current !== user.uid) {
         hasInitialLoadForUser.current = user.uid;
         if (!existingEmpty) {
            const newId = Date.now().toString();
            const newSession: Session = {
               id: newId,
               title: 'New Chat',
               messages: [],
               updatedAt: Date.now()
            };
            loaded.unshift(newSession);
            const { id, ...sessionData } = newSession;
            try {
              await setDoc(doc(db, 'sessions', newId), {
                ...sessionData,
                userId: user.uid
              });
            } catch (error) {
              handleFirestoreError(error, OperationType.CREATE, `sessions/${newId}`);
            }
         }
         
         const latestSession = loaded[0];
         if (latestSession) setActiveSessionId(latestSession.id);
      }
      
      setSessions(loaded);
      
      setTimeout(() => {
        remoteSyncing.current = false;
      }, 500);
    }, (error) => {
      console.warn("Sessions sync error:", error);
      handleFirestoreError(error, OperationType.GET, 'sessions');
    });

    return () => unsub();
  }, [user]);

  const saveTimeouts = useRef<Record<string, NodeJS.Timeout>>({});

  const saveSessionToFirestoreDebounced = (session: Session) => {
    if (!user || remoteSyncing.current) return;
    
    if (saveTimeouts.current[session.id]) {
      clearTimeout(saveTimeouts.current[session.id]);
    }
    
    saveTimeouts.current[session.id] = setTimeout(async () => {
      try {
        const ref = doc(db, 'sessions', session.id);
        await setDoc(ref, {
          userId: user.uid,
          title: session.title,
          messages: session.messages,
          updatedAt: session.updatedAt
        });
      } catch (error) {
        console.warn("Silent failure to save to cloud:", error);
        handleFirestoreError(error, OperationType.UPDATE, `sessions/${session.id}`);
      }
    }, 1500);
  };

  const updateSessionMessages = (targetSessionId: string, action: React.SetStateAction<Message[]>) => {
    setSessions(prevSessions => {
      const sessionIndex = prevSessions.findIndex(s => s.id === targetSessionId);
      if (sessionIndex === -1) return prevSessions;
      
      const session = prevSessions[sessionIndex];
      const updatedMessages = typeof action === 'function' ? action(session.messages) : action;
      
      let title = session.title;
      if (session.title === 'New Chat' && updatedMessages.length > 0) {
        const firstUserMsg = updatedMessages.find(m => m.role === 'user');
        if (firstUserMsg) {
          title = firstUserMsg.text.substring(0, 35) + (firstUserMsg.text.length > 35 ? '...' : '');
        }
      }
      
      const updatedSession = { ...session, title, messages: updatedMessages, updatedAt: Date.now() };
      saveSessionToFirestoreDebounced(updatedSession);
      
      const newSessions = [...prevSessions];
      newSessions[sessionIndex] = updatedSession;
      newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
      return newSessions;
    });
  };

  const switchSession = (id: string | null) => {
    if (activeSessionId && id !== activeSessionId) {
      // Cleanup empty chats when switching away
      setSessions(prev => {
        const canCleanup = (s: Session) => s.id === activeSessionId && s.messages.length === 0 && s.title === 'New Chat';
        if (prev.some(canCleanup)) {
          return prev.filter(s => !canCleanup(s));
        }
        return prev;
      });
    }
    setActiveSessionId(id);
  };

  const createNewSession = () => {
    const existingEmpty = sessions.find(s => s.messages.length === 0 && s.title === 'New Chat');
    if (existingEmpty) {
      switchSession(existingEmpty.id);
      return;
    }
    
    const newSession: Session = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      updatedAt: Date.now()
    };
    
    setSessions(prev => [newSession, ...prev]);
    switchSession(newSession.id);
  };

  const clearHistory = async () => {
    if (window.confirm('Delete all chats permanently?')) {
      if (user) {
        try {
           const promises = sessions.map(s => deleteDoc(doc(db, 'sessions', s.id)));
           await Promise.all(promises);
        } catch(error) {
           alert("We couldn't delete all chats from the cloud due to a network or permission issue. Logging out and logging back in might help.");
           handleFirestoreError(error, OperationType.DELETE, 'sessions/*');
        }
      }
      setSessions([]);
      setActiveSessionId(null);
    }
  };

  const renameSession = async (id: string, newTitle: string) => {
    if (newTitle && newTitle.trim()) {
      const updatedTitle = newTitle.trim();
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: updatedTitle } : s));
      if (user) {
        try {
           await updateDoc(doc(db, 'sessions', id), { title: updatedTitle, updatedAt: Date.now() });
        } catch(error) {
           handleFirestoreError(error, OperationType.UPDATE, `sessions/${id}`);
        }
      }
    }
  };

  const duplicateSession = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (!session) return;
    
    const newSessionId = crypto.randomUUID();
    const newSession: Session = {
       id: newSessionId,
       title: `${session.title} (Copy)`,
       messages: [...session.messages],
       updatedAt: Date.now()
    };
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    
    if (user) {
      try {
        await setDoc(doc(db, 'sessions', newSessionId), {
          userId: user.uid,
          title: newSession.title,
          messages: newSession.messages,
          updatedAt: newSession.updatedAt
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `sessions/${newSessionId}`);
      }
    }
  };

  const deleteInternal = async (id: string) => {
    const sessionToRemove = sessions.find(s => s.id === id);
    if (!sessionToRemove) return;

    // Use a functional update to determine next active session correctly from latest state
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== id);
      if (activeSessionId === id) {
        if (filtered.length > 0) {
          setActiveSessionId(filtered[0].id);
        } else {
          setActiveSessionId(null);
        }
      }
      return filtered;
    });

    if (user) {
       try {
          await deleteDoc(doc(db, 'sessions', id));
       } catch(error) {
          // Rollback on failure
          setSessions(prev => {
            if (prev.some(s => s.id === id)) return prev;
            const newSessions = [sessionToRemove, ...prev];
            newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
            return newSessions;
          });
          
          setActiveSessionId(id);
          
          handleFirestoreError(error, OperationType.DELETE, `sessions/${id}`);
          throw error; 
       }
    }
  };

  return {
    sessions,
    setSessions,
    activeSessionId,
    setActiveSessionId,
    activeSession: sessions.find(s => s.id === activeSessionId) || null,
    updateSessionMessages,
    switchSession,
    createNewSession,
    clearHistory,
    renameSession,
    duplicateSession,
    deleteSession: async (id: string) => {
      // Small wrapper for the internal implementation
      return deleteInternal(id);
    },
    deleteSessions: async (ids: string[]) => {
      if (ids.length === 0) return;
      
      const sessionsToRemove = sessions.filter(s => ids.includes(s.id));
      if (sessionsToRemove.length === 0) return;

      // Optimistic Update
      setSessions(prev => {
        const filtered = prev.filter(s => !ids.includes(s.id));
        if (activeSessionId && ids.includes(activeSessionId)) {
          if (filtered.length > 0) setActiveSessionId(filtered[0].id);
          else setActiveSessionId(null);
        }
        return filtered;
      });

      if (user) {
        try {
          const promises = ids.map(id => deleteDoc(doc(db, 'sessions', id)));
          await Promise.all(promises);
        } catch (error) {
          // Partial rollback is hard, but we can reset the whole state from Firestore or alert
          // For now, let's just trigger a reload or console error
          handleFirestoreError(error, OperationType.DELETE, 'sessions/*');
          throw error;
        }
      }
    }
  };
}
