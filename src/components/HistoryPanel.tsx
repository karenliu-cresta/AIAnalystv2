import { useEffect, useRef, useState } from 'react';
import { Box, Text, TextInput, ActionIcon, Checkbox } from '@mantine/core';
import EllipsisText from './EllipsisText';
import {
  IconSearch,
  IconFilter,
  IconX,
  IconChartLine,
  IconGitCompare,
  IconReportAnalytics,
} from '@tabler/icons-react';

// Single-artifact indicator: a rounded square with a sparkle (Figma node 454:9490).
const SingleArtifactIcon = ({ size = 16, color = '#5d666f' }: { size?: number; color?: string }) => (
  <svg
    width={(size * 15) / 16}
    height={size}
    viewBox="0 0 15 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M10.4764 7.81967L10.5413 7.68839C10.7481 7.27813 11.0724 6.94992 11.4778 6.74069L11.6075 6.67505C12.0454 6.44941 12.317 5.99813 12.317 5.50172C12.317 5.00531 12.0454 4.55403 11.6075 4.32428L11.4778 4.25864C11.0724 4.04941 10.7481 3.72121 10.5413 3.31095L10.4764 3.17967C10.2535 2.73659 9.80753 2.46172 9.31699 2.46172C8.82644 2.46172 8.3805 2.73659 8.15347 3.17967L8.08861 3.31095C7.88185 3.72121 7.55753 4.04941 7.15212 4.25864L7.02239 4.32428C6.58455 4.54992 6.31293 5.00121 6.31293 5.50172C6.31293 6.00223 6.58455 6.44941 7.02239 6.67915L7.15212 6.74479C7.55753 6.95403 7.88185 7.28223 8.08861 7.69249L8.15347 7.82377C8.37644 8.26685 8.82239 8.54172 9.31699 8.54172C9.81158 8.54172 10.2535 8.26685 10.4805 7.82377L10.4764 7.81967ZM9.45888 7.13044L9.39401 7.26172C9.39401 7.26172 9.36969 7.31095 9.31699 7.31095C9.26428 7.31095 9.24401 7.27403 9.23996 7.26172L9.17509 7.13044C8.85077 6.48633 8.34401 5.97351 7.70753 5.64531L7.5778 5.57967C7.5778 5.57967 7.52915 5.55505 7.52915 5.50172C7.52915 5.44839 7.56563 5.42787 7.5778 5.42377L7.70753 5.35813C8.34401 5.02992 8.85077 4.5171 9.17509 3.873L9.23996 3.74172C9.23996 3.74172 9.26428 3.69249 9.31699 3.69249C9.36969 3.69249 9.38996 3.72531 9.39401 3.74172L9.45888 3.873C9.7832 4.5171 10.29 5.02992 10.9264 5.35813L11.0562 5.42377C11.0562 5.42377 11.1048 5.44839 11.1048 5.50172C11.1048 5.55505 11.0683 5.57556 11.0562 5.57967L10.9264 5.64531C10.29 5.97351 9.7832 6.48633 9.45888 7.13044Z"
      fill={color}
    />
    <path
      d="M10.3378 0H4.66216C2.09189 0 0 2.11692 0 4.71795V11.2821C0 13.8831 2.09189 16 4.66216 16H10.3378C12.9081 16 15 13.8831 15 11.2821V4.71795C15 2.11692 12.9081 0 10.3378 0ZM13.7838 11.2821C13.7838 13.2062 12.2392 14.7692 10.3378 14.7692H4.66216C2.76081 14.7692 1.21622 13.2062 1.21622 11.2821V4.71795C1.21622 2.79385 2.76081 1.23077 4.66216 1.23077H10.3378C12.2392 1.23077 13.7838 2.79385 13.7838 4.71795V11.2821Z"
      fill={color}
    />
  </svg>
);

// A single session in the history list. `indicator` controls the right-hand
// artifact badge; `count` is shown for the stacked "multi" indicator.
export type ArtifactType = 'chart' | 'comparison' | 'report';

