import { useState, useRef, useEffect } from 'react';
import { Box, Title, Text, Stack, Textarea, ActionIcon, Button, Paper, Menu, Switch, CloseButton, Loader, Image, Table } from '@mantine/core';
import { IconPlus, IconMessages, IconArrowUp, IconDatabase, IconLoader, IconChevronRight, IconX, IconChevronDown, IconShare, IconEdit, IconLayoutDashboard, IconDownload, IconCopy } from '@tabler/icons-react';
import {
  IconChartLine,
  IconReportAnalytics,
  IconGitCompare,
  IconClipboardList,
} from '@tabler/icons-react';

const quickActions = [
  { id: 'query', label: 'Query/Chart', icon: IconChartLine },
  { id: 'report', label: 'Report', icon: IconReportAnalytics },
  { id: 'compare', label: 'Compare', icon: IconGitCompare },
  { id: 'survey', label: 'Survey', icon: IconClipboardList },
];

const suggestionsByCategory: Record<string, string[]> = {
  query: [
    'Generate a chart of customer engagement last quarter.',
    'Provide a chart of monthly customer retention rates.',
    'Create a chart of top products purchased.',
    'Produce a chart of peak customer activity hours.',
    'Create a chart tracking customer satisfaction by region.',
  ],
  report: [
    'Create a comprehensive report on customer churn trends.',
    'Generate a quarterly performance summary for support teams.',
    'Produce a detailed analysis of customer feedback patterns.',
    'Build a report comparing product adoption rates.',
    'Summarize key metrics for executive stakeholders.',
  ],
  compare: [
    'Compare customer satisfaction between Q1 and Q2.',
    'Analyze performance differences across regional teams.',
    'Compare conversion rates before and after the campaign.',
    'Evaluate feature usage across different customer segments.',
    'Compare support ticket resolution times by category.',
  ],
  survey: [
    'Design a customer satisfaction survey for recent interactions.',
    'Create a post-purchase feedback survey.',
    'Generate a Net Promoter Score (NPS) survey.',
    'Build an employee satisfaction survey template.',
    'Create a product feature prioritization survey.',
  ],
};

type OutputType = 'chart' | 'comparison' | 'report' | null;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  artifact?: Artifact;
}

interface Artifact {
  id: string;
  title: string;
  type: 'chart' | 'report' | 'comparison';
  generationTime: string;
  imageUrl?: string;
}

const mockResponse = `I'd be happy to help you create a chart! To do that, I need a bit more information about what you'd like to visualize.

**Please tell me:**

1. What data would you like to see? (e.g., sales, revenue, customer counts, orders)
2. How should it be grouped or broken down? (e.g., by region, by month, by product category)
3. Any filters or time periods? (e.g., last quarter, this year, specific regions)
4. Chart type preference? (e.g., bar chart, line chart, pie chart) — optional, I can suggest one based on your data

For example, you could say:

- "Show me monthly revenue for 2024 as a line chart"
- "Create a bar chart of sales by region"
- "Pie chart of orders by product category"

What would you like to explore?`;

const mockTableData = [
  { date: '06/08/2026', conversations: 102830 },
  { date: '06/03/2026', conversations: 94774 },
  { date: '06/04/2026', conversations: 91638 },
  { date: '06/05/2026', conversations: 83828 },
  { date: '06/07/2026', conversations: 69333 },
  { date: '06/06/2026', conversations: 63487 },
  { date: '06/09/2026', conversations: 13137 },
];

