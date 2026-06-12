import { create } from 'zustand';
import { AnalysisRequest, AnalysisResponse } from '@/types';

interface AnalystState {
  currentQuery: string;
  selectedType: 'chart' | 'report' | 'compare' | 'survey';
  analyses: AnalysisResponse[];
  isLoading: boolean;
  // True while an artifact panel is open — collapses the left nav to icons.
  artifactOpen: boolean;
  // Name of the active session, surfaced in the top breadcrumb. Empty until a
  // conversation has started.
  sessionTitle: string;

  setCurrentQuery: (query: string) => void;
  setSelectedType: (type: 'chart' | 'report' | 'compare' | 'survey') => void;
  addAnalysis: (analysis: AnalysisResponse) => void;
  setIsLoading: (loading: boolean) => void;
  setArtifactOpen: (open: boolean) => void;
  setSessionTitle: (title: string) => void;
  clearAnalyses: () => void;
}

export const useAnalystStore = create<AnalystState>((set) => ({
  currentQuery: '',
  selectedType: 'chart',
  analyses: [],
  isLoading: false,
  artifactOpen: false,
  sessionTitle: '',

  setCurrentQuery: (query) => set({ currentQuery: query }),
  setSelectedType: (type) => set({ selectedType: type }),
  addAnalysis: (analysis) => set((state) => ({
    analyses: [...state.analyses, analysis]
  })),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setArtifactOpen: (open) => set({ artifactOpen: open }),
  setSessionTitle: (title) => set({ sessionTitle: title }),
  clearAnalyses: () => set({ analyses: [] }),
}));
