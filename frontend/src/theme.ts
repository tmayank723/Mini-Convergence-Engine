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

/** Deep navy and bright blue palette for night mode. */
export const darkColours: ColourTokens = {
  surface: '#111b2b',
  'surface-container': '#1a2940',
  'surface-container-high': '#253752',
  'on-surface': '#f1f5fc',
  'on-surface-variant': '#b8c6dc',
  'outline-variant': '#3a4f70',
  primary: '#7ba9ff',
  'on-primary': '#10213d',
  tertiary: '#69c5f8',
  error: '#ff9a91',
  nebula: '#2c4770',
  moon: '#afcfff',
  strong: '#79d4a3',
  medium: '#f0bf68',
  weak: '#aab8cd',
};

/** Clear blue and pale sky palette for daytime. */
export const lightColours: ColourTokens = {
  surface: '#edf3fc',
  'surface-container': '#fbfdff',
  'surface-container-high': '#e0eafa',
  'on-surface': '#1b2b43',
  'on-surface-variant': '#536783',
  'outline-variant': '#c4d3e9',
  primary: '#2858a5',
  'on-primary': '#ffffff',
  tertiary: '#4c86d6',
  error: '#a84343',
  nebula: '#b9d1f2',
  moon: '#7795bc',
  strong: '#26785d',
  medium: '#916315',
  weak: '#71819b',
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
