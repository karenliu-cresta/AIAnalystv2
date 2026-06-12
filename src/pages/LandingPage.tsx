import { useState, useRef, useEffect, type ReactNode } from 'react';
import { Box, Title, Text, Stack, Textarea, ActionIcon, Button, Paper, Menu, Checkbox, CloseButton, Loader, Image, Table, TextInput, Tooltip, Modal } from '@mantine/core';
import { IconPlus, IconMessages, IconArrowUp, IconBriefcase, IconLoader, IconChevronRight, IconChevronsLeft, IconChevronsRight, IconX, IconChevronDown, IconShare, IconEdit, IconLayoutDashboard, IconDownload, IconCopy, IconCalendar, IconFilter, IconInfoCircle, IconThumbUp, IconThumbDown, IconMail, IconPhone, IconMessageCircle, IconMessage, IconArrowLeft, IconSparkles, IconArrowUpRight, IconArrowRight, IconDots, IconTrash } from '@tabler/icons-react';
import {
  IconChartLine,
  IconReportAnalytics,
  IconGitCompare,
  IconClipboardList,
} from '@tabler/icons-react';
import HistoryPanel, { HistoryItem } from '../components/HistoryPanel';
import AppTooltip from '../components/AppTooltip';
import EllipsisText from '../components/EllipsisText';
import { useAnalystStore } from '../store/useAnalystStore';

// Per-output-type visual identity (Figma node 535:9772). Colors come from the
// design-system extended-color tokens: `content` for icon/text, `background`
// for the hover/active tint, `border` for the active outline.
const OUTPUT_IDENTITY = {
  query: {
    label: 'Query/Chart',
    icon: IconChartLine,
    content: '#5c940d', // extended-content-lime
    background: '#f4fce3', // extended-background-lime
    border: '#c0eb75', // extended-border-lime
  },
  report: {
    label: 'Report',
    icon: IconReportAnalytics,
    content: '#0b7285', // extended-content-cyan
    background: '#e3fafc', // extended-background-cyan
    border: '#66d9e8', // extended-border-cyan
  },
  compare: {
    label: 'Compare',
    icon: IconGitCompare,
    content: '#d9480f', // extended-content-orange
    background: '#fff4e6', // extended-background-orange
    border: '#ffc078', // extended-border-orange
  },
  survey: {
    label: 'Survey',
    icon: IconClipboardList,
    content: '#3428b0', // extended-content (genai)
    background: '#f3f2fc', // extended-background-genai
    border: '#c3bff5', // extended-border-genai
  },
} as const;

type OutputIdentityKey = keyof typeof OUTPUT_IDENTITY;

// Shared styling for the session-actions dropdown items (share / rename / delete).
const sessionMenuItemStyles = {
  item: { padding: '8px 12px', borderRadius: 6 },
  itemLabel: { fontSize: 14, fontWeight: 425, color: '#25252a', lineHeight: 1.55 },
  itemSection: { marginRight: 8 },
} as const;

const quickActions = Object.keys(OUTPUT_IDENTITY) as OutputIdentityKey[];

// Map an artifact's stored type to its visual-identity key.
const artifactIdentityKey = (type: Artifact['type']): OutputIdentityKey =>
  type === 'report' ? 'report' : type === 'comparison' ? 'compare' : 'query';

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

// Keyword groups that let a free-typed prompt pick its own output type without
// the user choosing a category chip. Whole-word matches only (so "report"
// doesn't fire inside "reported"); multi-word phrases are matched as substrings.
const OUTPUT_TYPE_KEYWORDS: { type: Exclude<OutputType, null>; words: string[] }[] = [
  // Chart wins over report, which wins over comparison: when several keywords
  // appear (e.g. "compare reports in a chart") the most visual intent takes
  // precedence. Order here is the priority order.
  {
    type: 'chart',
    words: [
      'chart', 'charts', 'graph', 'graphs', 'plot', 'plots', 'trend', 'trends',
      'visualize', 'visualise', 'visualization', 'visualisation', 'bar', 'line', 'pie',
    ],
  },
  {
    type: 'report',
    words: [
      'report', 'reports', 'summary', 'summaries', 'summarize', 'summarise',
      'analysis', 'analyze', 'analyse', 'investigate', 'insight', 'insights',
      'deep dive', 'why',
    ],
  },
  {
    type: 'comparison',
    words: [
      'compare', 'compares', 'comparison', 'comparisons', 'vs', 'versus',
      'difference', 'differences', 'between',
    ],
  },
];

// Infer the desired output type from the text of a prompt, or null if no
// keyword matches (the caller then falls back to a chart).
const inferOutputType = (text: string): OutputType => {
  const lower = text.toLowerCase();
  for (const { type, words } of OUTPUT_TYPE_KEYWORDS) {
    const hit = words.some((word) =>
      word.includes(' ')
        ? lower.includes(word)
        : new RegExp(`\\b${word}\\b`).test(lower),
    );
    if (hit) return type;
  }
  return null;
};

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

const reportMockResponse = `I'd be happy to put together a deep research report! To focus the analysis, I need a bit more context.

**Please tell me:**

1. What question should the report answer? (e.g., why customers are churning, what drives angry contacts)
2. Which segment or population should I analyze? (e.g., Basic Economy flyers, a specific region, recent purchasers)
3. What time period should I cover? (e.g., last 30 days, this quarter)
4. Any filters to apply? (e.g., emotion, channel, fare class)

For example, you could say:

- "Analyze why Basic Economy customers are angry over the last 30 days"
- "Summarize the top drivers of churn for enterprise accounts this quarter"
- "Break down complaint themes for customers who contacted us about refunds"

Once I have that, I'll sample the relevant conversations, cluster the themes, and pull representative evidence for each. What should the report dig into?`;

const mockTableData = [
  { date: '06/08/2026', conversations: 102830 },
  { date: '06/03/2026', conversations: 94774 },
  { date: '06/04/2026', conversations: 91638 },
  { date: '06/05/2026', conversations: 83828 },
  { date: '06/07/2026', conversations: 69333 },
  { date: '06/06/2026', conversations: 63487 },
  { date: '06/09/2026', conversations: 13137 },
];

