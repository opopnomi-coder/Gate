// API Configuration for MyGate App
// VERSION: 5.0.0 - Dynamic IP Discovery

// ============================================
// BACKEND URL CONFIGURATION - DYNAMIC
// ============================================

// Get backend URL dynamically
const getBackendUrl = (): string => {
  // Priority 1: Environment variable (for production/staging)
  const envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL;
  if (envUrl) {
    console.log('📍 Using environment URL:', envUrl);
    return envUrl;
  }
  
  // Priority 2: Use Expo Constants to get dev server URL (for local development)
  try {
    const Constants = require('expo-constants').default;
    // Check if we are in development mode
    const isDev = __DEV__;
    
    if (isDev && Constants.expoConfig?.hostUri) {
      // Extract IP from hostUri (format: "192.168.1.100:8081")
      const ip = Constants.expoConfig.hostUri.split(':')[0];
      const autoUrl = `http://${ip}:8080/api`;
      console.log('📍 Auto-detected Local URL:', autoUrl);
      return autoUrl;
    }
  } catch (error) {
    // Ignore
  }
  
  // Priority 3: Fallback to localhost (for web/emulator)
  return 'https://ritgate-backend.onrender.com/api';
};

export const API_CONFIG = {
  BASE_URL: getBackendUrl(),
  TIMEOUT: 30000, 
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  
  // List of possible backend URLs to try (only used for local discovery/fallback)
  POSSIBLE_URLS: [
    'https://ritgate-backend.onrender.com/api',
    'http://10.0.2.2:8080/api', // Android emulator
  ],
};

// Railway MySQL Database Info (for reference)
// Database: railway
// Host: ballast.proxy.rlwy.net:13320
// Tables: students, staff, hods, security_personnel, qr_table, scan_logs, notifications

// OTP Configuration
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  RESEND_DELAY_SECONDS: 60,
};

// QR Code Configuration
export const QR_CONFIG = {
  SCAN_DELAY: 2000, // 2 seconds between scans
  EXPIRY_HOURS: 24,
};

// Modern App Theme - Based on Professional UI Design
export const THEME = {
  colors: {
    // Primary Colors
    primary: '#1E40AF',        // Deep Blue
    primaryLight: '#3B82F6',   // Light Blue
    primaryDark: '#1E3A8A',    // Darker Blue
    
    // Secondary Colors
    secondary: '#1E293B',      // Navy
    secondaryLight: '#334155', // Light Navy
    
    // Status Colors
    success: '#10B981',        // Green
    successLight: '#D1FAE5',   // Light Green Background
    warning: '#F59E0B',        // Orange
    warningLight: '#FEF3C7',   // Light Orange Background
    error: '#EF4444',          // Red
    errorLight: '#FEE2E2',     // Light Red Background
    info: '#3B82F6',           // Blue
    infoLight: '#DBEAFE',      // Light Blue Background
    
    // Background Colors
    background: '#F8FAFC',     // Light Gray Background
    backgroundDark: '#F1F5F9', // Slightly Darker Background
    card: '#FFFFFF',           // White Card
    cardElevated: '#FFFFFF',   // Elevated Card (with shadow)
    
    // Text Colors
    text: '#1E293B',           // Primary Text (Navy)
    textSecondary: '#64748B',  // Secondary Text (Gray)
    textTertiary: '#94A3B8',   // Tertiary Text (Light Gray)
    textInverse: '#FFFFFF',    // White Text (on dark backgrounds)
    
    // Border Colors
    border: '#E2E8F0',         // Light Border
    borderDark: '#CBD5E1',     // Darker Border
    borderFocus: '#3B82F6',    // Focus Border (Blue)
    
    // Role-Specific Colors (for dashboards)
    student: '#06B6D4',        // Cyan
    studentGradient: ['#06B6D4', '#0891B2'],
    staff: '#8B5CF6',          // Purple
    staffGradient: ['#8B5CF6', '#7C3AED'],
    hod: '#F59E0B',            // Amber
    hodGradient: ['#F59E0B', '#D97706'],
    hr: '#10B981',             // Green
    hrGradient: ['#10B981', '#059669'],
    security: '#1E40AF',       // Blue
    securityGradient: ['#1E40AF', '#1E3A8A'],
    
    // Overlay Colors
    overlay: 'rgba(0, 0, 0, 0.5)',
    overlayLight: 'rgba(0, 0, 0, 0.3)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    full: 9999,
  },
  fontSize: {
    xs: 11,
    sm: 12,
    md: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    huge: 32,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 5,
    },
    xl: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

// Role Detection Patterns
export const ROLE_PATTERNS = {
  HOD: /HOD/i,                          // Contains "HOD"
  HR: /^HR\d+$/i,                       // Starts with HR followed by numbers (e.g., HR001)
  SECURITY: /^SEC\d+$/i,                // Starts with SEC followed by numbers
  STAFF: /^[A-Z]{2,3}\d+$/,             // 2-3 letters followed by numbers (e.g., AD121, CS101)
  STUDENT: /^\d+$/,                     // Only numbers (e.g., 2117240030007)
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_DATA: '@mygate_user_data',
  USER_ROLE: '@mygate_user_role',
  AUTH_TOKEN: '@mygate_auth_token',
  BACKEND_URL: '@mygate_backend_url',
};

// Optional: list of fallback backend URLs for health check (api.service can use if needed)
export const POSSIBLE_BACKEND_URLS: string[] = [
  'https://ritgate-backend.onrender.com/api',
];