export interface HistoryItem {
  text: string;
  // 'none' = no artifact (no badge); 'single'/'multi' show the artifact icon(s).
  indicator: 'single' | 'multi' | 'none';
  count?: number;
  // Kind of artifact generated in this session — drives the filter menu.
  artifactType?: ArtifactType;
}

export interface HistoryGroup {
  label: string;
  items: HistoryItem[];
}

// Mock sessions matching Figma node 454:4338, grouped by recency.
const historyGroups: HistoryGroup[] = [
  {
    label: 'Today',
    items: [
      {
        text: 'What are customers’ complaints about our refund policy?',
        indicator: 'single',
        artifactType: 'report',
      },
      {
        text: 'What is the most common question the customer has about Basic Economy?',
        indicator: 'multi',
        count: 9,
        artifactType: 'chart',
      },
    ],
  },
  {
    label: 'Last 7 days',
    items: [
      {
        text: 'What are customers’ complaints about our refund policy?',
        indicator: 'single',
        artifactType: 'report',
      },
      { text: 'Why do customers not complete the application process?', indicator: 'none' },
      {
        text: 'Why are customers choosing competitors over us?',
        indicator: 'multi',
        count: 3,
        artifactType: 'comparison',
      },
      {
        text: 'What are the top objections to our products?',
        indicator: 'multi',
        count: 1,
        artifactType: 'chart',
      },
    ],
  },
  {
    label: 'Last 30 days',
    items: [
      { text: 'What are members surprised about?', indicator: 'none' },
      {
        text: 'Why are customers choosing competitors over us?',
        indicator: 'multi',
        count: 7,
        artifactType: 'comparison',
      },
      {
        text: 'What positive feedbacks are given in these calls?',
        indicator: 'multi',
        count: 1,
        artifactType: 'chart',
      },
      {
        text: 'What are the top objections to our products and pricing?',
        indicator: 'single',
        artifactType: 'report',
      },
      {
        text: 'What are the top objections to our products and pricing?',
        indicator: 'single',
        artifactType: 'report',
      },
    ],
  },
  {
    label: 'Older',
    items: [
      { text: 'What are members surprised about?', indicator: 'none' },
      {
        text: 'Why are customers choosing competitors over us?',
        indicator: 'multi',
        count: 7,
        artifactType: 'comparison',
      },
      {
        text: 'What positive feedbacks are given in these calls?',
        indicator: 'multi',
        count: 1,
        artifactType: 'chart',
      },
      {
        text: 'What are the top objections to our products and pricing?',
        indicator: 'single',
        artifactType: 'report',
      },
    ],
  },
];

