"use strict";
// API Configuration for MyGate App
// VERSION: 5.0.0 - Dynamic IP Discovery
Object.defineProperty(exports, "__esModule", { value: true });
exports.POSSIBLE_BACKEND_URLS = exports.STORAGE_KEYS = exports.ROLE_PATTERNS = exports.THEME = exports.QR_CONFIG = exports.OTP_CONFIG = exports.API_CONFIG = void 0;
// ============================================
// BACKEND URL CONFIGURATION - DYNAMIC
// ============================================
// Get backend URL dynamically
var getBackendUrl = function () {
    var _a;
    // Priority 1: Environment variable (for production/staging)
    var envUrl = process.env.EXPO_PUBLIC_API_URL || process.env.API_BASE_URL;
    if (envUrl) {
        console.log('📍 Using environment URL:', envUrl);
        return envUrl;
    }
    // Priority 2: Expo manifest URL (auto-detect from Metro bundler)
    // This automatically uses the same IP as the Expo dev server
    if (typeof window !== 'undefined' && window.location) {
        var hostname = window.location.hostname;
        if (hostname && hostname !== 'localhost') {
            var autoUrl = "http://".concat(hostname, ":8080/api");
            console.log('📍 Auto-detected URL from Expo:', autoUrl);
            return autoUrl;
        }
    }
    // Priority 3: Use Expo Constants to get dev server URL
    try {
        var Constants = require('expo-constants').default;
        if ((_a = Constants.expoConfig) === null || _a === void 0 ? void 0 : _a.hostUri) {
            // Extract IP from hostUri (format: "192.168.1.100:8081")
            var ip = Constants.expoConfig.hostUri.split(':')[0];
            var autoUrl = "http://".concat(ip, ":8080/api");
            console.log('📍 Auto-detected URL from Constants:', autoUrl);
            return autoUrl;
        }
    }
    catch (error) {
        console.log('⚠️  Could not auto-detect IP from Constants');
    }
    // Priority 4: Fallback to localhost (for web/emulator)
    console.log('📍 Using fallback URL: localhost');
    return 'https://ritgate-backend.onrender.com/api';
};
exports.API_CONFIG = {
    BASE_URL: getBackendUrl(),
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
    // List of possible backend URLs to try (for health check)
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
exports.OTP_CONFIG = {
    LENGTH: 6,
    EXPIRY_MINUTES: 5,
    RESEND_DELAY_SECONDS: 60,
};
// QR Code Configuration
exports.QR_CONFIG = {
    SCAN_DELAY: 2000, // 2 seconds between scans
    EXPIRY_HOURS: 24,
};
// App Theme
exports.THEME = {
    colors: {
        primary: '#06B6D4',
        secondary: '#1F2937',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        background: '#F5F7FA',
        card: '#FFFFFF',
        text: '#1F2937',
        textSecondary: '#6B7280',
        border: '#E5E7EB',
    },
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
    },
    fontSize: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 24,
        xxl: 32,
    },
};
// Role Detection Patterns
exports.ROLE_PATTERNS = {
    HOD: /HOD/i, // Contains "HOD"
    SECURITY: /^SEC\d+$/i, // Starts with SEC followed by numbers
    STAFF: /^[A-Z]{2,3}\d+$/, // 2-3 letters followed by numbers (e.g., AD121, CS101)
    STUDENT: /^\d+$/, // Only numbers (e.g., 2117240030007)
};
// Storage Keys
exports.STORAGE_KEYS = {
    USER_DATA: '@mygate_user_data',
    USER_ROLE: '@mygate_user_role',
    AUTH_TOKEN: '@mygate_auth_token',
    BACKEND_URL: '@mygate_backend_url',
};
// Optional: list of fallback backend URLs for health check (api.service can use if needed)
exports.POSSIBLE_BACKEND_URLS = [
    'http://192.168.29.119:8080/api',
    'https://ritgate-backend.onrender.com/api',
];
