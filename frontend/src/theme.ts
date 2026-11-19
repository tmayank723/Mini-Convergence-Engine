import { createTheme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark';

export type ColourTokens = {
  surface: string;
  'surface-container': string;
  'surface-container-high': string;
  'on-surface': string;
  'on-surface-variant': string;
  'outline-variant': string;
  primary: string;
  'on-primary': string;
  tertiary: string;
  error: string;
  nebula: string;
  moon: string;
  strong: string;
  medium: string;
  weak: string;
};

/** Plum-and-saffron palette for the optional night mode. */
export const darkColours: ColourTokens = {
  surface: '#211d31',
  'surface-container': '#2d2740',
  'surface-container-high': '#3a3250',
  'on-surface': '#fff7df',
  'on-surface-variant': '#c9bfd7',
  'outline-variant': '#514766',
  primary: '#f1cf48',
  'on-primary': '#29213a',
  tertiary: '#f09b6b',
  error: '#ff9b91',
  nebula: '#514266',
  moon: '#f5e6ae',
  strong: '#85d0a6',
  medium: '#efc95a',
  weak: '#aaa0b9',
};

/** Sunlit lemon, dark plum and coral palette for daytime. */
export const lightColours: ColourTokens = {
  surface: '#fff3a8',
  'surface-container': '#fffbe6',
  'surface-container-high': '#ffef91',
  'on-surface': '#29243b',
  'on-surface-variant': '#625b70',
  'outline-variant': '#e4d67e',
  primary: '#47356d',
  'on-primary': '#fffbe6',
  tertiary: '#c75a3b',
  error: '#a63d38',
  nebula: '#f9d94c',
  moon: '#7c6b92',
  strong: '#347450',
  medium: '#9a6b16',
  weak: '#777180',
};

export const THEME_STORAGE_KEY = 'mce-theme';

export function coloursForMode(mode: ThemeMode): ColourTokens {
  return mode === 'dark' ? darkColours : lightColours;
}

export function colourVariablesFor(mode: ThemeMode): Record<string, string> {
  const colours = coloursForMode(mode);
  return Object.fromEntries(Object.entries(colours).map(([name, value]) => [`--${name}`, value]));
}

const sharedTypography = {
  fontFamily: "'Manrope', 'Helvetica Neue', Helvetica, Arial, sans-serif",
  h1: {
    fontFamily: "'Space Grotesk', 'Helvetica Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '-0.04em',
  },
  h2: {
    fontFamily: "'Space Grotesk', 'Helvetica Neue', sans-serif",
    fontWeight: 700,
    letterSpacing: '-0.025em',
  },
  h3: {
    fontFamily: "'Space Grotesk', 'Helvetica Neue', sans-serif",
    fontWeight: 600,
    letterSpacing: '-0.015em',
  },
} as const;

export function createAppTheme(mode: ThemeMode) {
  const colours = coloursForMode(mode);
  const muiMode = mode === 'dark' ? 'dark' : 'light';

  return createTheme({
    palette: {
      mode: muiMode,
      primary: { main: colours.primary, contrastText: colours['on-primary'] },
      secondary: { main: colours.tertiary },
      error: { main: colours.error },
      background: {
        default: colours.surface,
        paper: colours['surface-container'],
      },
      text: {
        primary: colours['on-surface'],
        secondary: colours['on-surface-variant'],
      },
      divider: colours['outline-variant'],
    },
    typography: sharedTypography,
    shape: { borderRadius: 14 },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiTextField: { defaultProps: { variant: 'outlined', fullWidth: true } },
      MuiButton: { defaultProps: { disableElevation: true } },
      MuiToggleButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 999,
          },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colours.moon,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colours.primary,
            },
          },
        },
      },
    },
  });
}

/** @deprecated Use createAppTheme('dark') — kept so older imports do not break silently. */
export const colours = darkColours;
export const colourVariables = colourVariablesFor('dark');
export const theme = createAppTheme('dark');