// Stacked-report icon used for the "multi" artifact indicator (Figma node 486:5758).
const MultiReportIcon = ({ size = 22, color = '#25252a' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={(size * 18) / 22}
    viewBox="0 0 22 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M9.15555 0.244021C10.8735 -0.333111 12.699 0.146618 13.9369 1.33139L11.06 0.983069C9.67939 0.816129 8.36371 1.28193 7.39713 2.15303L4.08732 3.2659C2.25617 3.8811 1.27388 5.88597 1.89629 7.73906L4.02032 14.061C4.56057 15.6692 6.13316 16.638 7.73628 16.4643C8.16894 16.6674 8.6394 16.8072 9.13833 16.8676L10.3003 17.0076L8.8659 17.4904C6.39038 18.322 3.69084 16.9598 2.84928 14.4546L0.725248 8.13264C-0.116257 5.62767 1.21348 2.91235 3.6887 2.08056L9.15555 0.244021Z"
      fill={color}
    />
    <path
      d="M15.8949 9.44597L15.9751 9.32343C16.2296 8.94098 16.591 8.65411 17.0186 8.49508L17.1553 8.4455C17.6171 8.27408 17.941 7.85869 18.0006 7.36588C18.0602 6.87306 17.8448 6.39242 17.4377 6.11175L17.3168 6.031C16.9394 5.77459 16.6569 5.40981 16.5009 4.97769L16.4523 4.83956C16.2841 4.37291 15.8744 4.04647 15.3874 3.98755C14.9005 3.92863 14.4247 4.14794 14.1461 4.56054L14.066 4.68308C13.8114 5.06554 13.45 5.35241 13.0224 5.51143L12.8857 5.56102C12.424 5.73243 12.1001 6.14782 12.04 6.64471C11.9799 7.1416 12.1958 7.61817 12.6029 7.89884L12.7238 7.97959C13.1011 8.236 13.3837 8.60078 13.5397 9.0329L13.5883 9.17103C13.7564 9.63768 14.1661 9.96412 14.6572 10.0235C15.1482 10.0829 15.6199 9.86313 15.8985 9.45053L15.8949 9.44597ZM14.9675 8.63951L14.8874 8.76205C14.8874 8.76205 14.8573 8.808 14.805 8.80167C14.7527 8.79534 14.737 8.75625 14.7344 8.74354L14.6858 8.60542C14.4412 7.92703 13.9997 7.35705 13.4072 6.95477L13.2863 6.87402C13.2863 6.87402 13.241 6.84374 13.2474 6.7908C13.2538 6.73785 13.2925 6.72187 13.3051 6.71925L13.4417 6.66967C14.113 6.42029 14.6777 5.97205 15.0771 5.37157L15.1572 5.24903C15.1572 5.24903 15.1873 5.20308 15.2396 5.20941C15.2919 5.21574 15.3081 5.25075 15.3102 5.26753L15.3588 5.40565C15.6034 6.08405 16.0449 6.65403 16.6374 7.0563L16.7583 7.13705C16.7583 7.13705 16.8036 7.16733 16.7972 7.22028C16.7908 7.27323 16.7521 7.28921 16.7395 7.29182L16.6029 7.3414C15.9316 7.59078 15.3669 8.03902 14.9675 8.63951Z"
      fill={color}
    />
    <path
      d="M16.6966 1.66627L11.062 0.984546C8.51034 0.675824 6.17932 2.52616 5.86691 5.10835L5.07847 11.6249C4.76606 14.2071 6.58853 16.56 9.1402 16.8687L14.7748 17.5504C17.3264 17.8592 19.6575 16.0088 19.9699 13.4266L20.7583 6.91005C21.0707 4.32785 19.2483 1.97499 16.6966 1.66627ZM18.7625 13.2805C18.5314 15.1907 16.8102 16.557 14.9226 16.3286L9.28803 15.6469C7.40044 15.4185 6.05478 13.6812 6.28589 11.771L7.07432 5.25444C7.30543 3.34426 9.02659 1.97803 10.9142 2.20641L16.5488 2.88813C18.4363 3.1165 19.782 4.85379 19.5509 6.76396L18.7625 13.2805Z"
      fill={color}
    />
  </svg>
);

interface HistoryPanelProps {
  opened: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

const HistoryChip = ({
  item,
  onSelect,
}: {
  item: HistoryItem;
  onSelect: (item: HistoryItem) => void;
}) => (
  <Box
    onClick={() => onSelect(item)}
    style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      cursor: 'pointer',
      transition: 'background-color 0.15s',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.backgroundColor = '#f1f5ff';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.backgroundColor = '#fff';
    }}
  >
    <EllipsisText
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: 14,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      c="#25252a"
    >
      {item.text}
    </EllipsisText>

    {item.indicator === 'single' && <SingleArtifactIcon size={16} color="#5d666f" />}
    {item.indicator === 'multi' && (
      <Box style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Text fw={550} c="#5d666f" style={{ fontSize: 12, lineHeight: 1.55 }}>
          {item.count}
        </Text>
        <MultiReportIcon size={22} color="#5d666f" />
      </Box>
    )}
  </Box>
);

