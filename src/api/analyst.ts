import { AnalysisRequest, AnalysisResponse, ChartData } from '@/types';
import { mockConversations } from '@/mocks/conversations';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const analyzeQuery = async (request: AnalysisRequest): Promise<AnalysisResponse> => {
  await delay(1500);

  const { type, query, filters } = request;

  let filteredConversations = [...mockConversations];

  if (filters?.excludeVoicemail) {
    filteredConversations = filteredConversations.filter(c => !c.isVoicemail);
  }

  if (filters?.dateRange) {
    const start = new Date(filters.dateRange.start);
    const end = new Date(filters.dateRange.end);
    filteredConversations = filteredConversations.filter(c => {
      const date = new Date(c.timestamp);
      return date >= start && date <= end;
    });
  }

  if (filters?.behaviors && filters.behaviors.length > 0) {
    filteredConversations = filteredConversations.filter(c =>
      c.behaviors.some(b => filters.behaviors!.includes(b))
    );
  }

  switch (type) {
    case 'chart':
      return generateChartResponse(query, filteredConversations);
    case 'report':
      return generateReportResponse(query, filteredConversations);
    case 'compare':
      return generateCompareResponse(query, filteredConversations);
    case 'survey':
      return generateSurveyResponse(query, filteredConversations);
    default:
      throw new Error('Unknown analysis type');
  }
};

const generateChartResponse = (query: string, conversations: any[]): AnalysisResponse => {
  const chartData: ChartData[] = [
    { name: 'Mar 15', value: 2, date: '2026-03-15' },
    { name: 'Mar 16', value: 1, date: '2026-03-16' },
    { name: 'Mar 17', value: 1, date: '2026-03-17' },
    { name: 'Mar 18', value: 1, date: '2026-03-18' },
    { name: 'Apr 1', value: 1, date: '2026-04-01' },
    { name: 'Apr 5', value: 1, date: '2026-04-05' },
    { name: 'Apr 10', value: 1, date: '2026-04-10' },
  ];

  return {
    id: `analysis-${Date.now()}`,
    type: 'chart',
    query,
    data: {
      chartType: 'line',
      data: chartData,
      title: 'Customer Engagement Over Time',
      xAxisLabel: 'Date',
      yAxisLabel: 'Number of Conversations',
    },
    generatedAt: new Date().toISOString(),
  };
};

const generateReportResponse = (query: string, conversations: any[]): AnalysisResponse => {
  const totalConversations = conversations.length;
  const avgDuration = conversations.reduce((sum, c) => sum + c.duration, 0) / totalConversations;
  const sentimentBreakdown = {
    positive: conversations.filter(c => c.sentiment === 'positive').length,
    negative: conversations.filter(c => c.sentiment === 'negative').length,
    neutral: conversations.filter(c => c.sentiment === 'neutral').length,
  };

  return {
    id: `analysis-${Date.now()}`,
    type: 'report',
    query,
    data: {
      summary: {
        totalConversations,
        avgDuration: Math.round(avgDuration),
        sentimentBreakdown,
      },
      insights: [
        `Analyzed ${totalConversations} conversations`,
        `Average conversation duration: ${Math.round(avgDuration)} seconds`,
        `${sentimentBreakdown.positive} positive, ${sentimentBreakdown.negative} negative, ${sentimentBreakdown.neutral} neutral`,
      ],
    },
    generatedAt: new Date().toISOString(),
  };
};

const generateCompareResponse = (query: string, conversations: any[]): AnalysisResponse => {
  const supportConvs = conversations.filter(c => c.category === 'Support');
  const salesConvs = conversations.filter(c => c.category === 'Sales');

  return {
    id: `analysis-${Date.now()}`,
    type: 'compare',
    query,
    data: {
      comparison: [
        {
          category: 'Support',
          count: supportConvs.length,
          avgDuration: Math.round(supportConvs.reduce((s, c) => s + c.duration, 0) / supportConvs.length),
        },
        {
          category: 'Sales',
          count: salesConvs.length,
          avgDuration: Math.round(salesConvs.reduce((s, c) => s + c.duration, 0) / salesConvs.length),
        },
      ],
    },
    generatedAt: new Date().toISOString(),
  };
};

const generateSurveyResponse = (query: string, conversations: any[]): AnalysisResponse => {
  return {
    id: `analysis-${Date.now()}`,
    type: 'survey',
    query,
    data: {
      responses: 156,
      avgRating: 4.2,
      distribution: {
        5: 78,
        4: 45,
        3: 20,
        2: 8,
        1: 5,
      },
    },
    generatedAt: new Date().toISOString(),
  };
};
