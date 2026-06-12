import { Text } from '@mantine/core';
import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from 'react';
import type { FloatingPosition, TextProps } from '@mantine/core';
import AppTooltip from './AppTooltip';

type EllipsisTextProps = TextProps &
  Omit<ComponentPropsWithoutRef<'p'>, keyof TextProps | 'color'> & {
    // Full text shown in the tooltip when the content is truncated. Defaults to
    // `children` when that's a plain string.
    tooltipLabel?: string;
    tooltipPosition?: FloatingPosition;
  };

// A Mantine Text that reveals its full content in the styled tooltip only when
// it's actually cut off by ellipsis truncation. The caller still supplies the
// truncation styles (whiteSpace / overflow / textOverflow), so layouts are
// unchanged — this only adds the overflow-aware tooltip.
const EllipsisText = ({
  children,
  tooltipLabel,
  tooltipPosition = 'bottom',
  ...props
}: EllipsisTextProps) => {
  const ref = useRef<HTMLParagraphElement>(null);
  const [truncated, setTruncated] = useState(false);
  const label = tooltipLabel ?? (typeof children === 'string' ? children : '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setTruncated(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  return (
    <AppTooltip label={label} position={tooltipPosition} disabled={!truncated || !label}>
      <Text ref={ref} {...props}>
        {children}
      </Text>
    </AppTooltip>
  );
};

export default EllipsisText;
