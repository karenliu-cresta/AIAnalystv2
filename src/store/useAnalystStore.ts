import { create } from 'zustand';
import { AnalysisRequest, AnalysisResponse } from '@/types';

interface AnalystState {
  currentQuery: string;
  selectedType: 'chart' | 'report' | 'compare' | 'survey';
  analyses: AnalysisResponse[];
  isLoading: boolean;

  setCurrentQuery: (query: string) => void;
  setSelectedType: (type: 'chart' | 'report' | 'compare' | 'survey') => void;
  addAnalysis: (analysis: AnalysisResponse) => void;
  setIsLoading: (loading: boolean) => void;
  clearAnalyses: () => void;
}

export const useAnalystStore = create<AnalystState>((set) => ({
  currentQuery: '',
  selectedType: 'chart',
  analyses: [],
  isLoading: false,

  setCurrentQuery: (query) => set({ currentQuery: query }),
  setSelectedType: (type) => set({ selectedType: type }),
  addAnalysis: (analysis) => set((state) => ({
    analyses: [...state.analyses, analysis]
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearAnalyses: () => set({ analyses: [] }),
}));
