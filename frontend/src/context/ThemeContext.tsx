import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Token types ─────────────────────────────────────────────────────────────
export interface Theme {
  type: 'light' | 'dark';
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  cardBackground: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  surfaceHighlight: string;
  inputBackground: string;
  gradients: {
    primary: string[];
    secondary: string[];
    error: string[];
  };
}

export type TextStyleMode = 'solid' | 'gradient';

export type ThemePresetId = 'ocean' | 'neon' | 'sunset' | 'minimal';

export interface ThemePreset {
  id: ThemePresetId;
  name: string;
  description: string;
  preview: string[];   // [primary, secondary, accent, bg]
  light: Partial<Theme>;
  dark: Partial<Theme>;
}

// ─── 4 Premium Presets ────────────────────────────────────────────────────────
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'ocean',
    name: 'Executive Blue',
    description: 'Corporate and reliable',
    preview: ['#1D4ED8', '#2563EB', '#0EA5E9', '#F8FAFC'],
    light: {
      primary: '#1D4ED8',
      secondary: '#2563EB',
      accent: '#0EA5E9',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      cardBackground: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#1E3A8A',
      textTertiary: '#475569',
      textInverse: '#FFFFFF',
      border: '#E2E8F0',
      surfaceHighlight: '#F1F5F9',
      inputBackground: '#F8FAFC',
      gradients: {
        primary: ['#1D4ED8', '#2563EB'],
        secondary: ['#2563EB', '#0EA5E9'],
        error: ['#EF4444', '#DC2626'],
      },
    },
    dark: {
      primary: '#60A5FA',
      secondary: '#3B82F6',
      accent: '#38BDF8',
      background: '#0B1220',
      surface: '#0F172A',
      cardBackground: '#111827',
      text: '#E2E8F0',
      textSecondary: '#CBD5E1',
      textTertiary: '#94A3B8',
      textInverse: '#0B1220',
      border: '#1E293B',
      surfaceHighlight: '#1E293B',
      inputBackground: '#0F172A',
      gradients: {
        primary: ['#60A5FA', '#3B82F6'],
        secondary: ['#3B82F6', '#38BDF8'],
        error: ['#EF4444', '#DC2626'],
      },
    },
  },
  {
    id: 'neon',
    name: 'Emerald Pro',
    description: 'Balanced and modern',
    preview: ['#059669', '#10B981', '#34D399', '#F0FDF4'],
    light: {
      primary: '#059669',
      secondary: '#10B981',
      accent: '#34D399',
      background: '#F0FDF4',
      surface: '#FFFFFF',
      cardBackground: '#FFFFFF',
      text: '#052E16',
      textSecondary: '#14532D',
      textTertiary: '#166534',
      textInverse: '#FFFFFF',
      border: '#BBF7D0',
      surfaceHighlight: '#DCFCE7',
      inputBackground: '#F0FDF4',
      gradients: {
        primary: ['#059669', '#10B981'],
        secondary: ['#10B981', '#34D399'],
        error: ['#FF4D6D', '#C9184A'],
      },
    },
    dark: {
      primary: '#34D399',
      secondary: '#10B981',
      accent: '#6EE7B7',
      background: '#052E16',
      surface: '#064E3B',
      cardBackground: '#065F46',
      text: '#ECFDF5',
      textSecondary: '#D1FAE5',
      textTertiary: '#A7F3D0',
      textInverse: '#052E16',
      border: '#0F766E',
      surfaceHighlight: '#047857',
      inputBackground: '#064E3B',
      gradients: {
        primary: ['#34D399', '#10B981'],
        secondary: ['#10B981', '#059669'],
        error: ['#FF4D6D', '#C9184A'],
      },
    },
  },
  {
    id: 'sunset',
    name: 'Royal Violet',
    description: 'Premium and refined',
    preview: ['#6D28D9', '#7C3AED', '#A78BFA', '#F5F3FF'],
    light: {
      primary: '#6D28D9',
      secondary: '#7C3AED',
      accent: '#8B5CF6',
      background: '#F5F3FF',
      surface: '#FFFFFF',
      cardBackground: '#FFFFFF',
      text: '#2E1065',
      textSecondary: '#4C1D95',
      textTertiary: '#6D28D9',
      textInverse: '#FFFFFF',
      border: '#DDD6FE',
      surfaceHighlight: '#EDE9FE',
      inputBackground: '#F5F3FF',
      gradients: {
        primary: ['#6D28D9', '#7C3AED'],
        secondary: ['#7C3AED', '#A78BFA'],
        error: ['#EF4444', '#DC2626'],
      },
    },
    dark: {
      primary: '#C4B5FD',
      secondary: '#A78BFA',
      accent: '#C4B5FD',
      background: '#1E1B4B',
      surface: '#312E81',
      cardBackground: '#3730A3',
      text: '#F5F3FF',
      textSecondary: '#DDD6FE',
      textTertiary: '#C4B5FD',
      textInverse: '#1E1B4B',
      border: '#4C1D95',
      surfaceHighlight: '#4338CA',
      inputBackground: '#312E81',
      gradients: {
        primary: ['#C4B5FD', '#8B5CF6'],
        secondary: ['#8B5CF6', '#6D28D9'],
        error: ['#EF4444', '#DC2626'],
      },
    },
  },
  {
    id: 'minimal',
    name: 'Slate Mono',
    description: 'Minimal enterprise look',
    preview: ['#0F172A', '#1E293B', '#475569', '#F8FAFC'],
    light: {
      primary: '#0F172A',
      secondary: '#1E293B',
      accent: '#475569',
      background: '#F8FAFC',
      surface: '#FFFFFF',
      cardBackground: '#FFFFFF',
      text: '#0F172A',
      textSecondary: '#1E293B',
      textTertiary: '#64748B',
      textInverse: '#FFFFFF',
      border: '#E2E8F0',
      surfaceHighlight: '#F1F5F9',
      inputBackground: '#F8FAFC',
      gradients: {
        primary: ['#0F172A', '#1E293B'],
        secondary: ['#1E293B', '#475569'],
        error: ['#EF4444', '#DC2626'],
      },
    },
    dark: {
      primary: '#E2E8F0',
      secondary: '#CBD5E1',
      accent: '#94A3B8',
      background: '#020617',
      surface: '#0F172A',
      cardBackground: '#111827',
      text: '#F8FAFC',
      textSecondary: '#CBD5E1',
      textTertiary: '#94A3B8',
      textInverse: '#020617',
      border: '#1E293B',
      surfaceHighlight: '#1F2937',
      inputBackground: '#0F172A',
      gradients: {
        primary: ['#E2E8F0', '#94A3B8'],
        secondary: ['#CBD5E1', '#64748B'],
        error: ['#EF4444', '#DC2626'],
      },
    },
  },
];

