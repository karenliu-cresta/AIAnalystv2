import { Box, Stack, UnstyledButton, Text, Collapse } from '@mantine/core';
import {
  IconChartLine,
  IconListSearch,
  IconMessage2,
  IconRobot,
  IconUsers,
  IconReportAnalytics,
  IconShieldLock,
  IconTool,
  IconChevronDown,
  IconChevronLeft,
  IconCircleSquare,
} from '@tabler/icons-react';
import { useState } from 'react';

const navSections = [
  {
    id: 'insights',
    label: 'Insights',
    icon: IconChartLine,
    items: [
      'Performance',
      'Assistance',
      'Leaderboard',
      'Dashboard Builder',
      'AI Analyst',
      'Outcome Insights',
    ],
    defaultOpen: true,
  },
  { id: 'discovery', label: 'Discovery', icon: IconListSearch, items: [] },
  { id: 'conversations', label: 'Conversations', icon: IconMessage2, items: [] },
  { id: 'ai-agent', label: 'AI Agent', icon: IconRobot, items: [] },
  { id: 'opera', label: 'Opera', icon: IconCircleSquare, items: [] },
  { id: 'coaching', label: 'Coaching', icon: IconUsers, items: [] },
  { id: 'qm', label: 'QM', icon: IconReportAnalytics, items: [] },
  { id: 'admin', label: 'Admin', icon: IconShieldLock, items: [] },
  { id: 'system-config', label: 'System Config', icon: IconTool, items: [] },
];

const NavMenu = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    insights: true,
  });
  const [activeItem, setActiveItem] = useState('AI Analyst');

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo */}
      <Box
        style={{
          height: 52,
          padding: '4px 16px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Text size="sm" fw={700} c="#25252a" style={{ letterSpacing: '0.1em' }}>
          CRESTA
        </Text>
      </Box>

      {/* Navigation Items */}
      <Box
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '6px 0',
        }}
      >
        <Stack gap={0}>
          {navSections.map((section) => (
            <Box key={section.id}>
              {/* Section Header */}
              <UnstyledButton
                onClick={() => section.items.length > 0 && toggleSection(section.id)}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: section.items.length > 0 ? 'pointer' : 'default',
                }}
              >
                {section.icon && <section.icon size={16} color="#5d666f" />}
                <Text
                  size="xs"
                  fw={600}
                  c="#5d666f"
                  style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.5px' }}
                >
                  {section.label}
                </Text>
                {section.items.length > 0 && (
                  <IconChevronDown
                    size={14}
                    color="#5d666f"
                    style={{
                      transform: openSections[section.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s',
                    }}
                  />
                )}
              </UnstyledButton>

              {/* Section Items */}
              {section.items.length > 0 && (
                <Collapse in={openSections[section.id]}>
                  <Stack gap={4} style={{ paddingLeft: 40, paddingBottom: 24 }}>
                    {section.items.map((item) => (
                      <UnstyledButton
                        key={item}
                        onClick={() => setActiveItem(item)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 12,
                          backgroundColor: activeItem === item ? '#fff' : 'transparent',
                          boxShadow:
                            activeItem === item ? '0px 4px 9px rgba(0, 0, 0, 0.05)' : 'none',
                        }}
                      >
                        <Text
                          size="sm"
                          fw={500}
                          c={activeItem === item ? '#25252a' : '#5d666f'}
                        >
                          {item}
                        </Text>
                      </UnstyledButton>
                    ))}
                  </Stack>
                </Collapse>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Collapse Button */}
      <Box
        style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <UnstyledButton
          style={{
            padding: '8px',
          }}
        >
          <IconChevronLeft size={18} color="#5d666f" />
        </UnstyledButton>
      </Box>
    </Box>
  );
};

export default NavMenu;
