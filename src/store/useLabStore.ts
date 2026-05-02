import { create } from 'zustand';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, onSnapshot, query, collection, where } from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface Source {
  id: string;
  filename: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
}

export type LabTool = 'flashcards' | 'quiz' | 'visualization';

export interface ToolHistoryItem {
  id: string;
  tool: LabTool;
  result: any;
  timestamp: number;
  title: string;
}

interface LabState {
  sessionId: string;
  sessionTitle: string;
  sources: Source[];
  selectedSourceId: string | null;
  chatHistory: ChatMessage[];
  selectedText: string | null;
  toolResult: any | null;
  activeTool: LabTool | null;
  isGeneratingTool: boolean;
  toolHistory: ToolHistoryItem[];

  setSessionId: (id: string, title?: string) => void;
  loadFromData: (data: Partial<LabState>) => void;
  addSource: (source: Source) => void;
  removeSource: (id: string) => void;
  setSelectedSource: (id: string | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setSelectedText: (text: string | null) => void;
  setToolResult: (tool: LabTool | null, result: any) => void;
  setIsGeneratingTool: (val: boolean) => void;
  addToolHistory: (item: Omit<ToolHistoryItem, 'id' | 'timestamp'>) => void;
  loadToolHistoryItem: (id: string) => void;
  syncToFirestore: () => void;
}

export const useLabStore = create<LabState>((set, get) => ({
  sessionId: crypto.randomUUID(),
  sessionTitle: 'New Lab Session',
  sources: [],
  selectedSourceId: null,
  chatHistory: [],
  selectedText: null,
  toolResult: null,
  activeTool: null,
  isGeneratingTool: false,
  toolHistory: [],

  setSessionId: (id, title) => set({ sessionId: id, sessionTitle: title || 'New Lab Session' }),
  loadFromData: (data) => set({ ...data }),
  
  addSource: (source) => {
    set((state) => ({ sources: [...state.sources, source] }));
    get().syncToFirestore();
  },
  removeSource: (id) => {
    set((state) => {
      const newSources = state.sources.filter(s => s.id !== id);
      return { 
        sources: newSources,
        selectedSourceId: state.selectedSourceId === id ? (newSources.length > 0 ? newSources[0].id : null) : state.selectedSourceId
      };
    });
    get().syncToFirestore();
  },
  setSelectedSource: (id) => set({ selectedSourceId: id }),
  addChatMessage: (msg) => {
    set((state) => {
       const newHistory = [...state.chatHistory, msg];
       const firstUserMsg = newHistory.find(m => m.role === 'user');
       return { 
         chatHistory: newHistory,
         sessionTitle: firstUserMsg && state.sessionTitle === 'New Lab Session' ? (firstUserMsg.content.slice(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '')) : state.sessionTitle
       };
    });
    get().syncToFirestore();
  },
  setSelectedText: (text) => set({ selectedText: text }),
  setToolResult: (tool, result) => set({ activeTool: tool, toolResult: result }),
  setIsGeneratingTool: (val) => set({ isGeneratingTool: val }),
  addToolHistory: (item) => {
    set((state) => ({
      toolHistory: [
        {
          ...item,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
        },
        ...state.toolHistory,
      ],
    }));
    get().syncToFirestore();
  },
  loadToolHistoryItem: (id) => set((state) => {
    const item = state.toolHistory.find(i => i.id === id);
    if (item) {
      return { activeTool: item.tool, toolResult: item.result };
    }
    return state;
  }),
  syncToFirestore: () => {
    const state = get();
    if (auth.currentUser && state.sessionId) {
      const dataToSave = {
        userId: auth.currentUser.uid,
        title: state.sessionTitle,
        sources: state.sources,
        chatHistory: state.chatHistory,
        toolHistory: state.toolHistory,
        updatedAt: Date.now()
      };
      setDoc(doc(db, 'labSessions', state.sessionId), dataToSave, { merge: true }).catch(e => {
        handleFirestoreError(e, OperationType.WRITE, 'labSessions');
      });
    }
  }
}));