const reportThemes = [
  {
    pct: 31,
    color: '#d6336c',
    title: 'Baggage Allowance Confusion',
    description:
      'Customers consistently discover carry-on and checked bag fees specific to Basic Economy only at the gate after committing to the fare. Elite status holders are disproportionately represented, as many assume their tier benefits extend to all fare classes.',
    quote:
      'I was forced to pay $75 for a bag that was clearly within the size limits. The agent said Basic Economy has different rules that weren\'t explained anywhere…',
    evidence: [
      {
        insight: 'Hidden fees not mentioned upfront',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: "I was told my bag was included in my ticket price, but now I'm being charged an extra $65 at check-in. Why?",
          },
          {
            speaker: 'Agent' as const,
            text: 'Your Basic Economy fare only includes a personal item. Checked baggage requires additional fees as outlined in our fare terms.',
          },
        ],
        name: 'Rob Hughes',
        date: '6/17/2024 8:43 AM',
      },
      {
        insight: 'Loyalty program exceptions unclear',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: "As a Gold member, aren't I supposed to get a free checked bag on all flights?",
          },
          {
            speaker: 'Agent' as const,
            text: 'Your status benefits apply only on our operated flights, not on our regional partner airlines or codeshare flights.',
          },
        ],
        name: 'Daisy Fei',
        date: '6/18/2024 9:25 AM',
      },
      {
        insight: 'Special item handling policies',
        rows: [
          {
            speaker: 'Agent' as const,
            text: "Musical instruments require special handling. There's a $75 fee and they must be checked at our oversized baggage counter.",
          },
          {
            speaker: 'Visitor' as const,
            text: "But last month your colleague told me I could bring it onboard if it fits in the overhead bin. I've done this on three previous flights with you!",
          },
        ],
        name: 'Casey Johnson',
        date: '6/19/2024 1:25 PM',
      },
    ],
  },
  {
    pct: 28,
    color: '#e64980',
    title: 'Basic Economy Restrictions',
    description:
      'Customers are surprised by the cumulative restrictiveness of Basic Economy: no same-day changes, no upgrades, and last-priority standby. Anger intensifies when they observe a fellow passenger on the same flight with significantly more flexibility for a marginally higher fare.',
    quote:
      'Nobody told me I couldn\'t change the date. The page just says \'restrictions apply\' — that\'s not enough to make that decision.',
    evidence: [
      {
        insight: 'Same-day changes blocked without warning',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: 'I need to move to an earlier flight today, but the app says my fare is ineligible. Nobody mentioned this when I booked.',
          },
          {
            speaker: 'Agent' as const,
            text: 'Same-day changes are not available on Basic Economy fares. I can rebook you on a standard fare, but the difference would apply.',
          },
        ],
        name: 'Marcus Lee',
        date: '6/20/2024 10:12 AM',
      },
      {
        insight: 'Flexibility gap versus neighboring fare',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: 'The person next to me paid $20 more and can change their flight freely. Why am I locked into everything?',
          },
          {
            speaker: 'Agent' as const,
            text: 'Standard fares include change flexibility that Basic Economy does not. The fare rules are listed at the point of purchase.',
          },
        ],
        name: 'Priya Nair',
        date: '6/21/2024 2:48 PM',
      },
    ],
  },
  {
    pct: 20,
    color: '#f783ac',
    title: 'Booking and Upgrade Processes',
    description:
      'Customers who reach the booking portal or app expecting to modify their itinerary through upgrades, fare changes, or loyalty benefit application are blocked without clear explanation.',
    quote:
      'I have Gold status but couldn\'t use an upgrade on this fare. I had no idea — the booking flow should warn you before you pay.',
    evidence: [
      {
        insight: 'Upgrade eligibility not surfaced before purchase',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: "I'm trying to apply an upgrade certificate but the system won't let me. I have Gold status.",
          },
          {
            speaker: 'Agent' as const,
            text: 'Upgrade certificates cannot be applied to Basic Economy fares. This restriction is part of the fare class rules.',
          },
        ],
        name: 'Tom Becker',
        date: '6/22/2024 11:03 AM',
      },
      {
        insight: 'Loyalty benefits blocked at booking',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: 'Why can I not select my benefits during checkout? It just skips that step entirely.',
          },
          {
            speaker: 'Agent' as const,
            text: 'Loyalty benefit selection is disabled for this fare type. The booking flow does not present those options for Basic Economy.',
          },
        ],
        name: 'Sofia Romero',
        date: '6/23/2024 4:31 PM',
      },
    ],
  },
  {
    pct: 15,
    color: '#faa2c1',
    title: 'Seating Arrangements and Upgrades',
    description:
      'Basic Economy seat assignment at check-in makes adjacent seating structurally impossible without paying an explicit per-seat fee — a fact customers discover at the gate. Cases involving children under 12 carry a safety dimension beyond typical inconvenience.',
    quote:
      'We booked together and ended up in completely different rows. No warning, no way to choose seats without a large fee.',
    evidence: [
      {
        insight: 'Families separated without notice',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: 'My two kids are seated rows apart from me. They are 7 and 9 — I cannot leave them alone next to strangers.',
          },
          {
            speaker: 'Agent' as const,
            text: 'Basic Economy seats are assigned at check-in. To guarantee adjacent seating I would need to add the seat selection fee for each passenger.',
          },
        ],
        name: 'Hannah Wright',
        date: '6/24/2024 8:09 AM',
      },
      {
        insight: 'Per-seat fee discovered at the gate',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: 'I only found out at the gate that choosing a seat costs extra. There was no mention of this when I paid.',
          },
          {
            speaker: 'Agent' as const,
            text: 'Seat selection is an optional paid add-on for Basic Economy. Otherwise seats are assigned automatically at check-in.',
          },
        ],
        name: 'David Okafor',
        date: '6/25/2024 12:54 PM',
      },
    ],
  },
  {
    pct: 6,
    color: '#faa2c1',
    title: 'Cancellation Policies and Refunds',
    description:
      'Customers discover the non-refundable nature of Basic Economy only after a significant life event — illness, bereavement, or job loss. These conversations carry the highest escalation rate per contact of any theme in the dataset.',
    quote:
      'My mother was hospitalised and I couldn\'t travel. I assumed any ticket would be refundable in an emergency — I was wrong.',
    evidence: [
      {
        insight: 'Non-refundable status unknown until emergency',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: 'I had a family emergency and need to cancel. I assumed I would at least get a credit toward a future flight.',
          },
          {
            speaker: 'Agent' as const,
            text: 'Basic Economy fares are non-refundable and do not earn travel credit upon cancellation. I am sorry for the difficult situation.',
          },
        ],
        name: 'Elena Petrova',
        date: '6/26/2024 9:40 AM',
      },
      {
        insight: 'High escalation on refund denial',
        rows: [
          {
            speaker: 'Visitor' as const,
            text: 'This is unacceptable. I want to speak to a supervisor — there has to be an exception for medical emergencies.',
          },
          {
            speaker: 'Agent' as const,
            text: 'I understand your frustration. I will escalate this to a supervisor, though refund eligibility for this fare is limited by policy.',
          },
        ],
        name: 'James Carter',
        date: '6/27/2024 3:17 PM',
      },
    ],
  },
];

// The sample an artifact was built from, plus the active filters. Shown both on
// the chat card and in the artifact subheader so the two always agree. Values
// are per artifact type so the metadata matches each artifact's content — the
// chart's sample/date span the daily volume table, while the report keeps its
// 30-day angry-Basic-Economy sample.
const CHART_CONVERSATION_COUNT = mockTableData.reduce(
  (sum, item) => sum + item.conversations,
  0,
);
const ARTIFACT_META = {
  report: {
    count: 6345,
    dateRange: 'Last 30 days',
    filter: 'Emotion: Angry, Basic Economy',
  },
  chart: {
    count: CHART_CONVERSATION_COUNT,
    dateRange: 'Last 7 days',
    filter: 'Basic Economy',
  },
} as const;

const artifactMeta = (type: Artifact['type']) =>
  type === 'report' ? ARTIFACT_META.report : ARTIFACT_META.chart;

// Conversation-count accent — bold and the brand blue of the sample-chart SVG.
const CONVERSATION_COUNT_BLUE = '#304FFE';

// Pick a legible label color for text sitting on a theme swatch: white on the
// darker pinks, a deep rose on the light ones (where white would wash out).
const labelOnColor = (hex: string) => {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.7 ? '#9b3050' : '#fff';
};

// Turn a raw prompt into a short session title — drops the "Can you" lead-in,
// trailing punctuation, and trims to a handful of words.
const generateSessionTitle = (prompt: string) => {
  let t = prompt.trim().replace(/^can you\s+/i, '').replace(/[.?!]+$/, '');
  t = t.charAt(0).toUpperCase() + t.slice(1);
  const words = t.split(/\s+/);
  if (words.length > 7) {
    t = words.slice(0, 7).join(' ') + '…';
  } else if (t.length > 48) {
    t = t.slice(0, 48).trimEnd() + '…';
  }
  return t;
};

// Sparkline graphic shown next to the conversation-sample count (Figma node 504:9658).
const SampleChartIcon = ({ height = 16 }: { height?: number }) => (
  <svg
    width={(height * 48) / 17}
    height={height}
    viewBox="0 0 48 17"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M5.54519 14.6478C3.82843 15.1976 0.850098 13.9242 0.850098 13.9242V16.8501H46.8501V4.58044C44.9192 3.99149 42.3127 -0.485548 41.1447 1.24563C37.5788 6.53099 33.3312 0.764245 29.3772 2.44113C25.3431 4.15202 24.3889 7.19837 20.0465 7.38043C18.0358 7.46473 18.3413 13.0537 16.332 13.1692C14.2804 13.287 12.3909 8.52793 10.4483 9.2366C8.37163 9.99418 7.64758 13.9745 5.54519 14.6478Z"
      fill="url(#sampleChartGradient)"
    />
    <path
      d="M0.850098 13.9242C0.850098 13.9242 3.82843 15.1976 5.54519 14.6478C7.64758 13.9745 8.37163 9.99418 10.4483 9.2366C12.3909 8.52793 14.2804 13.287 16.332 13.1692C18.3413 13.0537 18.0358 7.46473 20.0465 7.38043C24.3889 7.19838 25.3431 4.15202 29.3772 2.44113C33.3312 0.764245 37.5788 6.531 41.1447 1.24563C42.3126 -0.485548 44.9192 3.99149 46.8501 4.58044"
      stroke="#304FFE"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient
        id="sampleChartGradient"
        x1="23.8501"
        y1="0.850098"
        x2="23.8501"
        y2="16.8501"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0.0648416" stopColor="#C7CEF6" />
        <stop offset="0.669044" stopColor="#D7DDFF" />
        <stop offset="1" stopColor="#C2CBFF" stopOpacity="0" />
      </linearGradient>
    </defs>
  </svg>
);

