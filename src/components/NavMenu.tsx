import { Stack, Button, Text, Collapse, Box } from '@mantine/core';
import { useState } from 'react';
import {
  IconChartLine,
  IconChevronDown,
  IconChevronLeft,
  IconListSearch,
  IconMessage2,
  IconRobot,
  IconAperture,
  IconUsers,
  IconReportAnalytics,
  IconShieldLock,
  IconTool,
} from '@tabler/icons-react';

interface NavMenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  children?: { label: string; path: string }[];
}

const menuItems: NavMenuItem[] = [
  {
    id: 'insights',
    label: 'Insights',
    icon: <IconChartLine size={16} />,
    children: [
      { label: 'Performance', path: '/performance' },
      { label: 'Assistance', path: '/assistance' },
      { label: 'Leaderboard', path: '/leaderboard' },
      { label: 'Dashboard Builder', path: '/dashboard-builder' },
      { label: 'AI Analyst', path: '/ai-analyst' },
      { label: 'Outcome Insights', path: '/outcome-insights' },
    ],
  },
  {
    id: 'discovery',
    label: 'Discovery',
    icon: <IconListSearch size={16} />,
  },
  {
    id: 'conversations',
    label: 'Conversations',
    icon: <IconMessage2 size={16} />,
  },
  {
    id: 'ai-agent',
    label: 'AI Agent',
    icon: <IconRobot size={16} />,
  },
  {
    id: 'opera',
    label: 'Opera',
    icon: <IconAperture size={16} />,
  },
  {
    id: 'coaching',
    label: 'Coaching',
    icon: <IconUsers size={16} />,
  },
  {
    id: 'qm',
    label: 'QM',
    icon: <IconReportAnalytics size={16} />,
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: <IconShieldLock size={16} />,
  },
  {
    id: 'system-config',
    label: 'System Config',
    icon: <IconTool size={16} />,
  },
];

const NavMenu = () => {
  const [expanded, setExpanded] = useState(true);
  const [openItem, setOpenItem] = useState<string>('insights');

  const toggleItem = (id: string) => {
    setOpenItem(openItem === id ? '' : id);
  };

  return (
    <Stack
      gap={0}
      style={{
        width: expanded ? 250 : 60,
        height: '100vh',
        backgroundColor: '#f8f9fa',
        borderRight: '1px solid #e9ecef',
        transition: 'width 0.2s',
      }}
    >
      {/* Logo */}
      <Box p="md" style={{ borderBottom: '1px solid #e9ecef', height: 52 }}>
        {expanded && (
          <Text size="lg" fw={700}>
            CRESTA
          </Text>
        )}
      </Box>

      {/* Menu Items */}
      <Stack gap={0} style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {menuItems.map((item) => (
          <Box key={item.id}>
            <Button
              variant="subtle"
              color="gray"
              fullWidth
              justify="flex-start"
              leftSection={item.icon}
              rightSection={
                item.children && expanded ? (
                  <IconChevronDown
                    size={14}
                    style={{
                      transform: openItem === item.id ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}
                  />
                ) : null
              }
              onClick={() => item.children && toggleItem(item.id)}
              styles={{
                root: {
                  height: 38,
                  padding: expanded ? '0 16px' : '0 8px',
                },
                label: {
                  fontSize: '14px',
                },
                section: {
                  marginRight: expanded ? 8 : 0,
                },
              }}
            >
              {expanded && item.label}
            </Button>

            {item.children && expanded && (
              <Collapse in={openItem === item.id}>
                <Stack gap={0} pl="md">
                  {item.children.map((child) => (
                    <Button
                      key={child.path}
                      variant="subtle"
                      color="gray"
                      fullWidth
                      justify="flex-start"
                      styles={{
                        root: {
                          height: 34,
                          padding: '0 12px',
                          fontWeight: child.label === 'AI Analyst' ? 600 : 400,
                        },
                        label: {
                          fontSize: '14px',
                        },
                      }}
                    >
                      {child.label}
                    </Button>
                  ))}
                </Stack>
              </Collapse>
            )}
          </Box>
        ))}
      </Stack>

      {/* Toggle Button */}
      <Box p="sm" style={{ borderTop: '1px solid #e9ecef' }}>
        <Button
          variant="subtle"
          color="gray"
          fullWidth
          onClick={() => setExpanded(!expanded)}
          styles={{
            root: {
              height: 32,
            },
          }}
        >
          <IconChevronLeft
            size={18}
            style={{
              transform: expanded ? 'none' : 'rotate(180deg)',
              transition: 'transform 0.2s',
            }}
          />
        </Button>
      </Box>
    </Stack>
  );
};

export default NavMenu;
