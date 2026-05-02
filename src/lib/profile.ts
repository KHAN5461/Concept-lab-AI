import { useState, useEffect } from 'react';

export type SubjectProgress = {
  exp: number;
  level: number;
};

export type UserProfile = {
  name: string;
  totalExp: number;
  level: number;
  quizzesCompleted: number;
  subjects: {
    physics: SubjectProgress;
    chemistry: SubjectProgress;
    math: SubjectProgress;
  };
  strengths: string[];
  weaknesses: string[];
  bio: string;
  learningGoal: string;
  dailyStreak: number;
  lastActiveAt: number;
};

export const defaultProfile: UserProfile = {
  name: 'Explorer',
  totalExp: 0,
  level: 1,
  quizzesCompleted: 0,
  subjects: {
    physics: { exp: 0, level: 1 },
    chemistry: { exp: 0, level: 1 },
    math: { exp: 0, level: 1 },
  },
  strengths: ['Curiosity'],
  weaknesses: [],
  bio: '',
  learningGoal: '',
  dailyStreak: 0,
  lastActiveAt: Date.now(),
};

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile>(() => {
    try {
      const saved = localStorage.getItem('conceptlab_profile');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse user profile');
    }
    return defaultProfile;
  });

  useEffect(() => {
    try {
      localStorage.setItem('conceptlab_profile', JSON.stringify(profile));
    } catch (e) {}
  }, [profile]);

  const addExp = (subject: 'physics' | 'chemistry' | 'math' | 'general', amount: number) => {
    setProfile(prev => {
      const newExp = prev.totalExp + amount;
      const newLevel = Math.floor(newExp / 100) + 1; // 100 exp per level

      const updatedSubjects = { ...prev.subjects };
      if (subject !== 'general') {
        const subjNewExp = updatedSubjects[subject].exp + amount;
        updatedSubjects[subject] = {
          exp: subjNewExp,
          level: Math.floor(subjNewExp / 50) + 1, // 50 exp per subj level
        };
      }

      return {
        ...prev,
        totalExp: newExp,
        level: newLevel,
        subjects: updatedSubjects
      };
    });
  };

  const addQuizCompleted = () => {
    setProfile(prev => ({
      ...prev,
      quizzesCompleted: prev.quizzesCompleted + 1,
      totalExp: prev.totalExp + 20, // 20 bonus exp for quiz
      level: Math.floor((prev.totalExp + 20) / 100) + 1
    }));
  };

  // Simple heuristic based on analyzing messages would be better, but for now we manually add strengths
  const updateTraits = (strengths: string[], weaknesses: string[]) => {
    setProfile(prev => ({
      ...prev,
      strengths: Array.from(new Set([...prev.strengths, ...strengths])).slice(0, 5),
      weaknesses: Array.from(new Set([...prev.weaknesses, ...weaknesses])).slice(0, 5),
    }));
  };

  const updateProfileDetails = (details: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...details }));
  };

  return { profile, setProfile, addExp, addQuizCompleted, updateTraits, updateProfileDetails };
}
