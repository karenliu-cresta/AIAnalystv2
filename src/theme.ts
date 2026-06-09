import { createTheme, MantineColorsTuple } from '@mantine/core';

// Primary blue color scale from Figma Design System
const primaryBlue: MantineColorsTuple = [
  '#E6F4FF', // Primary-blue/0
  '#BAE0FF', // Primary-blue/1
  '#91CAFF', // Primary-blue/2
  '#69B1FF', // Primary-blue/3
  '#4096FF', // Primary-blue/4
  '#1677FF', // Primary-blue/5
  '#0958D9', // Primary-blue/6 - Links, Buttons, CTAs
  '#003EB3', // Primary-blue/7
  '#002C8C', // Primary-blue/8
  '#001D66', // Primary-blue/9
];

// Gray color scale from Figma Design System
const gray: MantineColorsTuple = [
  '#FFFFFF',
  '#FAFAFA',
  '#F5F5F5',
  '#F0F0F0',
  '#D9D9D9',
  '#BFBFBF',
  '#8C8C8C',
  '#595959', // Gray/7 - Label text
  '#434343', // Gray/8 - Text
  '#262626', // Gray/9 - Main body text
];

export const theme = createTheme({
  primaryColor: 'blue',
  colors: {
    blue: primaryBlue,
    gray: gray,
  },

  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif',

  fontSizes: {
    xs: '12px',    // Caption
    sm: '14px',    // Small
    md: '16px',    // Base
    lg: '18px',    // Large
    xl: '20px',    // Title Regular
  },

  spacing: {
    xs: '4px',     // XXS
    sm: '8px',     // XS
    md: '12px',    // SM
    lg: '16px',    // MD/BASE
    xl: '24px',    // LG
  },

  radius: {
    xs: '2px',
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },

  headings: {
    fontWeight: '600',
    sizes: {
      h1: { fontSize: '38px', lineHeight: '1.2' }, // Title Page
      h2: { fontSize: '30px', lineHeight: '1.3' }, // Title Section
      h3: { fontSize: '24px', lineHeight: '1.35' }, // Title Large
      h4: { fontSize: '20px', lineHeight: '1.4' }, // Title Regular
      h5: { fontSize: '16px', lineHeight: '1.5' }, // Title Small
      h6: { fontSize: '14px', lineHeight: '1.5' }, // Title Caption
    },
  },

  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Textarea: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});
