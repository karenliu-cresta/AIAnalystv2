import { Group, TextInput, Button, Avatar, Text, Box, Menu } from '@mantine/core';
import {
  IconBriefcase,
  IconChevronDown,
  IconSearch,
  IconHeadphones,
  IconBell,
  IconFlag,
} from '@tabler/icons-react';

const AppHeader = () => {
  return (
    <Box
      style={{
        height: 52,
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#ffffff',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left side - Use case selector and breadcrumbs */}
      <Group gap="md">
        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconBriefcase size={16} />}
              rightSection={<IconChevronDown size={12} />}
              styles={{
                root: {
                  height: 34,
                },
                label: {
                  fontSize: '14px',
                },
              }}
            >
              Ocean Insurance
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item>Ocean Insurance</Menu.Item>
            <Menu.Item>Tech Solutions</Menu.Item>
            <Menu.Item>Retail Corp</Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Text size="sm" c="dimmed">
          /
        </Text>

        <Text size="sm" fw={500}>
          AI Analyst
        </Text>
      </Group>

      {/* Center - Search */}
      <TextInput
        placeholder="Search or ask"
        leftSection={<IconSearch size={16} />}
        rightSection={
          <Group gap={4}>
            <Text size="xs" c="dimmed">
              ⌘K
            </Text>
          </Group>
        }
        styles={{
          root: {
            width: 300,
          },
          input: {
            fontSize: '14px',
            backgroundColor: '#f8f9fa',
            border: 'none',
          },
        }}
      />

      {/* Right side - Actions and profile */}
      <Group gap="xs">
        <Button variant="subtle" color="gray" p="xs">
          <IconHeadphones size={20} />
        </Button>

        <Button variant="subtle" color="gray" p="xs">
          <IconBell size={20} />
        </Button>

        <Menu shadow="md" width={150}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconFlag size={16} />}
              rightSection={<IconChevronDown size={12} />}
              p="xs"
            >
              🇺🇸
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection="🇺🇸">English</Menu.Item>
            <Menu.Item leftSection="🇪🇸">Spanish</Menu.Item>
            <Menu.Item leftSection="🇫🇷">French</Menu.Item>
          </Menu.Dropdown>
        </Menu>

        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Avatar
              color="blue"
              radius="xl"
              size="sm"
              style={{ cursor: 'pointer' }}
            >
              K
            </Avatar>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Karen Liu</Menu.Label>
            <Menu.Item>Profile</Menu.Item>
            <Menu.Item>Settings</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red">Logout</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Box>
  );
};

export default AppHeader;
