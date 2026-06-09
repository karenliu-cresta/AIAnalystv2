import { Box, Flex } from '@mantine/core';
import NavMenu from './components/NavMenu';
import AppHeader from './components/AppHeader';
import LandingPage from './pages/LandingPage';

function App() {
  return (
    <Flex h="100vh">
      <NavMenu />
      <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AppHeader />
        <Box style={{ flex: 1, overflow: 'auto' }}>
          <LandingPage />
        </Box>
      </Box>
    </Flex>
  );
}

export default App;
