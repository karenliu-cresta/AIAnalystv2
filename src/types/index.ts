export interface Conversation {
  id: string;
  timestamp: string;
  duration: number;
  agentId: string;
  customerId: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: string;
  tags: string[];
  behaviors: string[];
  isVoicemail: boolean;
  transcript?: string;
}

export interface CustomerData {
  customerId: string;
  name: string;
  email: string;
  segment: string;
  lifetime_value: number;
}

export interface SurveyResponse {
  id: string;
  conversationId: string;
  rating: number;
  feedback: string;
  timestamp: string;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

export type QueryType = 'chart' | 'report' | 'compare' | 'survey';

export interface AnalysisRequest {
  query: string;
  type: QueryType;
  filters?: {
    dateRange?: { start: string; end: string };
    teams?: string[];
    users?: string[];
    behaviors?: string[];
    duration?: { min: number; max: number };
    excludeVoicemail?: boolean;
  };
}

export interface AnalysisResponse {
  id: string;
  type: QueryType;
  query: string;
  data: any;
  generatedAt: string;
}
