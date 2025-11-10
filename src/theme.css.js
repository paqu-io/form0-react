// src/theme.css.js
import { createThemeContract, createTheme } from '@vanilla-extract/css';

export const vars = createThemeContract({
  color: {
    background: '',
    foreground: '',
    border: '',
    primary: '',
    error: '',
    section: '',
    sectionBorder: '',
    sectionHeader: '',
    // Add button colors
    buttonBg: '',
    buttonFg: '',
    buttonBorder: '',
    buttonHoverBg: '',
    buttonHoverFg: '',
    buttonHoverBorder: '',
    // Optionally, add special drilldown/back button colors
    drilldownButtonBg: '',
    drilldownButtonFg: '',
    backButtonBg: '',
    backButtonFg: '',
  },
  borderRadius: '',
  fontSize: {
    base: '',
    label: '',
    section: '',
  },
  lineHeight: {
    tight: '',
    normal: '',
    relaxed: '',
  },
  spacing: {
    xs: '',
    sm: '',
    md: '',
    lg: '',
  },
});

// Standard theme (light)
export const standardThemeLight = createTheme(vars, {
  color: {
    background: '#fff',
    foreground: '#111',
    border: '#e5e7eb',
    primary: '#111',
    error: '#e11d48',
    section: '#f9fafb',
    sectionBorder: '#e5e7eb',
    sectionHeader: '#111',
    buttonBg: '#ff007a', // vivid pink
    buttonFg: '#fff',
    buttonBorder: '#ff007a',
    buttonHoverBg: '#d6006b',
    buttonHoverFg: '#fff',
    buttonHoverBorder: '#d6006b',
    drilldownButtonBg: '#00c2ff', // vivid cyan
    drilldownButtonFg: '#fff',
    backButtonBg: '#ffe600', // vivid yellow
    backButtonFg: '#111',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});

// Standard theme (dark)
export const standardThemeDark = createTheme(vars, {
  color: {
    background: '#18181b',
    foreground: '#f3f4f6',
    border: '#27272a',
    primary: '#38bdf8',
    error: '#f87171',
    section: '#232326',
    sectionBorder: '#27272a',
    sectionHeader: '#38bdf8',
    buttonBg: '#00ffae', // vivid green
    buttonFg: '#18181b',
    buttonBorder: '#00ffae',
    buttonHoverBg: '#00c98a',
    buttonHoverFg: '#18181b',
    buttonHoverBorder: '#00c98a',
    drilldownButtonBg: '#ff5e00', // vivid orange
    drilldownButtonFg: '#fff',
    backButtonBg: '#ff00e6', // vivid magenta
    backButtonFg: '#fff',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});

// Modal theme (light)
export const modalThemeLight = createTheme(vars, {
  color: {
    background: '#f3f4f6',
    foreground: '#111',
    border: '#d1d5db',
    primary: '#2563eb',
    error: '#e11d48',
    section: '#fff',
    sectionBorder: '#d1d5db',
    sectionHeader: '#2563eb',
    buttonBg: '#ff007a', // vivid pink
    buttonFg: '#fff',
    buttonBorder: '#ff007a',
    buttonHoverBg: '#d6006b',
    buttonHoverFg: '#fff',
    buttonHoverBorder: '#d6006b',
    drilldownButtonBg: '#00c2ff', // vivid cyan
    drilldownButtonFg: '#fff',
    backButtonBg: '#ffe600', // vivid yellow
    backButtonFg: '#111',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});

// Modal theme (dark)
export const modalThemeDark = createTheme(vars, {
  color: {
    background: '#232326',
    foreground: '#f3f4f6',
    border: '#3f3f46',
    primary: '#60a5fa',
    error: '#f87171',
    section: '#18181b',
    sectionBorder: '#27272a',
    sectionHeader: '#60a5fa',
    buttonBg: '#00ffae', // vivid green
    buttonFg: '#18181b',
    buttonBorder: '#00ffae',
    buttonHoverBg: '#00c98a',
    buttonHoverFg: '#18181b',
    buttonHoverBorder: '#00c98a',
    drilldownButtonBg: '#ff5e00', // vivid orange
    drilldownButtonFg: '#fff',
    backButtonBg: '#ff00e6', // vivid magenta
    backButtonFg: '#fff',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});

// Simplified theme (light)
export const simplifiedThemeLight = createTheme(vars, {
  color: {
    background: '#fff',
    foreground: '#111',
    border: '#e5e7eb',
    primary: '#10b981',
    error: '#e11d48',
    section: '#f0fdf4',
    sectionBorder: '#a7f3d0',
    sectionHeader: '#10b981',
    buttonBg: '#ff007a', // vivid pink
    buttonFg: '#fff',
    buttonBorder: '#ff007a',
    buttonHoverBg: '#d6006b',
    buttonHoverFg: '#fff',
    buttonHoverBorder: '#d6006b',
    drilldownButtonBg: '#00c2ff', // vivid cyan
    drilldownButtonFg: '#fff',
    backButtonBg: '#ffe600', // vivid yellow
    backButtonFg: '#111',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});

// Simplified theme (dark)
export const simplifiedThemeDark = createTheme(vars, {
  color: {
    background: '#18181b',
    foreground: '#f3f4f6',
    border: '#10b981',
    primary: '#6ee7b7',
    error: '#f87171',
    section: '#134e4a',
    sectionBorder: '#10b981',
    sectionHeader: '#6ee7b7',
    buttonBg: '#00ffae', // vivid green
    buttonFg: '#18181b',
    buttonBorder: '#00ffae',
    buttonHoverBg: '#00c98a',
    buttonHoverFg: '#18181b',
    buttonHoverBorder: '#00c98a',
    drilldownButtonBg: '#ff5e00', // vivid orange
    drilldownButtonFg: '#fff',
    backButtonBg: '#ff00e6', // vivid magenta
    backButtonFg: '#fff',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});

// Spotlight theme (light)
export const spotlightThemeLight = createTheme(vars, {
  color: {
    background: '#fff',
    foreground: '#111',
    border: '#e5e7eb',
    primary: '#111',
    error: '#e11d48',
    section: '#f9fafb',
    sectionBorder: '#e5e7eb',
    sectionHeader: '#111',
    buttonBg: '#ff007a', // vivid pink
    buttonFg: '#fff',
    buttonBorder: '#ff007a',
    buttonHoverBg: '#d6006b',
    buttonHoverFg: '#fff',
    buttonHoverBorder: '#d6006b',
    drilldownButtonBg: '#00c2ff', // vivid cyan
    drilldownButtonFg: '#fff',
    backButtonBg: '#ffe600', // vivid yellow
    backButtonFg: '#111',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});

// Spotlight theme (dark)
export const spotlightThemeDark = createTheme(vars, {
  color: {
    background: '#18181b',
    foreground: '#f3f4f6',
    border: '#27272a',
    primary: '#38bdf8',
    error: '#f87171',
    section: '#232326',
    sectionBorder: '#27272a',
    sectionHeader: '#38bdf8',
    buttonBg: '#00ffae', // vivid green
    buttonFg: '#18181b',
    buttonBorder: '#00ffae',
    buttonHoverBg: '#00c98a',
    buttonHoverFg: '#18181b',
    buttonHoverBorder: '#00c98a',
    drilldownButtonBg: '#ff5e00', // vivid orange
    drilldownButtonFg: '#fff',
    backButtonBg: '#ff00e6', // vivid magenta
    backButtonFg: '#fff',
  },
  borderRadius: '0px',
  fontSize: {
    base: '0.875rem',
    label: '0.875rem',
    section: '0.95rem',
  },
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.625',
  },
  spacing: {
    xs: '0.125rem',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
  },
});
