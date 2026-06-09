import { Box } from '@mantine/core';
import NavMenu from './components/NavMenu';
import AppHeader from './components/AppHeader';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Box style={{ display: 'flex', height: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* Left Navigation */}
      <Box
        style={{
          width: 250,
          height: '100vh',
          backgroundColor: '#eef2f5',
          flexShrink: 0,
        }}
      >
        <NavMenu />
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
