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
  },
  borderRadius: '',
  fontSize: {
    base: '',
    label: '',
    section: '',
  },
  spacing: {
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
  },
  borderRadius: '8px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
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
  },
  borderRadius: '8px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
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
  },
  borderRadius: '12px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.75rem',
    md: '1.25rem',
    lg: '2.5rem',
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
  },
  borderRadius: '12px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.75rem',
    md: '1.25rem',
    lg: '2.5rem',
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
  },
  borderRadius: '6px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
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
  },
  borderRadius: '6px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
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
  },
  borderRadius: '8px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
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
  },
  borderRadius: '8px',
  fontSize: {
    base: '1rem',
    label: '1rem',
    section: '1.125rem',
  },
  spacing: {
    sm: '0.5rem',
    md: '1rem',
    lg: '2rem',
  },
});
