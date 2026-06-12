import { Box, Stack, UnstyledButton, Text, Collapse } from '@mantine/core';
import type { ReactNode } from 'react';
import AppTooltip from './AppTooltip';
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
  IconChevronRight,
  IconCircleSquare,
} from '@tabler/icons-react';
import { useState } from 'react';
import crestaLogo from '../assets/cresta-logo.png';

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

// The collapsed icon rail places its tooltips to the right of each icon since
// the rail sits on the left edge.
const NavTooltip = ({ label, children }: { label: string; children: ReactNode }) => (
  <AppTooltip label={label} position="right">
    {children}
  </AppTooltip>
);

const NavMenu = ({
  collapsed = false,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    insights: true,
  });
  const [activeItem, setActiveItem] = useState('AI Analyst');
  // Which top-level section is highlighted in the collapsed icon rail.
  const [activeNavId, setActiveNavId] = useState('insights');

  const toggleSection = (id: string) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Collapsed: an icon-only rail — no logo, no labels, just the section icons.
  if (collapsed) {
    return (
      <Box
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          // Offset by the (now-hidden) logo height so the icons stay vertically
          // aligned with where they sit in the expanded nav.
          padding: '54px 0 14px',
        }}
      >
        <Stack gap={8} style={{ flex: 1, alignItems: 'center' }}>
          {navSections.map((section) => {
            const active = section.id === activeNavId;
            return (
              <NavTooltip key={section.id} label={section.label}>
                <UnstyledButton
                  onClick={() => setActiveNavId(section.id)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    backgroundColor: active ? '#fff' : 'transparent',
                    boxShadow: active ? '0px 4px 9px rgba(0, 0, 0, 0.05)' : 'none',
                  }}
                >
                  {section.icon && (
                    <section.icon size={18} color={active ? '#25252a' : '#5d666f'} />
                  )}
                </UnstyledButton>
              </NavTooltip>
            );
          })}
        </Stack>

        {/* Expand the nav back to full width. */}
        <NavTooltip label="Expand navigation">
          <UnstyledButton
            onClick={onToggleCollapse}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconChevronRight size={18} color="#5d666f" />
          </UnstyledButton>
        </NavTooltip>
      </Box>
    );
  }

  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Logo (Figma node 494:5561) — white wordmark + mark, blended to read
          dark against the light nav background. */}
      <Box
        style={{
          height: 52,
          padding: '4px 16px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <img
          src={crestaLogo}
          alt="Cresta"
          style={{
            height: 21,
            width: 97,
            objectFit: 'contain',
            mixBlendMode: 'exclusion',
          }}
        />
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
          onClick={onToggleCollapse}
          title="Collapse navigation"
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