// Stacked-report icon used for the multi-artifact dropdown (Figma node 486:5758).
const MultiReportIcon = ({ size = 16, color = '#25252a' }: { size?: number; color?: string }) => (
  <svg
    width={size}
    height={(size * 18) / 22}
    viewBox="0 0 22 18"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
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

const LandingPage = () => {
  const [activeCategory, setActiveCategory] = useState('query');
  const [inputValue, setInputValue] = useState('');
  const [hoveredPrompt, setHoveredPrompt] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [surveysEnabled, setSurveysEnabled] = useState(false);
  const [plusMenuOpened, setPlusMenuOpened] = useState(false);
  const [selectedOutputType, setSelectedOutputType] = useState<OutputType>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [showArtifactPanel, setShowArtifactPanel] = useState(false);
  // When true, the chat column is hidden so the artifact panel fills the window.
  const [chatHidden, setChatHidden] = useState(false);
  // Mirror the panel-open state into the store so the left nav collapses to icons.
  const setArtifactOpen = useAnalystStore((s) => s.setArtifactOpen);
  useEffect(() => {
    setArtifactOpen(showArtifactPanel);
  }, [showArtifactPanel, setArtifactOpen]);
  // Which theme's evidence detail is being viewed in the report panel (null = report overview)
  const [selectedInsight, setSelectedInsight] = useState<(typeof reportThemes)[number] | null>(
    null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState('');
  const [showArtifactsDropdown, setShowArtifactsDropdown] = useState(false);
  const [panelWidth, setPanelWidth] = useState(50); // half the page by default
  const [isResizing, setIsResizing] = useState(false);
  // The resize divider doubles as a scroll indicator for the chat. The thumb is
  // positioned in pixels (relative to the divider) so it stays confined to the
  // scrollable message area — under the session header, above the input box.
  const [chatScrollbar, setChatScrollbar] = useState({ top: 0, height: 0 });
  // Dragging the thumb scrolls the chat (distinct from dragging the divider to
  // resize). We remember where the drag started to map cursor delta to scrollTop.
  const [isScrubbing, setIsScrubbing] = useState(false);
  const scrubStartRef = useRef({ y: 0, scrollTop: 0 });
  // Same idea for the artifact panel's own scrollbar on its right edge.
  const [panelScrollbar, setPanelScrollbar] = useState({ top: 0, height: 0 });
  const [isPanelScrubbing, setIsPanelScrubbing] = useState(false);
  const panelScrubStartRef = useRef({ y: 0, scrollTop: 0 });
  // Height of the sticky filters bar — the rail and scroll-to targets sit below it.
  const [conversationOutputType, setConversationOutputType] = useState<OutputType>(null);
  const [awaitingDetails, setAwaitingDetails] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  // Mirror the session name into the store for the top breadcrumb — only once a
  // conversation has started, otherwise the breadcrumb segment stays hidden.
  const setStoreSessionTitle = useAnalystStore((s) => s.setSessionTitle);
  useEffect(() => {
    setStoreSessionTitle(messages.length > 0 ? sessionTitle : '');
  }, [messages.length, sessionTitle, setStoreSessionTitle]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  // Rename-session modal (opened from the session dropdown when an artifact is open).
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameModalDraft, setRenameModalDraft] = useState('');
  const [isEditingArtifactTitle, setIsEditingArtifactTitle] = useState(false);
  const [artifactTitleDraft, setArtifactTitleDraft] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [panelPxWidth, setPanelPxWidth] = useState(0);
  const [chatColumnPxWidth, setChatColumnPxWidth] = useState(0);
  const chatColumnRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const resizeDividerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelContentRef = useRef<HTMLDivElement>(null);
  const artifactPanelRef = useRef<HTMLDivElement>(null);
  const panelFiltersRef = useRef<HTMLDivElement>(null);
  // Per-artifact card refs so clicking an artifact can jump to it in the chat.
  const artifactRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Refs to each stacked report section so the wide-view outline can scroll to
  // them and scroll-spy can track which one is currently in view.

  // Which theme the wide-view outline highlights — driven by scroll-spy as the
  // stacked sections move through the viewport, and set directly on outline click.

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
    let type: OutputType = null;
    if (activeCategory === 'query') {
      type = 'chart';
    } else if (activeCategory === 'report') {
      type = 'report';
    } else if (activeCategory === 'compare') {
      type = 'comparison';
    }
    setSelectedOutputType(type);

    // Send the message, passing the type explicitly to avoid the stale-state
    // closure (setSelectedOutputType above hasn't flushed yet).
    setTimeout(() => handleSendMessage(wellWrittenPrompt, type), 100);
  };

  const simulateTyping = async (
    content: string,
    shouldGenerateArtifact = false,
    artifactType: OutputType = null
  ) => {
    setIsTyping(true);
    setStreamingContent('');

    const words = content.split(' ');
    for (let i = 0; i < words.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 6 + Math.random() * 10));
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
        generateArtifact(artifactType);
      }, 500);
    }
  };

  const generateArtifact = async (artifactType: OutputType) => {
    const type = artifactType || 'chart';
    const isReport = type === 'report';
    setIsGenerating(true);
    setGenerationProgress(isReport ? 'Generating report...' : 'Generating chart...');

    // Simulate loading for 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const newArtifact: Artifact = {
      id: Date.now().toString(),
      title: isReport ? 'Why are customers angry?' : 'Daily conversation count',
      type: isReport ? 'report' : 'chart',
      generationTime: isReport ? '2m34s' : '1m23s',
      imageUrl: isReport
        ? undefined
        : 'https://www.figma.com/api/mcp/asset/e9672ded-f51d-4cce-a825-000be4d15862',
    };

    setArtifacts((prev) => [...prev, newArtifact]);
    setGenerationProgress(
      `${isReport ? 'Report' : 'Chart'} generated (${newArtifact.generationTime})`
    );

    // Add artifact card to messages
    const artifactMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      artifact: newArtifact,
    };
    setMessages((prev) => [...prev, artifactMessage]);

    // Open the freshly generated artifact automatically. Setting it as the
    // selected artifact also flips its chat card into the active state via
    // isArtifactSelected.
    setSelectedArtifact(newArtifact);
    setSelectedInsight(null);
    setShowArtifactPanel(true);
    setTimeout(() => {
      artifactRefs.current[newArtifact.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 350);

    setIsGenerating(false);
  };

  const handleArtifactClick = (artifact: Artifact) => {
    setSelectedArtifact(artifact);
    setSelectedInsight(null);
    setIsEditingArtifactTitle(false);
    setShowArtifactPanel(true);
    // Jump to the artifact's card in the chat, like a document outline. Wait for
    // the panel's open transition (and the chat reflow it causes) to settle.
    setTimeout(() => {
      artifactRefs.current[artifact.id]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 350);
  };

  // Reset everything back to the welcome/landing state for a fresh conversation.
  const startNewChat = () => {
    setShowArtifactPanel(false);
    setChatHidden(false);
    setSelectedArtifact(null);
    setSelectedInsight(null);
    setMessages([]);
    setArtifacts([]);
    setSessionTitle('New Chat');
    setIsEditingTitle(false);
    setConversationOutputType(null);
    setSelectedOutputType(null);
    setAwaitingDetails(false);
    setShowSuggestions(true);
    setInputValue('');
    setStreamingContent('');
    setGenerationProgress('');
    setIsGenerating(false);
    setIsTyping(false);
  };

  // Begin inline-editing the session title.
  const startRenameTitle = () => {
    setTitleDraft(sessionTitle);
    setIsEditingTitle(true);
  };

  // Commit the edited title (ignoring blank input), or cancel back to the old name.
  const commitRenameTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed) setSessionTitle(trimmed);
    setIsEditingTitle(false);
  };

  const cancelRenameTitle = () => {
    setIsEditingTitle(false);
  };

  const openRenameModal = () => {
    setRenameModalDraft(sessionTitle);
    setRenameModalOpen(true);
  };

  const commitRenameModal = () => {
    const trimmed = renameModalDraft.trim();
    if (trimmed) setSessionTitle(trimmed);
    setRenameModalOpen(false);
  };

  // Inline-rename the open artifact — mirrors the session-title flow but writes
  // the new name back to the artifact everywhere it's referenced (panel,
  // artifacts list, and the chat card).
  const startRenameArtifactTitle = () => {
    if (!selectedArtifact) return;
    setArtifactTitleDraft(selectedArtifact.title);
    setIsEditingArtifactTitle(true);
  };

  const commitRenameArtifactTitle = () => {
    const trimmed = artifactTitleDraft.trim();
    if (trimmed && selectedArtifact) {
      const id = selectedArtifact.id;
      setSelectedArtifact((prev) => (prev ? { ...prev, title: trimmed } : prev));
      setArtifacts((prev) => prev.map((a) => (a.id === id ? { ...a, title: trimmed } : a)));
      setMessages((prev) =>
        prev.map((m) =>
          m.artifact?.id === id ? { ...m, artifact: { ...m.artifact, title: trimmed } } : m,
        ),
      );
    }
    setIsEditingArtifactTitle(false);
  };

  const cancelRenameArtifactTitle = () => {
    setIsEditingArtifactTitle(false);
  };

  // Load a session picked from the History panel into the chat view. We don't
  // persist real sessions yet, so this reconstructs a placeholder conversation
  // (the question + a response + any artifact cards) from the history item.
  const loadSession = (item: HistoryItem) => {
    const count =
      item.indicator === 'multi'
        ? item.count ?? 1
        : item.indicator === 'single'
          ? 1
          : 0;
    const title = item.text;

    setShowArtifactPanel(false);
    setSelectedArtifact(null);
    setSelectedInsight(null);
    setSessionTitle(title);
    setConversationOutputType(count > 0 ? 'report' : null);

    const base = Date.now();
    const msgs: Message[] = [
      { id: `${base}`, role: 'user', content: title, timestamp: new Date() },
      {
        id: `${base + 1}`,
        role: 'assistant',
        content:
          count > 0
            ? 'Here’s the analysis I pulled together for this question.'
            : 'I looked into this but didn’t generate a saved artifact for it.',
        timestamp: new Date(),
      },
    ];
    const arts: Artifact[] = [];
    for (let i = 0; i < count; i++) {
      const artifact: Artifact = {
        id: `${base + 2 + i}`,
        title: item.text,
        type: 'report',
        generationTime: '2m34s',
      };
      arts.push(artifact);
      msgs.push({
        id: `${base + 2 + i}-card`,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        artifact,
      });
    }

    setArtifacts(arts);
    setMessages(msgs);
    setHistoryOpen(false);
  };

  const handleSendMessage = async (messageText?: string, outputTypeOverride?: OutputType) => {
    const text = messageText || inputValue.trim();
    if (!text) return;

    // Resolve the output type for this turn. An explicitly chosen type always
    // wins: suggested prompts pass it via the override (setSelectedOutputType
    // hasn't flushed to this closure yet), and a selected category chip is read
    // from selectedOutputType.
    const explicitType =
      outputTypeOverride !== undefined ? outputTypeOverride : selectedOutputType;
    // With no explicit choice, infer the type from keywords in the prompt
    // ("chart"/"report"/"compare" and synonyms). Skip inference while answering
    // clarifying questions — those replies often contain incidental keywords and
    // shouldn't be mistaken for a brand-new request.
    const effectiveType =
      explicitType ?? (awaitingDetails ? null : inferOutputType(text));

    // The session is named after its first prompt.
    if (messages.length === 0) {
      setSessionTitle(generateSessionTitle(text));
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    // Remember the chosen output type for the whole conversation so the
    // artifact (generated on a later turn) renders the right view.
    if (effectiveType) {
      setConversationOutputType(effectiveType);
    }

    // Clear input and reset state
    setInputValue('');
    setSelectedOutputType(null);

    // Each output request gets a round of clarifying questions before the
    // artifact is built. A turn is a NEW request when the user kicks off the
    // session or explicitly picks an output type; the next turn (their answers)
    // is what triggers generation.
    const isNewRequest = messages.length === 0 || !!effectiveType;
    const shouldGenerateArtifact = !isNewRequest && awaitingDetails;
    // The artifact type for this turn — falls back to the conversation's type
    // for follow-ups where the user didn't re-pick an output type.
    const artifactType = effectiveType || conversationOutputType;
    const isReportConversation = artifactType === 'report';

    if (isNewRequest) {
      setAwaitingDetails(true);
    } else if (shouldGenerateArtifact) {
      setAwaitingDetails(false);
    }

    setTimeout(() => {
      simulateTyping(
        shouldGenerateArtifact
          ? isReportConversation
            ? 'Got it! Let me put together that report for you.'
            : 'Got it! Let me create that chart for you.'
          : isReportConversation
            ? reportMockResponse
            : mockResponse,
        shouldGenerateArtifact,
        artifactType
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
    // Selecting an output type closes the whole composer menu tree.
    setPlusMenuOpened(false);
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

  // Keep the divider's scroll indicator in sync with the chat's scroll state.
  // The track spans only the chat message area: we measure the chat container
  // relative to the divider so the thumb sits between the header and the input.
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;
    const update = () => {
      const divider = resizeDividerRef.current;
      if (!divider) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      const chatRect = el.getBoundingClientRect();
      const trackTop = chatRect.top - divider.getBoundingClientRect().top;
      const trackHeight = chatRect.height;
      const ratio = scrollHeight > 0 ? Math.min(1, clientHeight / scrollHeight) : 1;
      // Proportional thumb (accurately reflects the visible fraction), capped a
      // little under full height and floored so it stays grabbable.
      const height = Math.max(32, Math.min(ratio * trackHeight, trackHeight * 0.85));
      const maxOffset = Math.max(0, trackHeight - height);
      const progress =
        scrollHeight > clientHeight ? scrollTop / (scrollHeight - clientHeight) : 0;
      setChatScrollbar({ top: trackTop + progress * maxOffset, height });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [messages, streamingContent, showArtifactPanel]);

  // Drag the scrollbar thumb to scroll the chat: map cursor delta to scrollTop
  // using the ratio between the track's free travel and the scrollable distance.
  useEffect(() => {
    if (!isScrubbing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const el = chatContainerRef.current;
      if (!el) return;
      const { scrollHeight, clientHeight } = el;
      const trackHeight = clientHeight;
      const ratio = scrollHeight > 0 ? Math.min(1, clientHeight / scrollHeight) : 1;
      const thumbHeight = Math.max(32, Math.min(ratio * trackHeight, trackHeight * 0.85));
      const trackTravel = Math.max(1, trackHeight - thumbHeight);
      const scrollableDist = scrollHeight - clientHeight;
      const dy = e.clientY - scrubStartRef.current.y;
      el.scrollTop = scrubStartRef.current.scrollTop + (dy / trackTravel) * scrollableDist;
    };
    const handleMouseUp = () => setIsScrubbing(false);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing]);

  // Custom scrollbar for the artifact panel, anchored to its right edge. Mirrors
  // the chat scrollbar: proportional thumb confined to the scrollable content.
  useEffect(() => {
    const el = panelContentRef.current;
    if (!el) return;
    const update = () => {
      const panel = artifactPanelRef.current;
      if (!panel) return;
      const { scrollTop, scrollHeight, clientHeight } = el;
      // Keep the track below the (constant-height) filters bar so it doesn't
      // overlap "Sample from… / Last 30 days / Emotion".
      const filtersH = panelFiltersRef.current?.offsetHeight ?? 0;
      if (scrollHeight <= clientHeight + 1) {
        setPanelScrollbar({ top: 0, height: 0 });
        return;
      }
      const rect = el.getBoundingClientRect();
      const trackTop = rect.top - panel.getBoundingClientRect().top + filtersH;
      const trackHeight = rect.height - filtersH;
      const ratio = Math.min(1, clientHeight / scrollHeight);
      const height = Math.max(32, Math.min(ratio * trackHeight, trackHeight * 0.85));
      const maxOffset = Math.max(0, trackHeight - height);
      const progress = scrollTop / (scrollHeight - clientHeight);
      setPanelScrollbar({ top: trackTop + progress * maxOffset, height });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => {
      el.removeEventListener('scroll', update);
      observer.disconnect();
    };
  }, [showArtifactPanel, selectedArtifact, selectedInsight]);

  // Drag the artifact panel's scrollbar thumb to scroll it.
  useEffect(() => {
    if (!isPanelScrubbing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const el = panelContentRef.current;
      if (!el) return;
      const { scrollHeight, clientHeight } = el;
      const trackHeight = clientHeight;
      const ratio = scrollHeight > 0 ? Math.min(1, clientHeight / scrollHeight) : 1;
      const thumbHeight = Math.max(32, Math.min(ratio * trackHeight, trackHeight * 0.85));
      const trackTravel = Math.max(1, trackHeight - thumbHeight);
      const dy = e.clientY - panelScrubStartRef.current.y;
      el.scrollTop =
        panelScrubStartRef.current.scrollTop +
        (dy / trackTravel) * (scrollHeight - clientHeight);
    };
    const handleMouseUp = () => setIsPanelScrubbing(false);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isPanelScrubbing]);

  // Handle resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const newPx = containerRect.right - e.clientX;

      // Floor keeps the chat column usable; the report panel itself responds to
      // its own width, switching from master/detail (>= 820px) to the narrow
      // stacked summary below that. Capped at 80% so the chat stays usable.
      const minPx = 560;
      const maxPx = containerRect.width * 0.8;
      const constrainedPx = Math.min(Math.max(newPx, minPx), maxPx);
      setPanelWidth((constrainedPx / containerRect.width) * 100);
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

  // Track the actual pixel width of the artifact panel so the report layout
  // can switch between its wide and condensed forms as the user resizes.
  useEffect(() => {
    const el = panelContentRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setPanelPxWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [showArtifactPanel, selectedArtifact]);

  // Below these widths each panel's labelled header buttons show as icons only.
  const artifactActionsIconOnly = panelPxWidth > 0 && panelPxWidth < 700;

  // Track the chat column's width so the header can shed the session name (and
  // collapse its actions into a dropdown) when the column gets too narrow.
  useEffect(() => {
    const el = chatColumnRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setChatColumnPxWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // When the chat column is this narrow, the session name is hidden and its
  // actions fold into a compact dropdown.
  const chatHeaderCompact = chatColumnPxWidth > 0 && chatColumnPxWidth < 560;

  // Data sources shown in the composer's "Data Source" submenu.
  const dataSources = [
    { label: 'Voice', icon: IconPhone, checked: voiceEnabled, set: setVoiceEnabled },
    { label: 'Chat', icon: IconMessageCircle, checked: chatEnabled, set: setChatEnabled },
    { label: 'Email', icon: IconMail, checked: emailEnabled, set: setEmailEnabled },
    { label: 'SMS', icon: IconMessage, checked: smsEnabled, set: setSmsEnabled },
    { label: 'Surveys', icon: IconClipboardList, checked: surveysEnabled, set: setSurveysEnabled },
  ];
  // The default data sources are Voice + Chat. When the selection differs from
  // that default we surface it as a context chip in the composer.
  const isDefaultDataSources =
    voiceEnabled && chatEnabled && !emailEnabled && !smsEnabled && !surveysEnabled;
  const activeDataSourceLabels = dataSources.filter((s) => s.checked).map((s) => s.label);
  const resetDataSources = () => {
    setVoiceEnabled(true);
    setChatEnabled(true);
    setEmailEnabled(false);
    setSmsEnabled(false);
    setSurveysEnabled(false);
  };

  // Shared styling for the composer menu so both input states stay in sync.
  const menuDropdownStyle = {
    padding: 0,
    borderRadius: 8,
    boxShadow:
      '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
  };
  const parentItemStyles = {
    item: {
      padding: '8px 12px',
      fontSize: 14,
      // No bare `&:hover` and no `&[data-expanded]` here: the submenu is rendered
      // inside this item's DOM (withinPortal={false}), so CSS :hover would bleed up
      // from a hovered child item, and data-expanded would keep the parent lit while
      // you're in the submenu. data-hovered is driven by this item's own mouse
      // enter/leave, so only the item actually under the cursor highlights.
      '&[data-hovered]': {
        backgroundColor: '#f8f9fa',
      },
    },
  };
  const outputItemStyles = {
    item: {
      padding: '8px 12px',
      fontSize: 14,
      '&:hover, &[data-hovered]': {
        backgroundColor: '#f8f9fa',
      },
    },
  };

  // The compact "Evidence →" pill that sits at the top-right of each theme
  // section — sized to match the panel header actions. On hover/focus it reveals
  // the theme's representative-voice quote in a popover.
  const renderEvidenceButton = (
    theme: (typeof reportThemes)[number],
    withVoicePopover = false,
  ) => {
    const button = (
      <Button
        variant="default"
        onClick={() => setSelectedInsight(theme)}
        rightSection={<IconArrowRight size={14} />}
        styles={{
          root: {
            flexShrink: 0,
            height: 26,
            borderRadius: 4,
            paddingLeft: 8,
            paddingRight: 8,
            fontSize: 12,
            fontWeight: 550,
            color: '#25252a',
            borderColor: '#d5dce3',
            backgroundColor: '#fff',
          },
          section: {
            marginLeft: 6,
          },
        }}
      >
        Evidence
      </Button>
    );
    if (!withVoicePopover) return button;
    return (
      <Tooltip
        position="bottom-end"
        withArrow={false}
        multiline
        w={300}
        label={
          <Box>
            {/* Oversized quotation mark signals this is a verbatim quote. */}
            <Text
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: 40,
                fontWeight: 700,
                lineHeight: 1,
                color: '#c8ced6',
                height: 22,
              }}
            >
              &ldquo;
            </Text>
            <Text style={{ fontSize: 13.5, lineHeight: 1.5, color: '#3c3c47' }}>
              {theme.quote}
            </Text>
          </Box>
        }
        styles={{
          tooltip: {
            backgroundColor: '#fff',
            border: '1px solid #dee5eb',
            borderRadius: 12,
            padding: '13px 15px',
            boxShadow:
              '0px 1px 2px rgba(36,36,42,0.06), 0px 14px 34px rgba(36,36,42,0.16)',
          },
        }}
      >
        {button}
      </Tooltip>
    );
  };

  // Panel header action (Share / Digest / Download / …). When the panel is
  // narrow we drop the text label and render an icon-only button.
  const renderHeaderAction = (
    icon: ReactNode,
    label: string,
    iconOnly: boolean,
    onClick?: () => void,
  ) => {
    if (iconOnly) {
      return (
        <AppTooltip label={label}>
          <ActionIcon
            variant="default"
            radius={9999}
            onClick={onClick}
            aria-label={label}
            styles={{ root: { width: 30, height: 30, color: '#25252a', borderColor: '#d5dce3' } }}
          >
            {icon}
          </ActionIcon>
        </AppTooltip>
      );
    }
    return (
      <Button
        variant="default"
        size="sm"
        leftSection={icon}
        onClick={onClick}
        styles={{
          root: {
            height: 30,
            borderRadius: 9999,
            fontSize: 12,
            fontWeight: 550,
            color: '#25252a',
            borderColor: '#d5dce3',
          },
        }}
      >
        {label}
      </Button>
    );
  };

  // Irrelevance note + disclaimer + feedback. In the wide view this lives inside
  // the right (scrollable) detail column so it aligns with the content rather
  // than stretching the full panel width; in narrow it spans the column.
  const reportFooter = (
    <Box style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Irrelevance note + disclaimer */}
      <Box
        style={{
          backgroundColor: '#f8f9fa',
          borderRadius: 8,
          padding: '7px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxWidth: 640,
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text size="xs" c="#5d666f">
            5% of the{' '}
            <Text span c="#205ae3" td="underline" inherit>
              conversations
            </Text>{' '}
            are irrelevant to this question.
          </Text>
          <IconInfoCircle size={16} color="#5d666f" />
        </Box>
        <Box style={{ borderTop: '1px solid #dee5eb' }} />
        <Text size="xs" c="#5d666f">
          Analyzed by Cresta's AI Analyst. Please double-check responses.
        </Text>
      </Box>

      {/* Feedback */}
      <Box style={{ display: 'flex' }}>
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: '1px solid #dee2e6',
            backgroundColor: '#fff',
            borderRadius: 4,
            padding: '0 8px',
            height: 26,
          }}
        >
          <ActionIcon variant="subtle" color="gray" size={20}>
            <IconThumbUp size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="gray" size={20}>
            <IconThumbDown size={16} />
          </ActionIcon>
        </Box>
      </Box>
    </Box>
  );

  // Sticky subheader summarizing the artifact's sample + active filters. Shown
  // for every artifact type (reports and charts) so the metadata is consistent.
  const metaForPanel = artifactMeta(selectedArtifact?.type ?? 'chart');
  const metadataBar = (
    <Box
      ref={panelFiltersRef}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 5,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 24,
        padding: '12px 20px',
        backgroundColor: '#f8f9fa',
        boxShadow: '0px 1px 1px rgba(0,0,0,0.1), 0px 1px 1.5px rgba(0,0,0,0.05)',
      }}
    >
      <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <SampleChartIcon height={16} />
        <Text size="xs" fw={550} c="#5d666f">
          Sampled from{' '}
          <Text span inherit fw={700} c={CONVERSATION_COUNT_BLUE}>
            {metaForPanel.count.toLocaleString()}
          </Text>{' '}
          conversations
        </Text>
      </Box>
      <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconCalendar size={16} color="#5d666f" />
        <Text size="xs" fw={550} c="#5d666f">
          {metaForPanel.dateRange}
        </Text>
      </Box>
      <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IconFilter size={16} color="#5d666f" />
        <Text size="xs" fw={550} c="#5d666f">
          {metaForPanel.filter}
        </Text>
      </Box>
    </Box>
  );

  // Evidence-detail view shown inside the report panel when a theme's
  // "View evidence" is clicked (Figma node 514-9941).
  const renderEvidenceDetail = (insight: (typeof reportThemes)[number]) => (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '16px 20px',
      }}
    >
      {/* Back to report */}
      <Box
        onClick={() => setSelectedInsight(null)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          cursor: 'pointer',
          alignSelf: 'flex-start',
        }}
      >
        <IconArrowLeft size={16} color="#212121" />
        <Text size="sm" fw={600} c="#212121">
          Back to report
        </Text>
      </Box>

      {/* Selected insight band */}
      <Box style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
        <Box
          style={{
            width: 6,
            flexShrink: 0,
            backgroundColor: insight.color,
            borderRadius: 2,
          }}
        />
        <Box style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, minWidth: 0 }}>
          <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Text fw={600} c="#212121" style={{ fontSize: 16 }}>
              {insight.pct}%
            </Text>
            <Text fw={600} c="#212121" style={{ fontSize: 16 }}>
              {insight.title}
            </Text>
          </Box>
          <Text c="#5d666f" style={{ fontSize: 14, lineHeight: 1.55 }}>
            {insight.description}
          </Text>
        </Box>
      </Box>

      {/* Evidence list */}
      <Text fw={500} c="#212121" style={{ fontSize: 16 }}>
        Evidence in conversations
      </Text>
      <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {insight.evidence.map((ev, i) => (
          <Box key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Card header */}
            <Box
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: '#f3f2fc',
                borderBottom: '1px solid #ced4da',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8,
                padding: '6px 14px',
              }}
            >
              <IconSparkles size={16} color="#304ffe" style={{ flexShrink: 0 }} />
              <Text fw={500} c="#212121" style={{ fontSize: 13, flex: 1, minWidth: 0 }}>
                {ev.insight}
              </Text>
              <Box
                style={{
                  backgroundColor: '#fff',
                  borderRadius: 6,
                  padding: '2px 8px',
                  flexShrink: 0,
                }}
              >
                <Text c="#6c757d" style={{ fontSize: 12 }}>
                  AI Reasoning
                </Text>
              </Box>
            </Box>

            {/* Card body */}
            <Box
              style={{
                position: 'relative',
                backgroundColor: '#f8f9fa',
                borderBottomLeftRadius: 8,
                borderBottomRightRadius: 8,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              <IconChevronDown
                size={16}
                color="#868e96"
                style={{ position: 'absolute', top: 12, right: 12, cursor: 'pointer' }}
              />
              {ev.rows.map((row, j) => (
                <Box key={j} style={{ display: 'flex', gap: 12, paddingRight: 20 }}>
                  <Text
                    fw={500}
                    c={row.speaker === 'Visitor' ? '#212121' : '#868e96'}
                    style={{ fontSize: 14, width: 44, flexShrink: 0 }}
                  >
                    {row.speaker}
                  </Text>
                  <Text c="#212121" style={{ fontSize: 14, lineHeight: 1.55, flex: 1, minWidth: 0 }}>
                    {row.text}
                  </Text>
                </Box>
              ))}
              {/* Footer */}
              <Box style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text c="#909090" style={{ fontSize: 12 }}>
                  {ev.name}
                </Text>
                <Text c="#909090" style={{ fontSize: 12 }}>
                  •
                </Text>
                <Text c="#909090" style={{ fontSize: 12 }}>
                  {ev.date}
                </Text>
                <Text c="#909090" style={{ fontSize: 12 }}>
                  •
                </Text>
                <Box style={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer' }}>
                  <Text fw={500} c="#304ffe" style={{ fontSize: 12 }}>
                    Full Convo
                  </Text>
                  <IconArrowUpRight size={14} color="#304ffe" />
                </Box>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );

  // The "+" menu and the selected-output chip. Shared by the welcome and sticky
  // composer so the menu logic lives in one place.
  const renderComposerToolbar = () => (
    <Box style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
      <Menu
        opened={plusMenuOpened}
        onChange={setPlusMenuOpened}
        shadow="md"
        position="top-start"
        offset={4}
      >
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" size={26} radius={4}>
            <IconPlus size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown style={menuDropdownStyle}>
          {/* Data Source submenu — stays open while toggling switches.
              withinPortal={false} keeps the dropdown inside the parent dropdown's
              DOM so toggling a Switch isn't treated as an outside click. */}
          <Menu
            trigger="hover"
            position="right-end"
            offset={2}
            openDelay={0}
            closeDelay={200}
            closeOnItemClick={false}
            withinPortal={false}
          >
            <Menu.Target>
              <Menu.Item
                leftSection={<IconBriefcase size={16} />}
                rightSection={<IconChevronRight size={16} />}
                styles={parentItemStyles}
              >
                Use Case
              </Menu.Item>
            </Menu.Target>
            <Menu.Dropdown style={menuDropdownStyle}>
              {dataSources.map((source) => (
                <Box
                  key={source.label}
                  onClick={() => source.set(!source.checked)}
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: 'pointer',
                  }}
                >
                  <Checkbox checked={source.checked} readOnly size="xs" />
                  <source.icon size={16} color="#25252a" />
                  <Text size="sm" fw={425} c="#25252a">
                    {source.label}
                  </Text>
                </Box>
              ))}
            </Menu.Dropdown>
          </Menu>

          {/* Analyze submenu — picking an item selects the output type */}
          <Menu
            trigger="hover"
            position="right-end"
            offset={2}
            openDelay={0}
            closeDelay={200}
            withinPortal={false}
          >
            <Menu.Target>
              <Menu.Item
                leftSection={<IconLoader size={16} />}
                rightSection={<IconChevronRight size={16} />}
                styles={parentItemStyles}
              >
                Analyze
              </Menu.Item>
            </Menu.Target>
            <Menu.Dropdown style={menuDropdownStyle}>
              <Menu.Item
                leftSection={<IconChartLine size={16} />}
                onClick={() => handleOutputTypeSelect('chart')}
                styles={outputItemStyles}
              >
                Chart
              </Menu.Item>
              <Menu.Item
                leftSection={<IconGitCompare size={16} />}
                onClick={() => handleOutputTypeSelect('comparison')}
                styles={outputItemStyles}
              >
                Comparison
              </Menu.Item>
              <Menu.Item
                leftSection={<IconReportAnalytics size={16} />}
                onClick={() => handleOutputTypeSelect('report')}
                styles={outputItemStyles}
              >
                Report
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
      {!isDefaultDataSources && (
        <Button
          variant="default"
          leftSection={<IconBriefcase size={16} />}
          rightSection={
            <CloseButton
              size="xs"
              icon={<IconX size={12} />}
              onClick={(e) => {
                e.stopPropagation();
                resetDataSources();
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
          {activeDataSourceLabels.length > 0
            ? activeDataSourceLabels.join(', ')
            : 'No data sources'}
        </Button>
      )}
    </Box>
  );

  return (
    <Box
      style={{
        height: '100%',
        backgroundColor: '#eef2f5',
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
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'row',
          border: '1px solid #dee5eb',
        }}
      >
        <Box
          ref={chatColumnRef}
          style={{
            // Hidden when the user collapses the chat to give the artifact panel
            // the full window.
            display: chatHidden ? 'none' : 'flex',
            flexDirection: 'column',
            flex: 1,
            // Allow the column to shrink below its content's intrinsic width;
            // without this the centered chat content overflows left (under the
            // nav) when the artifact panel takes most of the width.
            minWidth: 0,
            transition: isResizing ? 'none' : 'width 0.3s ease',
            width: showArtifactPanel ? `${100 - panelWidth}%` : '100%',
          }}
        >
        {/* Chat Header — the session name only appears once a question is asked,
            but the new-chat and history controls are always visible (top left). */}
        <Box
          style={{
            padding: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'transparent',
          }}
        >
          {/* Left group: session title, divider, and the reports-count dropdown
              (Primary Actions). Only present once a conversation has started. */}
          {messages.length > 0 && (
            <>
              {/* Session name — hidden only once the chat column gets too narrow,
                  at which point it folds into the session-actions dropdown below. */}
              {!chatHeaderCompact && (
                <>
                  {isEditingTitle ? (
                    <TextInput
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.currentTarget.value)}
                      onBlur={commitRenameTitle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRenameTitle();
                        if (e.key === 'Escape') cancelRenameTitle();
                      }}
                      autoFocus
                      styles={{
                        input: {
                          width: 240,
                          height: 36,
                          minHeight: 36,
                          fontSize: 16,
                          fontWeight: 550,
                          color: '#25252a',
                          padding: '0 12px',
                          borderRadius: 8,
                          border: '1px solid #dee5eb',
                          backgroundColor: '#fff',
                        },
                      }}
                    />
                  ) : (
                    <EllipsisText
                      fw={550}
                      c="#25252a"
                      onClick={startRenameTitle}
                      style={{
                        fontSize: 16,
                        lineHeight: 1.55,
                        maxWidth: 360,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'text',
                        borderRadius: 4,
                        padding: '0 4px',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      {sessionTitle}
                    </EllipsisText>
                  )}
                  {artifacts.length > 0 && (
                    <Box
                      style={{
                        width: 0,
                        height: 22,
                        borderRight: '1px solid #dee5eb',
                      }}
                    />
                  )}
                </>
              )}
              {artifacts.length > 0 && (
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
                        padding: '4px 8px',
                        borderRadius: 999,
                        transition: 'background-color 0.15s',
                        backgroundColor: showArtifactsDropdown
                          ? '#f1f3f5'
                          : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f3f5';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = showArtifactsDropdown
                          ? '#f1f3f5'
                          : 'transparent';
                      }}
                      onClick={() => setShowArtifactsDropdown(!showArtifactsDropdown)}
                    >
                      <MultiReportIcon size={18} color="#25252a" />
                      <Text size="sm" fw={550} c="#25252a">
                        {artifacts.length}
                      </Text>
                      <IconChevronDown size={16} color="#25252a" />
                    </Box>
                  </Menu.Target>
                  <Menu.Dropdown
                    style={{
                      padding: 4,
                      borderRadius: 8,
                      boxShadow:
                        '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                    }}
                  >
                    {artifacts.map((artifact) => (
                      <Menu.Item
                        key={artifact.id}
                        onClick={() => handleArtifactClick(artifact)}
                        leftSection={
                          artifact.type === 'report' ? (
                            <IconReportAnalytics size={16} color="#25252a" />
                          ) : (
                            <IconChartLine size={16} color="#25252a" />
                          )
                        }
                        styles={{
                          item: {
                            padding: '8px 12px',
                            borderRadius: 6,
                          },
                          itemLabel: {
                            fontSize: 14,
                            fontWeight: 425,
                            color: '#25252a',
                            lineHeight: 1.55,
                            whiteSpace: 'nowrap',
                          },
                          itemSection: {
                            marginRight: 8,
                          },
                        }}
                      >
                        {artifact.title}
                      </Menu.Item>
                    ))}
                  </Menu.Dropdown>
                </Menu>
              )}
            </>
          )}

          {/* Spacer pushes the chat actions to the right edge. */}
          <Box style={{ flex: 1 }} />

          {/* Right group: Chat actions — new chat, history, and the report-panel
              collapse/expand toggle, as compact icon buttons. */}
          <Box style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Session actions (share / rename / delete) live under a three-dot
                dropdown, to the left of the New chat button. */}
            {messages.length > 0 && (
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon variant="subtle" color="gray" size={30} radius={9999}>
                    <IconDots size={16} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown
                  style={{
                    padding: 4,
                    borderRadius: 8,
                    boxShadow:
                      '0px 10px 10px -5px rgba(0,0,0,0.04), 0px 20px 25px -5px rgba(0,0,0,0.05), 0px 1px 3px 0px rgba(0,0,0,0.05)',
                  }}
                >
                  <Menu.Item
                    leftSection={<IconShare size={16} color="#25252a" />}
                    styles={sessionMenuItemStyles}
                  >
                    Share
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconEdit size={16} color="#25252a" />}
                    onClick={openRenameModal}
                    styles={sessionMenuItemStyles}
                  >
                    Rename
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconTrash size={16} color="#e03131" />}
                    onClick={startNewChat}
                    styles={{
                      ...sessionMenuItemStyles,
                      itemLabel: { ...sessionMenuItemStyles.itemLabel, color: '#e03131' },
                    }}
                  >
                    Delete
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
            {/* New-chat is redundant on the landing screen (already a fresh chat),
                so it only appears once a conversation has started. */}
            {messages.length > 0 && (
              <AppTooltip label="New chat">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={30}
                  radius={9999}
                  onClick={startNewChat}
                >
                  <IconPlus size={16} />
                </ActionIcon>
              </AppTooltip>
            )}
            <AppTooltip label="History">
              <ActionIcon
                variant="subtle"
                color="gray"
                size={30}
                radius={9999}
                onClick={() => setHistoryOpen(true)}
              >
                <IconMessages size={16} />
              </ActionIcon>
            </AppTooltip>
            {/* Hide-chat toggle lives here while the chat is visible; once hidden,
                its counterpart in the artifact panel header brings it back. */}
            {showArtifactPanel && selectedArtifact && (
              <AppTooltip label="Hide chat">
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size={30}
                  radius={9999}
                  onClick={() => setChatHidden(true)}
                >
                  <IconChevronsLeft size={16} />
                </ActionIcon>
              </AppTooltip>
            )}
          </Box>
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
              paddingTop: messages.length > 0 ? 0 : 140,
              paddingBottom: messages.length > 0 ? 24 : 0,
            }}
          >
            {/* Chat Messages */}
            {messages.length > 0 && (
              <Stack gap={10} style={{ width: '100%', alignItems: 'flex-end' }}>
                {messages.map((message) => {
                  return (
                  <Box
                    key={message.id}
                    style={{
                      maxWidth: message.role === 'user' ? 500 : '100%',
                      // Artifact cards are a fixed size; other assistant messages fill the column.
                      width:
                        message.role === 'assistant' && !message.artifact ? '100%' : 'auto',
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
                      (() => {
                        const artifact = message.artifact;
                        const cardIdentity =
                          OUTPUT_IDENTITY[artifactIdentityKey(artifact.type)];
                        const CardIcon = cardIdentity.icon;
                        const isReport = artifact.type === 'report';
                        const typeLabel =
                          artifact.type === 'report'
                            ? 'Report'
                            : artifact.type === 'comparison'
                              ? 'Comparison'
                              : 'Chart';
                        // The most prevalent theme summarized in the card subtitle.
                        const topTheme = reportThemes[0];
                        const cardMeta = artifactMeta(artifact.type);
                        // Highlight the card whose artifact is currently open in
                        // the panel with a thin blue outline.
                        const isActiveArtifact =
                          showArtifactPanel && selectedArtifact?.id === artifact.id;
                        return (
                          <Paper
                            ref={(el: HTMLDivElement | null) => {
                              artifactRefs.current[artifact.id] = el;
                            }}
                            shadow="0px 1px 2px rgba(36,36,42,0.04), 0px 4px 12px rgba(36,36,42,0.06)"
                            style={{
                              width: 400,
                              maxWidth: '100%',
                              backgroundColor: '#fff',
                              border: isActiveArtifact
                                ? '1px solid #205ae3'
                                : '1px solid #dee5eb',
                              borderRadius: 12,
                              padding: 16,
                              cursor: 'pointer',
                              transition: 'transform 0.2s, border-color 0.2s',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              if (!isActiveArtifact) {
                                e.currentTarget.style.borderColor = '#cdd5dc';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.borderColor = isActiveArtifact
                                ? '#205ae3'
                                : '#dee5eb';
                            }}
                            onClick={() => handleArtifactClick(artifact)}
                          >
                            {/* Header — tinted icon tile, type label, then title. */}
                            <Box style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <Box
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: 10,
                                  backgroundColor: cardIdentity.background,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <CardIcon size={24} color={cardIdentity.content} />
                              </Box>
                              <Box style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  fw={550}
                                  c="#5d666f"
                                  style={{ fontSize: 12, lineHeight: 1.4 }}
                                >
                                  {typeLabel} ·{' '}
                                  <Text span inherit fw={700} c={CONVERSATION_COUNT_BLUE}>
                                    {cardMeta.count.toLocaleString()}
                                  </Text>{' '}
                                  conversations
                                </Text>
                                <EllipsisText
                                  fw={650}
                                  c="#25252a"
                                  style={{
                                    fontSize: 13.5,
                                    lineHeight: 1.35,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {artifact.title}
                                </EllipsisText>
                              </Box>
                            </Box>

                            {/* Charts and comparisons surface the same sample
                                filters shown in the artifact subheader — plain
                                text, no icons, matching the report card. */}
                            {!isReport && (
                              <Text
                                c="#5d666f"
                                style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}
                              >
                                {cardMeta.dateRange} · {cardMeta.filter}
                              </Text>
                            )}

                            {/* Reports add a theme-distribution bar + summary line. */}
                            {isReport && (
                              <>
                                <Box
                                  style={{
                                    display: 'flex',
                                    gap: 3,
                                    height: 12,
                                    marginTop: 14,
                                  }}
                                >
                                  {reportThemes.map((theme, i) => {
                                    const isFirst = i === 0;
                                    const isLast = i === reportThemes.length - 1;
                                    return (
                                      <Box
                                        key={theme.title}
                                        style={{
                                          flexGrow: theme.pct,
                                          flexBasis: 0,
                                          minWidth: 0,
                                          backgroundColor: theme.color,
                                          borderTopLeftRadius: isFirst ? 6 : 0,
                                          borderBottomLeftRadius: isFirst ? 6 : 0,
                                          borderTopRightRadius: isLast ? 6 : 0,
                                          borderBottomRightRadius: isLast ? 6 : 0,
                                        }}
                                      />
                                    );
                                  })}
                                </Box>
                                <Text
                                  c="#5d666f"
                                  style={{
                                    fontSize: 12.5,
                                    lineHeight: 1.5,
                                    marginTop: 10,
                                  }}
                                >
                                  Top theme: {topTheme.title.toLowerCase()} (
                                  {topTheme.pct}%)
                                </Text>
                              </>
                            )}
                          </Paper>
                        );
                      })()
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
                  );
                })}

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
                {renderComposerToolbar()}
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
                  {quickActions.map((id) => {
                    const identity = OUTPUT_IDENTITY[id];
                    const ActionIconCmp = identity.icon;
                    const isActive = activeCategory === id;
                    return (
                      <Button
                        key={id}
                        variant="default"
                        leftSection={<ActionIconCmp size={16} />}
                        onClick={() => setActiveCategory(id)}
                        styles={{
                          root: {
                            borderRadius: 9999,
                            // Fill stays the light tint; a colored stroke appears
                            // when selected (transparent otherwise to avoid shift).
                            border: `1px solid ${isActive ? identity.border : 'transparent'}`,
                            backgroundColor: identity.background,
                            // Each chip carries its color identity on icon + label.
                            color: identity.content,
                            boxShadow: 'none',
                            '&:hover': {
                              backgroundColor: identity.background,
                              borderColor: identity.border,
                            },
                          },
                          section: {
                            color: identity.content,
                          },
                        }}
                      >
                        {identity.label}
                      </Button>
                    );
                  })}
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
                {renderComposerToolbar()}
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
            {/* Resize divider doubles as the chat's scroll indicator: a full-height
                track holds a thumb whose height reflects how much of the chat is
                visible and whose position follows the scroll offset. Dragging the
                divider resizes the panel (the drag is implicit — the whole bar is
                the grab target). Hidden when the chat is collapsed. */}
            {!chatHidden && (
            <Box
              ref={resizeDividerRef}
              onMouseDown={() => setIsResizing(true)}
              style={{
                width: 12,
                flexShrink: 0,
                cursor: 'col-resize',
                position: 'relative',
                zIndex: 10,
                display: 'flex',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                const thumb = e.currentTarget.firstElementChild as HTMLElement | null;
                if (thumb) thumb.style.backgroundColor = '#a1b0b7';
              }}
              onMouseLeave={(e) => {
                if (!isResizing && !isScrubbing) {
                  const thumb = e.currentTarget.firstElementChild as HTMLElement | null;
                  if (thumb) thumb.style.backgroundColor = '#cdd5dc';
                }
              }}
            >
              <Box
                onMouseDown={(e) => {
                  // Scroll the chat by dragging the thumb; don't trigger resize.
                  e.stopPropagation();
                  e.preventDefault();
                  scrubStartRef.current = {
                    y: e.clientY,
                    scrollTop: chatContainerRef.current?.scrollTop ?? 0,
                  };
                  setIsScrubbing(true);
                }}
                style={{
                  position: 'absolute',
                  top: chatScrollbar.top,
                  left: 2,
                  height: chatScrollbar.height,
                  width: 8,
                  borderRadius: 999,
                  backgroundColor: isResizing || isScrubbing ? '#a1b0b7' : '#cdd5dc',
                  cursor: isScrubbing ? 'grabbing' : 'grab',
                  transition: 'background-color 0.15s',
                }}
              />
            </Box>
            )}
            <Box
              ref={artifactPanelRef}
              style={{
                ...(chatHidden
                  ? { flex: 1, width: '100%', minWidth: 0, borderLeft: 'none' }
                  : {
                      width: `${panelWidth}%`,
                      minWidth: 560,
                      borderLeft: '1px solid #dee5eb',
                    }),
                position: 'relative',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slideIn 0.3s ease-out',
                transition: isResizing ? 'none' : 'width 0.3s ease',
              }}
            >
            {/* Artifact panel scrollbar — thumb on the right edge, drag to scroll */}
            {panelScrollbar.height > 0 && (
              <Box
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  panelScrubStartRef.current = {
                    y: e.clientY,
                    scrollTop: panelContentRef.current?.scrollTop ?? 0,
                  };
                  setIsPanelScrubbing(true);
                }}
                style={{
                  position: 'absolute',
                  right: 3,
                  top: panelScrollbar.top,
                  height: panelScrollbar.height,
                  width: 8,
                  borderRadius: 999,
                  backgroundColor: isPanelScrubbing ? '#a1b0b7' : '#cdd5dc',
                  cursor: isPanelScrubbing ? 'grabbing' : 'grab',
                  zIndex: 20,
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#a1b0b7';
                }}
                onMouseLeave={(e) => {
                  if (!isPanelScrubbing) e.currentTarget.style.backgroundColor = '#cdd5dc';
                }}
              />
            )}
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
              {/* Shown only while the chat is hidden — restores it. The "Hide
                  chat" control lives in the chat header next to History. */}
              {chatHidden && (
                <AppTooltip label="Show chat">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={30}
                    radius={9999}
                    style={{ flexShrink: 0 }}
                    onClick={() => setChatHidden(false)}
                  >
                    <IconChevronsRight size={16} />
                  </ActionIcon>
                </AppTooltip>
              )}
              {(() => {
                const identity = OUTPUT_IDENTITY[artifactIdentityKey(selectedArtifact.type)];
                const HeaderIcon = identity.icon;
                return (
                  <Box
                    title={identity.label}
                    style={{
                      backgroundColor: identity.background,
                      width: 30,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                      flexShrink: 0,
                    }}
                  >
                    <HeaderIcon size={16} color={identity.content} />
                  </Box>
                );
              })()}
              {isEditingArtifactTitle ? (
                <TextInput
                  value={artifactTitleDraft}
                  onChange={(e) => setArtifactTitleDraft(e.currentTarget.value)}
                  onBlur={commitRenameArtifactTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRenameArtifactTitle();
                    if (e.key === 'Escape') cancelRenameArtifactTitle();
                  }}
                  autoFocus
                  styles={{
                    input: {
                      width: 240,
                      height: 36,
                      minHeight: 36,
                      fontSize: 18,
                      fontWeight: 550,
                      color: '#25252a',
                      padding: '0 12px',
                      borderRadius: 8,
                      border: '1px solid #dee5eb',
                      backgroundColor: '#fff',
                    },
                  }}
                />
              ) : (
                <EllipsisText
                  size="lg"
                  fw={550}
                  c="#25252a"
                  onClick={startRenameArtifactTitle}
                  style={{
                    maxWidth: 360,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    minWidth: 0,
                    cursor: 'text',
                    borderRadius: 4,
                    padding: '0 4px',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {selectedArtifact.title}
                </EllipsisText>
              )}
              <Box style={{ flex: 1 }} />
              <Box style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                {selectedArtifact.type === 'report' ? (
                  renderHeaderAction(
                    <IconMail size={16} />,
                    'Digest',
                    artifactActionsIconOnly,
                  )
                ) : (
                  <>
                    {renderHeaderAction(
                      <IconEdit size={16} />,
                      'Edit in Chart builder',
                      artifactActionsIconOnly,
                    )}
                    {renderHeaderAction(
                      <IconLayoutDashboard size={16} />,
                      'Add to Dashboard',
                      artifactActionsIconOnly,
                    )}
                  </>
                )}
                {renderHeaderAction(
                  <IconDownload size={16} />,
                  'Download',
                  artifactActionsIconOnly,
                )}
                <AppTooltip label="Close">
                  <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={30}
                    radius={9999}
                    onClick={() => {
                      setShowArtifactPanel(false);
                      setChatHidden(false);
                      setIsEditingArtifactTitle(false);
                      setTimeout(() => {
                        setSelectedArtifact(null);
                        setSelectedInsight(null);
                      }, 300);
                    }}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </AppTooltip>
              </Box>
            </Box>

            {/* Panel Content */}
            <Box
              ref={panelContentRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {selectedArtifact.type === 'report' ? (
                <>
                  {metadataBar}

                  {selectedInsight ? (
                    renderEvidenceDetail(selectedInsight)
                  ) : (
                  /* Report body — the bounded 640px measure uses auto side
                     margins, so it hugs the left (behind the base 24px gutter)
                     until the panel grows past the measure, then drifts to
                     centered as the extra space splits evenly on both sides. */
                  <Box
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 24,
                      padding: '20px 24px 24px',
                    }}
                  >
                    {/* Theme distribution bar — flat proportional tiles, each its
                        theme color, separated by a small gap. Hovering a tile shows
                        a card with its swatch, name and percentage. */}
                    <Box style={{ width: '100%', maxWidth: 640, marginInline: 'auto' }}>
                      <Box style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: 500, color: '#7e8795' }}>
                          Theme distribution
                        </Text>
                      </Box>
                      <Box style={{ display: 'flex', gap: 3, height: 44 }}>
                        {reportThemes.map((theme, i) => {
                          const isFirst = i === 0;
                          const isLast = i === reportThemes.length - 1;
                          return (
                          <Tooltip
                            key={theme.title}
                            position="top"
                            withArrow={false}
                            label={
                              <Box
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 10,
                                }}
                              >
                                <Box
                                  style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 4,
                                    backgroundColor: theme.color,
                                    flexShrink: 0,
                                  }}
                                />
                                <Text
                                  style={{ fontSize: 13, fontWeight: 600, color: '#25252a' }}
                                >
                                  {theme.title}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: '#25252a',
                                    fontVariantNumeric: 'tabular-nums',
                                  }}
                                >
                                  {theme.pct}%
                                </Text>
                              </Box>
                            }
                            styles={{
                              tooltip: {
                                backgroundColor: '#fff',
                                borderRadius: 12,
                                padding: '10px 14px',
                                boxShadow:
                                  '0px 1px 2px rgba(36,36,42,0.06), 0px 14px 34px rgba(36,36,42,0.16)',
                              },
                            }}
                          >
                            <Box
                              style={{
                                flexGrow: theme.pct,
                                flexBasis: 0,
                                minWidth: 0,
                                backgroundColor: theme.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                                // Only the bar's outermost four corners are rounded.
                                borderTopLeftRadius: isFirst ? 8 : 0,
                                borderBottomLeftRadius: isFirst ? 8 : 0,
                                borderTopRightRadius: isLast ? 8 : 0,
                                borderBottomRightRadius: isLast ? 8 : 0,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: labelOnColor(theme.color),
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {theme.pct}%
                              </Text>
                            </Box>
                          </Tooltip>
                          );
                        })}
                      </Box>
                    </Box>

                    {/* Stacked theme sections — the document outline / "Top areas"
                        rail is gone in both views; each theme now leads with its
                        own color swatch beside the title. The wide view keeps the
                        same type sizes and bounded measure, just centered. */}
                    <Box
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        width: '100%',
                        maxWidth: 640,
                        marginInline: 'auto',
                      }}
                    >
                      {reportThemes.map((theme, i) => (
                        <Box
                          key={theme.title}
                          style={{
                            ...(i > 0 ? { marginTop: 20 } : {}),
                          }}
                        >
                          <Box
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              minWidth: 0,
                              maxWidth: 640,
                              marginBottom: 10,
                            }}
                          >
                            {/* Color swatch — moved here from the outline so each
                                title carries its own theme color in both views. */}
                            <Box
                              style={{
                                width: 13,
                                height: 13,
                                borderRadius: 4,
                                backgroundColor: theme.color,
                                flexShrink: 0,
                              }}
                            />
                            <Text
                              style={{
                                fontSize: 16,
                                lineHeight: 1.2,
                                fontWeight: 600,
                                color: '#25252a',
                              }}
                            >
                              {theme.title}
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: 500,
                                color: '#7e8795',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {theme.pct}%
                            </Text>
                            {/* Spacer pushes the compact Evidence pill to the
                                top-right of the section. */}
                            <Box style={{ flex: 1 }} />
                            {renderEvidenceButton(theme, true)}
                          </Box>
                          <Text
                            style={{
                              fontSize: 13.5,
                              lineHeight: 1.6,
                              color: '#25252a',
                              maxWidth: 640,
                            }}
                          >
                            {theme.description}
                          </Text>
                        </Box>
                      ))}
                      <Box style={{ marginTop: 32 }}>{reportFooter}</Box>
                    </Box>
                  </Box>
                  )}
                </>
              ) : (
                <>
                {metadataBar}
                <Box
                  style={{
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
                </>
              )}
            </Box>
            </Box>
          </>
        )}
      </Box>

      {/* Rename-session modal (Design System node 15950:17101). */}
      <Modal
        opened={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        centered
        size={600}
        radius={16}
        padding={32}
        withCloseButton={false}
        overlayProps={{ backgroundOpacity: 0.4, blur: 1 }}
        styles={{
          content: {
            boxShadow:
              '0px 7px 3.5px rgba(0,0,0,0.04), 0px 10px 7.5px rgba(0,0,0,0.05), 0px 1px 1.5px rgba(0,0,0,0.05)',
          },
        }}
      >
        <Stack gap={16}>
          {/* Header: title + close */}
          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 18, fontWeight: 550, color: '#212121', lineHeight: 1.4 }}>
              Rename session
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              size={24}
              onClick={() => setRenameModalOpen(false)}
            >
              <IconX size={18} />
            </ActionIcon>
          </Box>

          {/* Input: header label + field */}
          <Box style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: 650, color: '#25252a', lineHeight: 1.55 }}>
              Session name
            </Text>
            <TextInput
              value={renameModalDraft}
              onChange={(e) => setRenameModalDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRenameModal();
              }}
              placeholder="Session name"
              autoFocus
              styles={{
                input: {
                  height: 36,
                  minHeight: 36,
                  fontSize: 14,
                  color: '#25252a',
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid #dee5eb',
                },
              }}
            />
          </Box>

          {/* Footer actions */}
          <Box style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'flex-end' }}>
            <Button variant="subtle" color="gray" onClick={() => setRenameModalOpen(false)}>
              Cancel
            </Button>
            <Button color="blue" onClick={commitRenameModal} disabled={!renameModalDraft.trim()}>
              Rename
            </Button>
          </Box>
        </Stack>
      </Modal>

      <HistoryPanel
        opened={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={loadSession}
      />
    </Box>
  );
};

export default LandingPage;
