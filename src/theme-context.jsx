import React, { createContext, useContext } from 'react';

export const ThemeContext = createContext('');

export function ThemeProvider({ children, themeClass }) {
  return (
    <ThemeContext.Provider value={themeClass}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeClass() {
  return useContext(ThemeContext);
}
