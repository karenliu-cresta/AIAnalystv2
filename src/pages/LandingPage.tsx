import { useState } from 'react';
import { Container, Stack, Title, Text, Textarea, Button, Group } from '@mantine/core';
import { IconChartLine, IconFileText, IconArrowsLeftRight, IconClipboardList } from '@tabler/icons-react';
import { useAnalystStore } from '@/store/useAnalystStore';
import { analyzeQuery } from '@/api/analyst';

const SUGGESTED_PROMPTS = [
  'Generate a chart of customer engagement last quarter',
  'Provide a chart of monthly customer retention rates',
  'Create a chart of top products purchased',
  'Produce a chart of peak customer activity hours',
  'Create a chart tracking customer satisfaction by region',
];

const LandingPage = () => {
  const [inputValue, setInputValue] = useState('');
  const { selectedType, setSelectedType, addAnalysis, setIsLoading, isLoading } = useAnalystStore();

  const handleSubmit = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    try {
      const response = await analyzeQuery({
        query: inputValue,
        type: selectedType,
        filters: {
          excludeVoicemail: true,
        },
      });
      addAnalysis(response);
      console.log('Analysis response:', response);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  return (
    <Container size="lg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100%', paddingTop: 40, paddingBottom: 40 }}>
      <Stack align="center" gap="xl" w="100%" maw={800}>
        <Stack align="center" gap="sm">
          <Title order={1} size="h2">
            Welcome, Karen
          </Title>
          <Text c="dimmed" size="sm">
            Perform deep research and root cause analysis on your customer data.
          </Text>
        </Stack>

        <Stack w="100%" gap="md">
          <Textarea
            placeholder="Ask any question about filtered conversations."
            value={inputValue}
            onChange={(e) => setInputValue(e.currentTarget.value)}
            minRows={4}
            size="md"
            styles={{
              input: {
                fontSize: '16px',
              },
            }}
          />

          <Group justify="center" gap="xs">
            <Button
              variant={selectedType === 'chart' ? 'filled' : 'light'}
              leftSection={<IconChartLine size={18} />}
              onClick={() => setSelectedType('chart')}
            >
              Query/Chart
            </Button>
            <Button
              variant={selectedType === 'report' ? 'filled' : 'light'}
              leftSection={<IconFileText size={18} />}
              onClick={() => setSelectedType('report')}
            >
              Report
            </Button>
            <Button
              variant={selectedType === 'compare' ? 'filled' : 'light'}
              leftSection={<IconArrowsLeftRight size={18} />}
              onClick={() => setSelectedType('compare')}
            >
              Compare
            </Button>
            <Button
              variant={selectedType === 'survey' ? 'filled' : 'light'}
              leftSection={<IconClipboardList size={18} />}
              onClick={() => setSelectedType('survey')}
            >
              Survey
            </Button>
          </Group>

          <Button
            size="md"
            onClick={handleSubmit}
            loading={isLoading}
            disabled={!inputValue.trim()}
          >
            Generate Analysis
          </Button>
        </Stack>

        <Stack w="100%" gap="xs" align="flex-start">
          <Group gap="xs" align="center">
            <IconChartLine size={16} />
            <Text size="sm" fw={500}>
              Chart
            </Text>
          </Group>
          {SUGGESTED_PROMPTS.map((prompt, index) => (
            <Button
              key={index}
              variant="subtle"
              size="sm"
              onClick={() => handleSuggestedPrompt(prompt)}
              styles={{
                root: {
                  height: 'auto',
                  padding: '8px 12px',
                },
                label: {
                  whiteSpace: 'normal',
                  textAlign: 'left',
                },
              }}
            >
              {prompt}
            </Button>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
};

export default LandingPage;
