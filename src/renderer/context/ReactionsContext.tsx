import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { ReactionType } from '@shared/types';

interface ReactionEntry {
  studentId: string;
  studentName: string;
  reaction: ReactionType;
  timestamp: number;
}

interface ReactionsContextType {
  reactions: Map<string, ReactionEntry>;
  myReaction: ReactionType;
  setReaction: (studentId: string, studentName: string, reaction: ReactionType) => void;
  clearReaction: (studentId: string) => void;
  clearAllReactions: () => void;
  setMyReaction: (reaction: ReactionType) => void;
  getActiveReactions: () => ReactionEntry[];
}

const ReactionsContext = createContext<ReactionsContextType | null>(null);

export function ReactionsProvider({ children }: { children: ReactNode }) {
  const [reactions, setReactions] = useState<Map<string, ReactionEntry>>(new Map());
  const [myReaction, setMyReactionState] = useState<ReactionType>(null);

  const setReaction = useCallback((studentId: string, studentName: string, reaction: ReactionType) => {
    setReactions(prev => {
      const next = new Map(prev);
      if (reaction === null) {
        next.delete(studentId);
      } else {
        next.set(studentId, {
          studentId,
          studentName,
          reaction,
          timestamp: Date.now(),
        });
      }
      return next;
    });
  }, []);

  const clearReaction = useCallback((studentId: string) => {
    setReactions(prev => {
      const next = new Map(prev);
      next.delete(studentId);
      return next;
    });
  }, []);

  const clearAllReactions = useCallback(() => {
    setReactions(new Map());
  }, []);

  const setMyReaction = useCallback((reaction: ReactionType) => {
    setMyReactionState(reaction);
  }, []);

  const getActiveReactions = useCallback((): ReactionEntry[] => {
    return Array.from(reactions.values())
      .filter(r => r.reaction !== null)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [reactions]);

  // Setup IPC listener for reactions
  useEffect(() => {
    const cleanup = window.electronAPI.onReaction((data) => {
      // Find student name from connection context would be ideal,
      // but for now we'll use a placeholder or the ID
      setReaction(data.studentId, data.studentId, data.reaction as ReactionType);
    });

    return cleanup;
  }, [setReaction]);

  const value: ReactionsContextType = {
    reactions,
    myReaction,
    setReaction,
    clearReaction,
    clearAllReactions,
    setMyReaction,
    getActiveReactions,
  };

  return (
    <ReactionsContext.Provider value={value}>
      {children}
    </ReactionsContext.Provider>
  );
}

export function useReactions(): ReactionsContextType {
  const context = useContext(ReactionsContext);
  if (!context) {
    throw new Error('useReactions must be used within a ReactionsProvider');
  }
  return context;
}