// ─── Base themes (fallback) ───────────────────────────────────────────────────
const BASE_LIGHT: Theme = {
  type: 'light',
  primary: '#22D3EE',
  secondary: '#0EA5E9',
  accent: '#22D3EE',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  cardBackground: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#06B6D4',
  surfaceHighlight: '#F3F4F6',
  inputBackground: '#F9FAFB',
  gradients: {
    primary: ['#22D3EE', '#0EA5E9'],
    secondary: ['#0EA5E9', '#3B82F6'],
    error: ['#EF4444', '#DC2626'],
  },
};

const BASE_DARK: Theme = {
  type: 'dark',
  primary: '#22D3EE',
  secondary: '#0EA5E9',
  accent: '#22D3EE',
  background: '#0F172A',
  surface: '#1E293B',
  cardBackground: '#1E293B',
  text: '#F1F5F9',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  textInverse: '#0F172A',
  border: '#334155',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#06B6D4',
  surfaceHighlight: '#334155',
  inputBackground: '#1E293B',
  gradients: {
    primary: ['#22D3EE', '#0EA5E9'],
    secondary: ['#0EA5E9', '#3B82F6'],
    error: ['#EF4444', '#DC2626'],
  },
};

// ─── Context type ─────────────────────────────────────────────────────────────
interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  activePreset: ThemePresetId;
  textStyleMode: TextStyleMode;
  transitioning: boolean;
  toggleTheme: () => void;
  applyPreset: (presetId: ThemePresetId) => void;
  setTextStyleMode: (mode: TextStyleMode) => void;
  resetTheme: () => void;
  /** Animated opacity value (0→1) that fires on every theme change — use for fade transitions */
  transitionOpacity: Animated.Value;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// ─── Storage helpers (user-specific keys) ────────────────────────────────────
