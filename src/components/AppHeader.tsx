import { Group, TextInput, Button, Avatar, Text, Box, Menu, ActionIcon } from '@mantine/core';
import {
  IconBriefcase,
  IconChevronDown,
  IconSearch,
  IconHeadphones,
  IconBell,
  IconCommand,
} from '@tabler/icons-react';

const AppHeader = () => {
  return (
    <Box
      style={{
        height: 52,
        backgroundColor: '#eef2f5',
        padding: '6px 12px',
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
                  paddingLeft: 6,
                  paddingRight: 6,
                },
                label: {
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#25252a',
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

        <Text size="sm" c="#5d666f">
          /
        </Text>

        <Text size="sm" fw={500} c="#25252a">
          AI Analyst
        </Text>
      </Group>

      {/* Center - Search */}
      <TextInput
        placeholder="Search or ask"
        leftSection={<IconSearch size={16} />}
        rightSection={
          <Group gap={2}>
            <IconCommand size={13} color="#a1b0b7" />
            <Text size="xs" c="#a1b0b7" fw={500}>
              K
            </Text>
          </Group>
        }
        styles={{
          root: {
            width: 237,
          },
          input: {
            fontSize: '14px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee5eb',
            borderRadius: 123,
            height: 40,
            color: '#a1b0b7',
          },
        }}
      />

      {/* Right side - Actions and profile */}
      <Group gap="xs">
        <ActionIcon variant="subtle" color="gray" size="lg">
          <IconHeadphones size={14} />
        </ActionIcon>

        <ActionIcon variant="subtle" color="gray" size="lg">
          <IconBell size={14} />
        </ActionIcon>

        <Menu shadow="md" width={150}>
          <Menu.Target>
            <Button
              variant="subtle"
              color="gray"
              rightSection={<IconChevronDown size={16} />}
              styles={{
                root: {
                  height: 34,
                  paddingLeft: 8,
                  paddingRight: 8,
                },
              }}
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
              color="cyan"
              radius="xl"
              size={32}
              styles={{
                root: {
                  cursor: 'pointer',
                  border: '1px solid #dee5eb',
                },
                placeholder: {
                  backgroundColor: '#d1ecfa',
                  color: 'rgba(0, 0, 0, 0.6)',
                  fontSize: '14px',
                },
              }}
            >
              P
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
