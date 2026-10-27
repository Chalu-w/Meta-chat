import React, { createContext, useContext, useState, useEffect } from 'react';
import { ThemeMode } from '../types.js';

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('oromochat_theme') as ThemeMode;
    return saved === 'telegram-dark' || saved === 'telegram-night' || saved === 'telegram-light'
      ? saved
      : 'telegram-dark';
  });

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    localStorage.setItem('oromochat_theme', newTheme);
  };

  const toggleTheme = () => {
    if (theme === 'telegram-dark') setTheme('telegram-night');
    else if (theme === 'telegram-night') setTheme('telegram-light');
    else setTheme('telegram-dark');
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.className = `theme-${theme}`;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
