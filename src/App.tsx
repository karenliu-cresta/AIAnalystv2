import { useEffect, useState } from 'react';
import { Box } from '@mantine/core';
import NavMenu from './components/NavMenu';
import AppHeader from './components/AppHeader';
import LandingPage from './pages/LandingPage';
import { useAnalystStore } from './store/useAnalystStore';

function App() {
  // The nav collapses to an icon rail. Opening an artifact panel auto-collapses
  // it to make room, but the collapse button always stays authoritative — the
  // user can expand or collapse at any time, even while a panel is open.
  const artifactOpen = useAnalystStore((s) => s.artifactOpen);
  const [collapsed, setCollapsed] = useState(false);

  // Auto-collapse when an artifact panel opens (fires only on the open edge, so
  // it doesn't fight a manual toggle afterward).
  useEffect(() => {
    if (artifactOpen) setCollapsed(true);
  }, [artifactOpen]);

  return (
    <Box style={{ display: 'flex', height: '100vh', backgroundColor: '#eef2f5' }}>
      {/* Left Navigation */}
      <Box
        style={{
          width: collapsed ? 64 : 250,
          height: '100vh',
          backgroundColor: '#eef2f5',
          flexShrink: 0,
          transition: 'width 0.2s ease',
        }}
      >
        <NavMenu
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </Box>

      {/* Right Side: Header + Main Content */}
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* App Header */}
        <Box
          style={{
            height: 52,
            backgroundColor: '#eef2f5',
            flexShrink: 0,
          }}
        >
          <AppHeader />
        </Box>

        {/* Main Content */}
        <Box style={{ flex: 1, overflow: 'auto' }}>
          <LandingPage />
        </Box>
      </Box>
    </Box>
  );
}

export default App;
