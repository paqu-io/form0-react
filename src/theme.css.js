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
    // Icon colors
    icon: '',
    iconHover: '',
    // View/Edit banners
    bannerViewBg: '',
    bannerViewFg: '',
    bannerViewBorder: '',
    bannerEditBg: '',
    bannerEditFg: '',
    bannerEditBorder: '',
  },
  borderRadius: '',
  fontFamily: {
    base: '',
  },
  fontSize: {
    base: '',
    button: '',
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
    xl: '',
  },
});

// One neutral palette is shared by every presentation. Hosts and starter templates add brand
// colour by passing their own theme built from `vars`.
const lightColors = {
  background: '#ffffff',
  foreground: '#14171c',
  border: '#d5dae1',
  primary: '#2356d8', // accent: focus, selection, links
  error: '#c4291c',
  section: '#f6f7f9',
  sectionBorder: '#d5dae1',
  sectionHeader: '#14171c',
  buttonBg: '#14171c', // primary action: ink
  buttonFg: '#ffffff',
  buttonBorder: '#14171c',
  buttonHoverBg: '#343941',
  buttonHoverFg: '#ffffff',
  buttonHoverBorder: '#343941',
  drilldownButtonBg: '#eceef2',
  drilldownButtonFg: '#14171c',
  backButtonBg: '#eceef2',
  backButtonFg: '#14171c',
  icon: '#596373',
  iconHover: '#14171c',
  bannerViewBg: '#fdf3d7',
  bannerViewFg: '#7a4b00',
  bannerViewBorder: '#f0d58a',
  bannerEditBg: '#e8eefb',
  bannerEditFg: '#1d44a8',
  bannerEditBorder: '#b9c9f2',
};

const darkColors = {
  background: '#171a1f',
  foreground: '#e9ecf1',
  border: '#2f353e',
  primary: '#8aabff',
  error: '#ff8f80',
  section: '#1d2127',
  sectionBorder: '#2f353e',
  sectionHeader: '#e9ecf1',
  buttonBg: '#e9ecf1',
  buttonFg: '#14171c',
  buttonBorder: '#e9ecf1',
  buttonHoverBg: '#cdd2da',
  buttonHoverFg: '#14171c',
  buttonHoverBorder: '#cdd2da',
  drilldownButtonBg: '#272c34',
  drilldownButtonFg: '#e9ecf1',
  backButtonBg: '#272c34',
  backButtonFg: '#e9ecf1',
  icon: '#9aa4b2',
  iconHover: '#e9ecf1',
  bannerViewBg: '#3a2e10',
  bannerViewFg: '#f5d98a',
  bannerViewBorder: '#6b5518',
  bannerEditBg: '#1a2540',
  bannerEditFg: '#a9c1ff',
  bannerEditBorder: '#33487a',
};

const scale = {
  borderRadius: '0.5rem',
  fontFamily: {
    base: 'Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  fontSize: {
    base: '0.875rem',
    button: '0.875rem',
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
    xl: '1.5rem',
  },
};

const lightTheme = { color: lightColors, ...scale };
const darkTheme = { color: darkColors, ...scale };

export const standardThemeLight = createTheme(vars, lightTheme);
export const standardThemeDark = createTheme(vars, darkTheme);
export const modalThemeLight = createTheme(vars, lightTheme);
export const modalThemeDark = createTheme(vars, darkTheme);
export const simplifiedThemeLight = createTheme(vars, lightTheme);
export const simplifiedThemeDark = createTheme(vars, darkTheme);
export const spotlightThemeLight = createTheme(vars, lightTheme);
export const spotlightThemeDark = createTheme(vars, darkTheme);