const LandingPage = () => {
  const [activeCategory, setActiveCategory] = useState('query');
  const [inputValue, setInputValue] = useState('');
  const [hoveredPrompt, setHoveredPrompt] = useState<string | null>(null);
  const [conversationsEnabled, setConversationsEnabled] = useState(true);
  const [surveysEnabled, setSurveysEnabled] = useState(false);
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [showArtifactPanel, setShowArtifactPanel] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [showArtifactsDropdown, setShowArtifactsDropdown] = useState(false);
  const [panelWidth, setPanelWidth] = useState(66.67); // 2/3 of the page
  const [isResizing, setIsResizing] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePromptHover = (suggestion: string) => {
    // Generate a well-written prompt based on the suggestion
    const wellWrittenPrompt = `Can you ${suggestion.toLowerCase()}`;
    setHoveredPrompt(wellWrittenPrompt);
    setInputValue(wellWrittenPrompt);
  };

  const handlePromptLeave = () => {
    if (hoveredPrompt) {
      setInputValue('');
      setHoveredPrompt(null);
    }
  };

  const handlePromptClick = (suggestion: string) => {
    const wellWrittenPrompt = `Can you ${suggestion.toLowerCase()}`;
    setInputValue(wellWrittenPrompt);
    setHoveredPrompt(null);
    setShowSuggestions(false);

    // Set output type based on active category
    if (activeCategory === 'query') {
      setSelectedOutputType('chart');
    } else if (activeCategory === 'report') {
      setSelectedOutputType('report');
    } else if (activeCategory === 'compare') {
      setSelectedOutputType('comparison');
    }

    // Send the message
    setTimeout(() => handleSendMessage(wellWrittenPrompt), 100);
  };

  const simulateTyping = async (content: string, shouldGenerateArtifact = false) => {
    setIsTyping(true);
    setStreamingContent('');

    const words = content.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 40));
      setStreamingContent((prev) => prev + (i === 0 ? '' : ' ') + words[i]);
    }

    setIsTyping(false);
    const assistantMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);
    setStreamingContent('');

    // Generate artifact if needed
    if (shouldGenerateArtifact) {
      setTimeout(() => {
        generateArtifact();
      }, 500);
    }
  };

  const generateArtifact = async () => {
    setIsGenerating(true);
    setGenerationProgress('Generating chart...');

    // Simulate loading for 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const newArtifact: Artifact = {
      id: Date.now().toString(),
      title: 'Daily conversation count',
      type: selectedOutputType || 'chart',
      generationTime: '1m23s',
      imageUrl: 'https://www.figma.com/api/mcp/asset/e9672ded-f51d-4cce-a825-000be4d15862',
    };

    setArtifacts((prev) => [...prev, newArtifact]);
    setGenerationProgress(`Chart generated (${newArtifact.generationTime})`);

    // Add artifact card to messages
    const artifactMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      artifact: newArtifact,
    };
    setMessages((prev) => [...prev, artifactMessage]);

    setIsGenerating(false);
  };

  const handleArtifactClick = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setShowArtifactPanel(true);
  };

  const closeArtifactPanel = () => {
    setShowArtifactPanel(false);
    setTimeout(() => setSelectedArtifact(null), 300);
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Clear input and reset state
    setInputValue('');
    setSelectedOutputType(null);

    // Simulate AI response
    // If this is a follow-up with details (second user message - after initial request and AI's questions)
    // Generate artifact when there are already 2+ messages (user request + AI response)
    const shouldGenerateArtifact = messages.length >= 2;

    setTimeout(() => {
      simulateTyping(
        shouldGenerateArtifact
          ? 'Got it! Let me create that chart for you.'
          : mockResponse,
        shouldGenerateArtifact
      );
    }, 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOutputTypeSelect = (type: OutputType) => {
    setSelectedOutputType(type);
  };

  const getOutputTypeIcon = (type: OutputType) => {
    switch (type) {
      case 'chart':
        return IconChartLine;
      case 'comparison':
        return IconGitCompare;
      case 'report':
        return IconReportAnalytics;
      default:
        return null;
    }
  };

  const getOutputTypeLabel = (type: OutputType) => {
    switch (type) {
      case 'chart':
        return 'Chart';
      case 'comparison':
        return 'Comparison';
      case 'report':
        return 'Report';
      default:
        return '';
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, streamingContent]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((containerRect.right - e.clientX) / containerRect.width) * 100;

      // Constrain between 30% and 80%
      const constrainedWidth = Math.min(Math.max(newWidth, 30), 80);
      setPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <Box
      style={{
        height: '100%',
        backgroundColor: '#f8f9fa',
        padding: 0,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'stretch',
      }}
    >
      <Box
        ref={containerRef}
        style={{
          margin: 8,
          flex: 1,
          backgroundColor: '#f8f9fa',
          borderRadius: 24,
          boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.05), 0px 0px 48px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          border: '1px solid #dee5eb',
        }}
      >
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            transition: isResizing ? 'none' : 'width 0.3s ease',
            width: showArtifactPanel ? `${100 - panelWidth}%` : '100%',
          }}
        >
        {/* Chat Header */}
        <Box
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'transparent',
          }}
        >
          <Text size="lg" fw={550} c="#25252a">
            {isGenerating ? 'Building a chart' : 'New Chat'}
          </Text>
          <Box
            style={{
              width: 0,
              height: 22,
              borderRight: '1px solid #dee5eb',
            }}
          />
          <Box style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ActionIcon variant="subtle" color="gray" size={26} radius={4}>
              <IconPlus size={16} />
            </ActionIcon>
            <ActionIcon variant="subtle" color="gray" size={26} radius={4}>
              <IconMessages size={16} />
            </ActionIcon>
          </Box>
          {artifacts.length > 0 && (
            <>
              <Box style={{ flex: 1 }} />
              <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Menu
                  opened={showArtifactsDropdown}
                  onChange={setShowArtifactsDropdown}
                  position="bottom-start"
                >
                  <Menu.Target>
                    <Box
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        cursor: 'pointer',
                      }}
                      onClick={() => setShowArtifactsDropdown(!showArtifactsDropdown)}
                    >
                      <IconChartLine size={16} color="#25252a" />
                      <Text size="sm" fw={550} c="#25252a">
                        {artifacts.length}
                      </Text>
                      <IconChevronDown size={16} color="#25252a" />
                    </Box>
                  </Menu.Target>
                  <Menu.Dropdown>
                    {artifacts.map((artifact) => (
                      <Menu.Item
                        key={artifact.id}
                        onClick={() => handleArtifactClick(artifact)}
                      >
                        <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconChartLine size={16} />
                          <Text size="sm">{artifact.title}</Text>
                        </Box>
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconShare size={16} />}
                  styles={{
                    root: {
                      height: 28,
                      fontSize: 12,
                      fontWeight: 550,
                    },
                  }}
                >
                  Share
                </Button>
              </Box>
            </>
          )}
        </Box>

        {/* Main Content - Chat Messages */}
        <Box
          ref={chatContainerRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
          }}
        >
          <Stack
            align="center"
            gap={32}
            style={{
              width: '100%',
              maxWidth: 800,
              paddingTop: messages.length > 0 ? 0 : 220,
              paddingBottom: messages.length > 0 ? 24 : 0,
            }}
          >
            {/* Chat Messages */}
            {messages.length > 0 && (
              <Stack gap={10} style={{ width: '100%', alignItems: 'flex-end' }}>
                {messages.map((message) => (
                  <Box
                    key={message.id}
                    style={{
                      maxWidth: message.role === 'user' ? 500 : '100%',
                      width: message.role === 'assistant' || message.artifact ? '100%' : 'auto',
                      alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    {message.role === 'user' ? (
                      <Box
                        style={{
                          backgroundColor: '#e9ecef',
                          padding: '12px 16px',
                          borderRadius: '12px 12px 2px 12px',
                        }}
                      >
                        <Text size="sm" c="#25252a" fw={425} style={{ lineHeight: 1.55 }}>
                          {message.content}
                        </Text>
                      </Box>
                    ) : message.artifact ? (
                      <Paper
                        style={{
                          backgroundColor: '#fff',
                          border: '2px solid #205ae3',
                          borderRadius: 8,
                          padding: 16,
                          cursor: 'pointer',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                        onClick={() => handleArtifactClick(message.artifact!)}
                      >
                        <Box style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                          <Box
                            style={{
                              width: 41,
                              height: 41,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconChartLine size={28} color="#205ae3" />
                          </Box>
                          <Box style={{ flex: 1 }}>
                            <Text size="sm" fw={650} c="#25252a">
                              {message.artifact.title}
                            </Text>
                            <Text size="xs" fw={550} c="#5d666f">
                              Chart
                            </Text>
                          </Box>
                        </Box>
                      </Paper>
                    ) : (
                      <Box style={{ paddingTop: 10 }}>
                        <Text
                          size="sm"
                          c="#25252a"
                          fw={425}
                          style={{ lineHeight: 1.55, whiteSpace: 'pre-wrap' }}
                        >
                          {message.content}
                        </Text>
                      </Box>
                    )}
                  </Box>
                ))}

                {/* Streaming message */}
                {isTyping && streamingContent && (
                  <Box style={{ width: '100%', paddingTop: 10 }}>
                    <Text
                      size="sm"
                      c="#25252a"
                      fw={425}
                      style={{ lineHeight: 1.55, whiteSpace: 'pre-wrap' }}
                    >
                      {streamingContent}
                    </Text>
                  </Box>
                )}

                {/* Typing indicator */}
                {isTyping && !streamingContent && (
                  <Box style={{ paddingTop: 10 }}>
                    <Loader size="sm" color="gray" />
                  </Box>
                )}

                {/* Generation progress */}
                {(isGenerating || generationProgress) && (
                  <Box style={{ width: '100%' }}>
                    <Box style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <Box
                        style={{
                          width: 0,
                          height: '100%',
                          borderLeft: '1px solid #dee5eb',
                        }}
                      />
                      <Box style={{ flex: 1 }}>
                        <Text
                          size="xs"
                          fw={550}
                          style={{
                            background: 'linear-gradient(90deg, #7f7f90 11.058%, #5d666f 90.865%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: 12,
                          }}
                        >
                          {generationProgress}
                        </Text>
                        {isGenerating && (
                          <Box style={{ marginTop: 12 }}>
                            <Loader size="sm" color="gray" />
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                )}
              </Stack>
            )}

            {/* Welcome Message */}
            {messages.length === 0 && (
              <>
                <Stack align="center" gap={6}>
                  <Title order={1} size={24} fw={550} c="black">
                    Welcome, Karen
                  </Title>
                  <Text size="lg" c="#25252a" ta="center">
                    Perform deep research and root cause analysis on your customer data.
                  </Text>
                </Stack>

                {/* Input Area - Centered for welcome state */}
                <Paper
              shadow="0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)"
              radius={16}
              style={{
                width: '100%',
                border: '1px solid #dee5eb',
                overflow: 'hidden',
                backgroundColor: 'white',
              }}
            >
              <Box style={{ padding: '12px 16px 0 16px', minHeight: 80 }}>
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask any question about filtered conversations."
                  variant="unstyled"
                  autosize
                  minRows={2}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.currentTarget.value)}
                  onKeyDown={handleKeyPress}
                  styles={{
                    input: {
                      fontSize: 16,
                      color: hoveredPrompt ? '#25252a' : '#25252a',
                      lineHeight: 1.55,
                      '::placeholder': {
                        color: '#a1b0b7',
                      },
                    },
                  }}
                />
              </Box>
              <Box
                style={{
                  padding: '0 16px 12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                <Box style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
                  <Menu shadow="md" position="top-start" offset={4}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size={26} radius={4}>
                        <IconPlus size={16} />
                      </ActionIcon>
                    </Menu.Target>
                  <Menu.Dropdown
                    style={{
                      padding: 0,
                      borderRadius: 8,
                      boxShadow: '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                    }}
                  >
                    <Menu
                      trigger="click-hover"
                      position="right-end"
                      offset={4}
                      openDelay={0}
                      closeDelay={100}
                    >
                      <Menu.Target>
                        <Menu.Item
                          leftSection={<IconDatabase size={16} />}
                          rightSection={<IconChevronRight size={16} />}
                          styles={{
                            item: {
                              padding: '8px 12px',
                              fontSize: 14,
                              '&:hover': {
                                backgroundColor: '#f8f9fa',
                              },
                            },
                          }}
                        >
                          Data Source
                        </Menu.Item>
                      </Menu.Target>
                      <Menu.Dropdown
                        style={{
                          padding: 0,
                          borderRadius: 8,
                          boxShadow: '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                        }}
                      >
                        <Box
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <Text size="sm" fw={425} c="#25252a">
                            Conversations
                          </Text>
                          <Switch
                            checked={conversationsEnabled}
                            onChange={(e) => setConversationsEnabled(e.currentTarget.checked)}
                            size="sm"
                          />
                        </Box>
                        <Box
                          style={{
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}
                        >
                          <Text size="sm" fw={425} c="#25252a">
                            Surveys
                          </Text>
                          <Switch
                            checked={surveysEnabled}
                            onChange={(e) => setSurveysEnabled(e.currentTarget.checked)}
                            size="sm"
                          />
                        </Box>
                      </Menu.Dropdown>
                    </Menu>

                    <Menu
                      trigger="click-hover"
                      position="right-end"
                      offset={4}
                      openDelay={0}
                      closeDelay={100}
                    >
                      <Menu.Target>
                        <Menu.Item
                          leftSection={<IconLoader size={16} />}
                          rightSection={<IconChevronRight size={16} />}
                          styles={{
                            item: {
                              padding: '8px 12px',
                              fontSize: 14,
                              '&:hover': {
                                backgroundColor: '#f8f9fa',
                              },
                            },
                          }}
                        >
                          Analyze
                        </Menu.Item>
                      </Menu.Target>
                      <Menu.Dropdown
                        style={{
                          padding: 0,
                          borderRadius: 8,
                          boxShadow: '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                        }}
                      >
                        <Menu.Item
                          leftSection={<IconChartLine size={16} />}
                          onClick={() => handleOutputTypeSelect('chart')}
                          styles={{
                            item: {
                              padding: '8px 12px',
                              fontSize: 14,
                            },
                          }}
                        >
                          Chart
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconGitCompare size={16} />}
                          onClick={() => handleOutputTypeSelect('comparison')}
                          styles={{
                            item: {
                              padding: '8px 12px',
                              fontSize: 14,
                            },
                          }}
                        >
                          Comparison
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconReportAnalytics size={16} />}
                          onClick={() => handleOutputTypeSelect('report')}
                          styles={{
                            item: {
                              padding: '8px 12px',
                              fontSize: 14,
                            },
                          }}
                        >
                          Deep Research
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Menu.Dropdown>
                </Menu>
                {selectedOutputType && (
                  <Button
                    variant="default"
                    leftSection={
                      getOutputTypeIcon(selectedOutputType) &&
                      (() => {
                        const Icon = getOutputTypeIcon(selectedOutputType)!;
                        return <Icon size={16} />;
                      })()
                    }
                    rightSection={
                      <CloseButton
                        size="xs"
                        icon={<IconX size={12} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOutputType(null);
                        }}
                      />
                    }
                    size="compact-sm"
                    styles={{
                      root: {
                        height: 26,
                        borderRadius: 4,
                        border: '1px solid #dee5eb',
                        backgroundColor: '#fff',
                        color: '#25252a',
                        paddingLeft: 8,
                        paddingRight: 4,
                        fontSize: 14,
                        fontWeight: 550,
                      },
                      section: {
                        marginRight: 4,
                      },
                    }}
                  >
                    {getOutputTypeLabel(selectedOutputType)}
                  </Button>
                )}
                </Box>
                <ActionIcon
                  size={26}
                  radius="xl"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  style={{
                    backgroundColor: inputValue.trim() && !isTyping ? '#205ae3' : '#ebf0f5',
                    color: inputValue.trim() && !isTyping ? '#fff' : '#5d666f',
                    cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s, color 0.2s',
                  }}
                >
                  <IconArrowUp size={16} />
                </ActionIcon>
              </Box>
            </Paper>

                {/* Quick Actions and Suggestions */}
                <Stack align="center" gap={12}>
                {/* Quick Action Buttons */}
                <Box style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {quickActions.map((action) => (
                    <Button
                      key={action.id}
                      variant="default"
                      leftSection={<action.icon size={16} />}
                      onClick={() => setActiveCategory(action.id)}
                      styles={{
                        root: {
                          borderRadius: 9999,
                          border: '1px solid #dee5eb',
                          backgroundColor: activeCategory === action.id ? '#ebf4ff' : '#fff',
                          color: activeCategory === action.id ? '#1971c2' : '#25252a',
                          boxShadow: 'none',
                          '&:hover': {
                            backgroundColor: activeCategory === action.id ? '#d0ebff' : '#f8f9fa',
                          },
                        },
                        section: {
                          color: activeCategory === action.id ? '#1971c2' : 'inherit',
                        },
                      }}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Box>

                {/* Suggestions */}
                <Paper
                  shadow="0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)"
                  radius={8}
                  style={{
                    width: '100%',
                    maxWidth: 503,
                    overflow: 'hidden',
                    backgroundColor: 'white',
                  }}
                >
                  <Stack gap={0}>
                    {suggestionsByCategory[activeCategory].map((suggestion, index) => (
                      <Box
                        key={index}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8f9fa';
                          handlePromptHover(suggestion);
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          handlePromptLeave();
                        }}
                        onClick={() => handlePromptClick(suggestion)}
                      >
                        <Text size="sm" c="#25252a" style={{ lineHeight: 1.55 }}>
                          {suggestion}
                        </Text>
                      </Box>
                    ))}
                  </Stack>
                </Paper>
                </Stack>
              </>
            )}
          </Stack>
        </Box>

        {/* Sticky Input Area - Only shown when chat has started */}
        {messages.length > 0 && (
          <Box
            style={{
              padding: '0 24px 24px 24px',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Paper
              shadow="0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)"
              radius={16}
              style={{
                width: '100%',
                maxWidth: 800,
                border: '1px solid #dee5eb',
                overflow: 'hidden',
                backgroundColor: 'white',
              }}
            >
              <Box style={{ padding: '12px 16px 0 16px', minHeight: 80 }}>
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask any question about filtered conversations."
                  variant="unstyled"
                  autosize
                  minRows={2}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.currentTarget.value)}
                  onKeyDown={handleKeyPress}
                  styles={{
                    input: {
                      fontSize: 16,
                      color: '#25252a',
                      lineHeight: 1.55,
                      '::placeholder': {
                        color: '#a1b0b7',
                      },
                    },
                  }}
                />
              </Box>
              <Box
                style={{
                  padding: '0 16px 12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                }}
              >
                <Box style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
                  <Menu shadow="md" position="top-start" offset={4}>
                    <Menu.Target>
                      <ActionIcon variant="subtle" color="gray" size={26} radius={4}>
                        <IconPlus size={16} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown
                      style={{
                        padding: 0,
                        borderRadius: 8,
                        boxShadow: '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                      }}
                    >
                      <Menu
                        trigger="click-hover"
                        position="right-end"
                        offset={4}
                        openDelay={0}
                        closeDelay={100}
                      >
                        <Menu.Target>
                          <Menu.Item
                            leftSection={<IconDatabase size={16} />}
                            rightSection={<IconChevronRight size={16} />}
                            styles={{
                              item: {
                                padding: '8px 12px',
                                fontSize: 14,
                                '&:hover': {
                                  backgroundColor: '#f8f9fa',
                                },
                              },
                            }}
                          >
                            Data Source
                          </Menu.Item>
                        </Menu.Target>
                        <Menu.Dropdown
                          style={{
                            padding: 0,
                            borderRadius: 8,
                            boxShadow: '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                          }}
                        >
                          <Box
                            style={{
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <Text size="sm" fw={425} c="#25252a">
                              Conversations
                            </Text>
                            <Switch
                              checked={conversationsEnabled}
                              onChange={(e) => setConversationsEnabled(e.currentTarget.checked)}
                              size="sm"
                            />
                          </Box>
                          <Box
                            style={{
                              padding: '8px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                            }}
                          >
                            <Text size="sm" fw={425} c="#25252a">
                              Surveys
                            </Text>
                            <Switch
                              checked={surveysEnabled}
                              onChange={(e) => setSurveysEnabled(e.currentTarget.checked)}
                              size="sm"
                            />
                          </Box>
                        </Menu.Dropdown>
                      </Menu>

                      <Menu
                        trigger="click-hover"
                        position="right-end"
                        offset={4}
                        openDelay={0}
                        closeDelay={100}
                      >
                        <Menu.Target>
                          <Menu.Item
                            leftSection={<IconLoader size={16} />}
                            rightSection={<IconChevronRight size={16} />}
                            styles={{
                              item: {
                                padding: '8px 12px',
                                fontSize: 14,
                                '&:hover': {
                                  backgroundColor: '#f8f9fa',
                                },
                              },
                            }}
                          >
                            Analyze
                          </Menu.Item>
                        </Menu.Target>
                        <Menu.Dropdown
                          style={{
                            padding: 0,
                            borderRadius: 8,
                            boxShadow: '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                          }}
                        >
                          <Menu.Item
                            leftSection={<IconChartLine size={16} />}
                            onClick={() => handleOutputTypeSelect('chart')}
                            styles={{
                              item: {
                                padding: '8px 12px',
                                fontSize: 14,
                              },
                            }}
                          >
                            Chart
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconGitCompare size={16} />}
                            onClick={() => handleOutputTypeSelect('comparison')}
                            styles={{
                              item: {
                                padding: '8px 12px',
                                fontSize: 14,
                              },
                            }}
                          >
                            Comparison
                          </Menu.Item>
                          <Menu.Item
                            leftSection={<IconReportAnalytics size={16} />}
                            onClick={() => handleOutputTypeSelect('report')}
                            styles={{
                              item: {
                                padding: '8px 12px',
                                fontSize: 14,
                              },
                            }}
                          >
                            Deep Research
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Menu.Dropdown>
                  </Menu>
                  {selectedOutputType && (
                    <Button
                      variant="default"
                      leftSection={
                        getOutputTypeIcon(selectedOutputType) &&
                        (() => {
                          const Icon = getOutputTypeIcon(selectedOutputType)!;
                          return <Icon size={16} />;
                        })()
                      }
                      rightSection={
                        <CloseButton
                          size="xs"
                          icon={<IconX size={12} />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOutputType(null);
                          }}
                        />
                      }
                      size="compact-sm"
                      styles={{
                        root: {
                          height: 26,
                          borderRadius: 4,
                          border: '1px solid #dee5eb',
                          backgroundColor: '#fff',
                          color: '#25252a',
                          paddingLeft: 8,
                          paddingRight: 4,
                          fontSize: 14,
                          fontWeight: 550,
                        },
                        section: {
                          marginRight: 4,
                        },
                      }}
                    >
                      {getOutputTypeLabel(selectedOutputType)}
                    </Button>
                  )}
                </Box>
                <ActionIcon
                  size={26}
                  radius="xl"
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isTyping}
                  style={{
                    backgroundColor: inputValue.trim() && !isTyping ? '#205ae3' : '#ebf0f5',
                    color: inputValue.trim() && !isTyping ? '#fff' : '#5d666f',
                    cursor: inputValue.trim() && !isTyping ? 'pointer' : 'not-allowed',
                    transition: 'background-color 0.2s, color 0.2s',
                  }}
                >
                  <IconArrowUp size={16} />
                </ActionIcon>
              </Box>
            </Paper>
          </Box>
        )}
        </Box>

        {/* Right Artifact Panel */}
        {showArtifactPanel && selectedArtifact && (
          <>
            {/* Resize Handle */}
            <Box
              onMouseDown={() => setIsResizing(true)}
              style={{
                width: 4,
                cursor: 'col-resize',
                backgroundColor: 'transparent',
                position: 'relative',
                zIndex: 10,
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#205ae3';
              }}
              onMouseLeave={(e) => {
                if (!isResizing) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            />
            <Box
              style={{
                width: `${panelWidth}%`,
                backgroundColor: '#fff',
                borderLeft: '1px solid #dee5eb',
                borderTop: '1px solid #dee5eb',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideIn 0.3s ease-out',
                transition: isResizing ? 'none' : 'width 0.3s ease',
              }}
            >
            {/* Panel Header */}
            <Box
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #dee5eb',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                backgroundColor: '#fff',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
              }}
            >
              <Box
                style={{
                  backgroundColor: '#f1f5ff',
                  padding: '0 12px',
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  borderRadius: 9999,
                }}
              >
                <Text size="lg" fw={550} c="#25252a">
                  Chart
                </Text>
              </Box>
              <Text size="lg" fw={550} c="#25252a">
                {selectedArtifact.title}
              </Text>
              <Box style={{ flex: 1 }} />
              <Box style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconEdit size={16} />}
                  styles={{
                    root: {
                      height: 28,
                      fontSize: 12,
                      fontWeight: 550,
                      borderRadius: 9999,
                    },
                  }}
                >
                  Edit in Chart builder
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconLayoutDashboard size={16} />}
                  styles={{
                    root: {
                      height: 28,
                      fontSize: 12,
                      fontWeight: 550,
                      borderRadius: 9999,
                    },
                  }}
                >
                  Add to Dashboard
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  leftSection={<IconDownload size={16} />}
                  styles={{
                    root: {
                      height: 28,
                      fontSize: 12,
                      fontWeight: 550,
                      borderRadius: 9999,
                    },
                  }}
                >
                  Download
                </Button>
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={30}
                  radius={8}
                  onClick={closeArtifactPanel}
                >
                  <IconX size={18} />
                </ActionIcon>
              </Box>
            </Box>

            {/* Panel Content */}
            <Box
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 40,
              }}
            >
              {selectedArtifact.imageUrl && (
                <Image
                  src={selectedArtifact.imageUrl}
                  alt={selectedArtifact.title}
                  style={{
                    width: '100%',
                    maxWidth: 895,
                    borderRadius: 8,
                  }}
                />
              )}

              {/* Data Table */}
              <Box style={{ width: '100%', maxWidth: 1073 }}>
                <Table
                  horizontalSpacing="lg"
                  verticalSpacing="md"
                  styles={{
                    table: {
                      borderCollapse: 'collapse',
                      width: '100%',
                    },
                    th: {
                      backgroundColor: '#f8f9fa',
                      color: '#25252a',
                      fontSize: 14,
                      fontWeight: 550,
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee5eb',
                      textAlign: 'center',
                    },
                    td: {
                      padding: '12px 16px',
                      borderBottom: '1px solid #dee5eb',
                      fontSize: 14,
                      color: '#25252a',
                      textAlign: 'center',
                    },
                  }}
                >
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ textAlign: 'left' }}></Table.Th>
                      {mockTableData.map((item) => (
                        <Table.Th key={item.date}>{item.date}</Table.Th>
                      ))}
                      <Table.Th>Total</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    <Table.Tr>
                      <Table.Td>
                        <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <IconCopy size={16} color="#25252a" />
                          <Text size="sm" c="#25252a">
                            Conversations
                          </Text>
                        </Box>
                      </Table.Td>
                      {mockTableData.map((item) => (
                        <Table.Td key={item.date}>
                          {item.conversations.toLocaleString()}
                        </Table.Td>
                      ))}
                      <Table.Td>
                        {mockTableData.reduce((sum, item) => sum + item.conversations, 0).toLocaleString()}
                      </Table.Td>
                    </Table.Tr>
                  </Table.Tbody>
                </Table>
              </Box>
            </Box>
            </Box>
          </>
        )}
      </Box>
    </Box>
  );
};

export default LandingPage;
