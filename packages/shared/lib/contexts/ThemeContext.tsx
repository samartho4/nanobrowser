import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, themeStorageService } from '@extension/storage/lib/settings/theme';

export interface ThemeContextValue {
  theme: Theme;
  isDarkMode: boolean;
  isLightMode: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme from storage
  useEffect(() => {
    const initializeTheme = async () => {
      try {
        const savedTheme = await themeStorageService.getTheme();
        setThemeState(savedTheme);

        // Apply theme to document
        document.documentElement.setAttribute('data-theme', savedTheme);
      } catch (error) {
        console.error('Failed to initialize theme:', error);
        // Fallback to dark theme
        setThemeState('dark');
        document.documentElement.setAttribute('data-theme', 'dark');
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();

    // Listen for theme changes from other extension pages
    themeStorageService.onThemeChange(newTheme => {
      setThemeState(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    });
  }, []);

  const setTheme = async (newTheme: Theme) => {
    try {
      await themeStorageService.setTheme(newTheme);
      setThemeState(newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    } catch (error) {
      console.error('Failed to set theme:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const value: ThemeContextValue = {
    theme,
    isDarkMode: theme === 'dark',
    isLightMode: theme === 'light',
    toggleTheme,
    setTheme,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