const storageKey = (suffix: string, userId?: string) =>
  userId ? `theme_${suffix}_${userId}` : `theme_${suffix}`;

// ─── Provider ─────────────────────────────────────────────────────────────────
export const ThemeProvider: React.FC<{ children: ReactNode; userId?: string }> = ({
  children,
  userId,
}) => {
  const [isDark, setIsDark] = useState(false);
  const [activePreset, setActivePreset] = useState<ThemePresetId>('ocean');
  const [textStyleMode, setTextStyleModeState] = useState<TextStyleMode>('solid');
  const [transitioning, setTransitioning] = useState(false);
  const transitionOpacity = useRef(new Animated.Value(1)).current;

  // Load on mount / userId change
  useEffect(() => {
    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    try {
      const [savedMode, savedPreset, savedTextStyle] = await Promise.all([
        AsyncStorage.getItem(storageKey('mode', userId)),
        AsyncStorage.getItem(storageKey('preset', userId)),
        AsyncStorage.getItem(storageKey('textStyle', userId)),
      ]);
      if (savedMode)   setIsDark(savedMode === 'dark');
      if (savedPreset) setActivePreset(savedPreset as ThemePresetId);
      if (savedTextStyle === 'solid' || savedTextStyle === 'gradient') {
        setTextStyleModeState(savedTextStyle);
      }
    } catch (e) {
      console.error('ThemeContext: load error', e);
    }
  };

  // Keep theme switching instant (no dim/blur effect).
  const runTransition = useCallback((action: () => void) => {
    setTransitioning(true);
    action();
    transitionOpacity.setValue(1);
    setTransitioning(false);
  }, [transitionOpacity]);

  // ── Toggle dark / light ───────────────────────────────────────────────────
  const toggleTheme = useCallback(() => {
    runTransition(() => {
      const next = !isDark;
      setIsDark(next);
      AsyncStorage.setItem(storageKey('mode', userId), next ? 'dark' : 'light').catch(() => {});
    });
  }, [isDark, userId, runTransition]);

  // ── Apply preset ──────────────────────────────────────────────────────────
  const applyPreset = useCallback((presetId: ThemePresetId) => {
    runTransition(() => {
      setActivePreset(presetId);
      Promise.all([
        AsyncStorage.setItem(storageKey('preset', userId), presetId),
      ]).catch(() => {});
    });
  }, [userId, runTransition]);

  const setTextStyleMode = useCallback((mode: TextStyleMode) => {
    setTextStyleModeState(mode);
    AsyncStorage.setItem(storageKey('textStyle', userId), mode).catch(() => {});
  }, [userId]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetTheme = useCallback(() => {
    runTransition(() => {
      setActivePreset('ocean');
      setIsDark(false);
      Promise.all([
        AsyncStorage.setItem(storageKey('preset', userId), 'ocean'),
        AsyncStorage.setItem(storageKey('mode', userId), 'light'),
      ]).catch(() => {});
    });
  }, [userId, runTransition]);

  // ── Build active theme ────────────────────────────────────────────────────
  const buildTheme = (): Theme => {
    const base = isDark ? { ...BASE_DARK } : { ...BASE_LIGHT };
    base.type = isDark ? 'dark' : 'light';
    const preset = THEME_PRESETS.find(p => p.id === activePreset);
    if (preset) {
      const presetColors = isDark ? preset.dark : preset.light;
      Object.assign(base, presetColors);
    }
    return { ...base, type: isDark ? 'dark' : 'light' };
  };

  const theme = buildTheme();

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        activePreset,
        textStyleMode,
        transitioning,
        toggleTheme,
        applyPreset,
        setTextStyleMode,
        resetTheme,
        transitionOpacity,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
