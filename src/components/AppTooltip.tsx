import { Tooltip } from '@mantine/core';
import type { FloatingPosition, TooltipProps } from '@mantine/core';
import type { ReactNode } from 'react';

// Shared tooltip styled to the Design System spec (node 10476:23327): dark
// #25252a background, white body text, 2px radius, soft three-layer shadow, and
// a beak pointing back at the trigger. Used by the collapsed nav rail and the
// chat / artifact icon action buttons.
const AppTooltip = ({
  label,
  position = 'bottom',
  children,
  ...rest
}: {
  label: string;
  position?: FloatingPosition;
  children: ReactNode;
} & Omit<TooltipProps, 'label' | 'position' | 'children'>) => (
  <Tooltip
    label={label}
    position={position}
    withArrow
    arrowSize={8}
    offset={8}
    transitionProps={{ transition: 'fade', duration: 100 }}
    color="#25252a"
    radius={2}
    styles={{
      tooltip: {
        padding: '6px 8px',
        fontSize: 14,
        fontWeight: 425,
        lineHeight: 1.55,
        color: '#fff',
        boxShadow:
          '0px 7px 3.5px rgba(0,0,0,0.04), 0px 10px 7.5px rgba(0,0,0,0.05), 0px 1px 1.5px rgba(0,0,0,0.05)',
      },
    }}
    {...rest}
  >
    {children}
  </Tooltip>
);

export default AppTooltip;
