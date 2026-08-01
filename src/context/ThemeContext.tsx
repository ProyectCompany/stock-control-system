import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'marron' | 'dark' | 'pastel' | 'celeste' | 'beige';

interface ThemeOption {
  id: ThemeMode;
  name: string;
  badgeBg: string;
  badgeText: string;
  previewBg: string;
  previewCard: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'marron',
    name: 'Marrón Claro',
    badgeBg: 'bg-[#2D2926]',
    badgeText: 'text-[#F7F3EF]',
    previewBg: '#F7F3EF',
    previewCard: '#EFE9E2'
  },
  {
    id: 'dark',
    name: 'Modo Oscuro',
    badgeBg: 'bg-[#0F172A]',
    badgeText: 'text-emerald-400',
    previewBg: '#0F172A',
    previewCard: '#1E293B'
  },
  {
    id: 'pastel',
    name: 'Color Pastel',
    badgeBg: 'bg-[#581C87]',
    badgeText: 'text-purple-200',
    previewBg: '#FAF5FF',
    previewCard: '#F3E8FF'
  },
  {
    id: 'celeste',
    name: 'Color Celeste',
    badgeBg: 'bg-[#0369A1]',
    badgeText: 'text-sky-100',
    previewBg: '#F0F9FF',
    previewCard: '#E0F2FE'
  },
  {
    id: 'beige',
    name: 'Color Beige',
    badgeBg: 'bg-[#4A3E3D]',
    badgeText: 'text-amber-100',
    previewBg: '#FAF8F5',
    previewCard: '#F2ECE4'
  }
];

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = 'stock_control_theme_mode';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode;
      if (saved && ['marron', 'dark', 'pastel', 'celeste', 'beige'].includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to load theme preference:', e);
    }
    return 'marron';
  });

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save theme preference:', e);
    }
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