// Artifact-type options for the filter menu (Figma node 454:8035).
const FILTER_OPTIONS: { type: ArtifactType; label: string; icon: typeof IconChartLine }[] = [
  { type: 'chart', label: 'Chart', icon: IconChartLine },
  { type: 'comparison', label: 'Comparison', icon: IconGitCompare },
  { type: 'report', label: 'Report', icon: IconReportAnalytics },
];

const HistoryPanel = ({ opened, onClose, onSelect }: HistoryPanelProps) => {
  const [search, setSearch] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<ArtifactType[]>([]);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close the filter menu when clicking outside of it.
  useEffect(() => {
    if (!filterOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [filterOpen]);

  if (!opened) return null;

  const toggleType = (type: ArtifactType) =>
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );

  const query = search.trim().toLowerCase();
  const filteredGroups = historyGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((i) => {
        const matchesSearch = !query || i.text.toLowerCase().includes(query);
        const matchesType =
          selectedTypes.length === 0 ||
          (i.artifactType !== undefined && selectedTypes.includes(i.artifactType));
        return matchesSearch && matchesType;
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Backdrop */}
      <Box
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(37, 37, 42, 0.35)',
          zIndex: 200,
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Drawer */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 540,
          maxWidth: '90vw',
          backgroundColor: '#f8f9fa',
          boxShadow: '0px 4px 14px 0px rgba(0,0,0,0.1)',
          zIndex: 201,
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 0.3s ease-out',
        }}
      >
        {/* Header */}
        <Box
          style={{
            padding: '28px 32px',
            borderBottom: '1px solid #dee5eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <Text fw={500} c="#25252a" style={{ fontSize: 24 }}>
            History
          </Text>
          <ActionIcon variant="subtle" color="gray" size={24} onClick={onClose}>
            <IconX size={20} />
          </ActionIcon>
        </Box>

        {/* Scrollable content */}
        <Box style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {/* Search + filter */}
          <Box style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 24 }}>
            <TextInput
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              styles={{
                root: { flex: 1 },
                input: {
                  height: 36,
                  fontSize: 14,
                  borderRadius: 8,
                  border: '1px solid #dee5eb',
                  backgroundColor: '#fff',
                },
              }}
            />
            <Box ref={filterRef} style={{ position: 'relative', flexShrink: 0 }}>
              <ActionIcon
                variant="subtle"
                color="gray"
                size={36}
                onClick={() => setFilterOpen((o) => !o)}
              >
                <IconFilter
                  size={18}
                  color={selectedTypes.length > 0 ? '#25252a' : '#5d666f'}
                />
              </ActionIcon>

              {filterOpen && (
                <Box
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    right: 0,
                    minWidth: 180,
                    backgroundColor: '#fff',
                    borderRadius: 8,
                    overflow: 'hidden',
                    boxShadow:
                      '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                    zIndex: 10,
                  }}
                >
                  {FILTER_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon;
                    return (
                      <Box
                        key={opt.type}
                        onClick={() => toggleType(opt.type)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#f1f5ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#fff';
                        }}
                      >
                        <Checkbox
                          checked={selectedTypes.includes(opt.type)}
                          readOnly
                          size="xs"
                          tabIndex={-1}
                          styles={{ input: { cursor: 'pointer' } }}
                        />
                        <OptIcon size={16} color="#5d666f" />
                        <Text style={{ fontSize: 14, lineHeight: 1.55 }} c="#25252a">
                          {opt.label}
                        </Text>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          </Box>

          {/* Grouped sessions */}
          <Box style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {filteredGroups.length === 0 ? (
              <Text c="#5d666f" style={{ fontSize: 14 }}>
                {query ? `No sessions match “${search}”.` : 'No sessions match these filters.'}
              </Text>
            ) : (
              filteredGroups.map((group) => (
                <Box
                  key={group.label}
                  style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                >
                  <Text c="#5d666f" style={{ fontSize: 12 }}>
                    {group.label}
                  </Text>
                  <Box style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {group.items.map((item, i) => (
                      <HistoryChip key={`${group.label}-${i}`} item={item} onSelect={onSelect} />
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default HistoryPanel;
