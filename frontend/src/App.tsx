// CLEAN VERSION OF APP.TSX - Only SmartGate Screens
// This is the corrected version that should replace the current App.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Alert,
  BackHandler,
  Animated,
  ToastAndroid,
  Platform,
  AppState,
} from 'react-native';
import ThemedText from './components/ThemedText';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Student, Staff, HOD, HR, SecurityPersonnel, NonTeachingFaculty, UserType, UserRole, ScreenName } from './types';
import { offlineStorage } from './services/offlineStorage';
import { professionalTheme } from './styles/professionalTheme';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { ActionLockProvider, useActionLock } from './context/ActionLockContext';
import { RefreshProvider, useRefresh } from './context/RefreshContext';

// ✅ ONLY SmartGate Screens
import HomeScreen from './screens/HomeScreen';
import LoadingScreen from './screens/LoadingScreen';
import ModernUnifiedLoginScreen from './screens/auth/ModernUnifiedLoginScreen';
import BiometricGateScreen from './screens/auth/BiometricGateScreen';
import StudentDashboardContainer from './screens/student/StudentDashboardContainer';
import StaffDashboardContainer from './screens/staff/StaffDashboardContainer';
import HODDashboardContainer from './screens/hod/HODDashboardContainer';
import HRDashboardContainer from './screens/hr/HRDashboardContainer';
import HRApprovalScreen from './screens/hr/HRApprovalScreen';
import SecurityDashboardContainer from './screens/security/SecurityDashboardContainer';
import ProfileScreen from './screens/shared/ProfileScreen';
import EntryExitHistoryScreen from './screens/student/EntryExitHistoryScreen';
import GatePassRequestScreen from './screens/student/GatePassRequestScreen';
import MyQRCodesScreen from './screens/student/MyQRCodesScreen';
import RequestsScreen from './screens/student/RequestsScreen';
import GuestPreRequestScreen from './screens/shared/GuestPreRequestScreen';
import HODGatePassRequestScreen from './screens/hod/HODGatePassRequestScreen';
import HODMyRequestsScreen from './screens/hod/HODMyRequestsScreen';
import HODBulkGatePassScreen from './screens/hod/HODBulkGatePassScreen';
// ✅ NEW Modern Staff Screens
import ModernBulkGatePassScreen from './screens/staff/ModernBulkGatePassScreen';
import MyRequestsScreen from './screens/staff/MyRequestsScreen';
// ✅ Non-Teaching Faculty Screens
import NTFDashboardContainer from './screens/ntf/NTFDashboardContainer';
import NTFMyRequestsScreen from './screens/ntf/NTFMyRequestsScreen';
import NCIDashboardContainer from './screens/nci/NCIDashboardContainer';
import NCIMyRequestsScreen from './screens/nci/NCIMyRequestsScreen';
import NCIExitsScreen from './screens/nci/NCIExitsScreen';
import AdminDashboardContainer from './screens/admin/AdminDashboardContainer';
import NotificationsScreen from './screens/shared/NotificationsScreen';
import SwipeBackWrapper from './components/SwipeBackWrapper';
import ErrorBoundary from './components/ErrorBoundary';
import ExitConfirmModal from './components/navigation/ExitConfirmModal';
import { initPushNotifications, unregisterPushToken, setupNotificationTapHandler, handleInitialNotification, setupFCMForegroundHandler } from './services/pushNotification.service';
import { getInitialNotificationData } from './services/localNotification.service';
import { biometricAuthService } from './services/biometricAuth.service';
import { runNotificationOnboarding, logDeviceNotificationInfo } from './utils/notificationOnboarding';
import BatteryOptimizationGateScreen from './screens/auth/BatteryOptimizationGateScreen';
import { getAllNotificationSettings } from './services/batteryOptimization.service';
import { apiService } from './services/api.service';

// Inner component that can access ThemeContext for transition animation
const ThemedApp: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { transitionOpacity, theme } = useTheme();
  return (
    <Animated.View style={[{ flex: 1, opacity: transitionOpacity }, { backgroundColor: theme.background }]}>
      {children}
    </Animated.View>
  );
};

// Reads isLocked from ActionLockContext to block swipe during API calls
const AppNavigator: React.FC<{
  children: React.ReactNode;
  isRootScreen: boolean;
  isLoading: boolean;
  onBack: () => void;
}> = ({ children, isRootScreen, isLoading, onBack }) => {
  const { isLocked, swipeLocked } = useActionLock();
  return (
    <SwipeBackWrapper
      enabled={!isLoading}
      locked={isLocked || swipeLocked}
      onBack={onBack}
    >
      {children}
    </SwipeBackWrapper>
  );
};

// Screens that show exit confirmation on back press
const EXIT_SCREENS: ScreenName[] = [
  'HOME', 'DASHBOARD', 'STAFF_DASHBOARD', 'HOD_DASHBOARD',
  'HR_DASHBOARD', 'SECURITY_DASHBOARD', 'UNIFIED_LOGIN', 'NTF_DASHBOARD', 'NCI_DASHBOARD', 'ADMIN_DASHBOARD',
];

const App: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [student, setStudent] = React.useState<Student | null>(null);
  const { triggerRefresh } = useRefresh();
  const [staff, setStaff] = React.useState<Staff | null>(null);
  const [hod, setHod] = React.useState<HOD | null>(null);
  const [hr, setHr] = React.useState<HR | null>(null);
  const [ntf, setNtf] = React.useState<NonTeachingFaculty | null>(null);
  const [nci, setNci] = React.useState<NonTeachingFaculty | null>(null);
  const [admin, setAdmin] = React.useState<NonTeachingFaculty | null>(null);
  const [selectedRequest, setSelectedRequest] = React.useState<any>(null);
  const [security, setSecurity] = React.useState<SecurityPersonnel | null>(null);
  const [currentScreen, setCurrentScreen] = React.useState<ScreenName>('HOME');
  const [userType, setUserType] = React.useState<UserType | null>(null);
  const [requiresBiometricGate, setRequiresBiometricGate] = React.useState(false);
  const [biometricVerified, setBiometricVerified] = React.useState(false);
  const [biometricLoading, setBiometricLoading] = React.useState(false);
  const [biometricMessage, setBiometricMessage] = React.useState('');
  const [biometricPrompted, setBiometricPrompted] = React.useState(false);

  // Battery optimization gate
  const [batteryGateChecked, setBatteryGateChecked] = React.useState(false);
  const [batteryOptimizationOK, setBatteryOptimizationOK] = React.useState(false);

  // Double-back-to-exit tracking
  const lastBackPress = useRef<number>(0);
  const [showExitToast, setShowExitToast] = React.useState(false);
  const exitToastTimer = useRef<NodeJS.Timeout | null>(null);

  // Exit animation (Home swipe-back)
  const [exitAnimating, setExitAnimating] = React.useState(false);
  const exitOpacity = useRef(new Animated.Value(0)).current;
  const exitTranslateY = useRef(new Animated.Value(12)).current;

  // ── Notification tap → screen navigation ────────────────────────────────
  // Use a ref so handlers always read the latest userType without re-registering
  const userTypeRef = useRef<UserType | null>(null);
  userTypeRef.current = userType;

  // Pending route from killed-state notification (fires before auth is restored)
  const pendingRouteRef = useRef<string | null>(null);

  const applyRoute = React.useCallback((route: string) => {
    if (!route) return;
    const r = route.toLowerCase();
    const ut = userTypeRef.current;
    if (r.includes('my-requests') || r.includes('my_requests')) {
      if (ut === 'STUDENT') setCurrentScreen('REQUESTS');
      else if (ut === 'STAFF') setCurrentScreen('MY_REQUESTS');
      else if (ut === 'HOD') setCurrentScreen('HOD_MY_REQUESTS');
      else if (ut === 'NON_TEACHING') setCurrentScreen('NTF_MY_REQUESTS');
      else if (ut === 'NON_CLASS_INCHARGE') setCurrentScreen('NCI_MY_REQUESTS');
    } else if (r.includes('pending-approvals') || r.includes('pending_approvals')) {
      if (ut === 'STAFF') setCurrentScreen('STAFF_DASHBOARD');
      else if (ut === 'HOD') setCurrentScreen('HOD_DASHBOARD');
      else if (ut === 'HR') setCurrentScreen('HR_DASHBOARD');
      else if (ut === 'SECURITY') setCurrentScreen('SECURITY_DASHBOARD');
    } else if (r.includes('hod/pending') || r.includes('hr/pending')) {
      if (ut === 'HOD') setCurrentScreen('HOD_DASHBOARD');
      else if (ut === 'HR') setCurrentScreen('HR_DASHBOARD');
    }
  }, []);

  const handleNotificationRoute = React.useCallback((route: string) => {
    if (!userTypeRef.current) {
      // App was killed — auth not restored yet; store and apply after login
      if (route) pendingRouteRef.current = route;
      return;
    }
    console.log('🔔 handleNotificationRoute called, route:', route || 'none', '— triggering refresh');
    // Always trigger a data refresh when a notification is tapped
    triggerRefresh();
    // Navigate to the specific screen if a route was provided
    if (route) applyRoute(route);
  }, [applyRoute, triggerRefresh]);

  // Once userType is set (auth restored), flush any pending notification route
  React.useEffect(() => {
    if (userType && pendingRouteRef.current) {
      const route = pendingRouteRef.current;
      pendingRouteRef.current = null;
      applyRoute(route);
    }
  }, [userType, applyRoute]);

  // Set up notification tap listener (foreground + background tap)
  React.useEffect(() => {
    const cleanup = setupNotificationTapHandler(handleNotificationRoute);
    return cleanup;
  }, [handleNotificationRoute]);

  // Set up FCM foreground message handler (shows notifee notification when app is open)
  React.useEffect(() => {
    const cleanup = setupFCMForegroundHandler();
    return cleanup;
  }, []);

  // Biometric gate logic:
  // - App killed while logged in → reopen → ask for auth (flag persists in storage)
  // - App backgrounded → resumed → NO auth (flag is cleared on 'active')
  // - First login → NO auth (flag never set during login)
  const hasBeenBackgroundedRef = React.useRef(false);
  React.useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        // Arm the flag when leaving — if app is killed, this persists in storage
        if (userTypeRef.current) {
          hasBeenBackgroundedRef.current = true;
          biometricAuthService.markSessionActive();
        }
      } else if (nextState === 'active') {
        // Only clear if the app was backgrounded in THIS process lifetime (not a fresh launch).
        // On a fresh launch after kill, hasBeenBackgroundedRef is false so we leave the
        // stored flag intact for checkAuthStatus to read.
        if (hasBeenBackgroundedRef.current) {
          hasBeenBackgroundedRef.current = false;
          biometricAuthService.clearSession();
        }
      }
    });
    return () => sub.remove();
  }, []);

  // Handle app opened from a notification while it was KILLED
  // Covers both FCM (messaging().getInitialNotification) and
  // notifee (notifee.getInitialNotification) killed-state taps.
  // A dedup flag ensures only the first resolved route wins.
  React.useEffect(() => {
    let handled = false;
    const apply = (route: string) => {
      if (handled || !route) return;
      handled = true;
      handleNotificationRoute(route);
    };
    handleInitialNotification(apply);
    getInitialNotificationData().then((data) => {
      if (data?.actionRoute) apply(data.actionRoute);
    });
    // Also check for route stored by notifee background handler (background tap)
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.getItem('@pending_notification_route').then((route) => {
        if (route) {
          AsyncStorage.removeItem('@pending_notification_route');
          apply(route);
        }
      });
      // Open file if tapped from download notification while app was backgrounded
      AsyncStorage.getItem('@pending_open_file').then(async (raw) => {
        if (!raw) return;
        await AsyncStorage.removeItem('@pending_open_file');
        try {
          const { filePath } = JSON.parse(raw);
          const { Linking } = require('react-native');
          await Linking.openURL(`file://${filePath}`);
        } catch {}
      });
    });
  }, []); // run once on mount

  React.useEffect(() => {
    console.log('🚀 App mounted - starting initialization');
    // Log device info and run notification onboarding (battery opt + OEM auto-launch)
    logDeviceNotificationInfo();
    runNotificationOnboarding();

    const minLoadingTime = setTimeout(() => {
      console.log('⏱️ Minimum loading time reached');
    }, 500);

    const maxTimeout = setTimeout(() => {
      console.log('⚠️ Maximum loading timeout - forcing home screen');
      setIsLoading(false);
      setCurrentScreen('HOME');
    }, 3000);

    checkAuthStatus().finally(() => {
      clearTimeout(minLoadingTime);
      clearTimeout(maxTimeout);
    });

    return () => {
      clearTimeout(minLoadingTime);
      clearTimeout(maxTimeout);
    };
  }, []);

  // Battery optimization gate — runs once on mount
  React.useEffect(() => {
    (async () => {
      const s = await getAllNotificationSettings();
      const allOk = s.batteryOptimizationDisabled && s.notificationsEnabled && s.channelsEnabled;
      setBatteryOptimizationOK(allOk);
      setBatteryGateChecked(true);
    })();
  }, []);

  const runBiometricAuth = React.useCallback(async () => {
    setBiometricLoading(true);
    setBiometricMessage('');
    try {
      const result = await biometricAuthService.authenticateBiometric();
      if (result.success) {
        await biometricAuthService.clearSession(); // clear flag — re-armed on next background
        setBiometricVerified(true);
      } else {
        setBiometricMessage(result.error || 'Authentication failed');
      }
    } catch {
      setBiometricMessage('Unable to authenticate. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  }, []);

  const runDeviceCredentialAuth = React.useCallback(async () => {
    setBiometricLoading(true);
    setBiometricMessage('');
    try {
      const result = await biometricAuthService.authenticateDeviceCredential();
      if (result.success) {
        await biometricAuthService.clearSession(); // clear flag — re-armed on next background
        setBiometricVerified(true);
      } else {
        setBiometricMessage(result.error || 'Authentication failed');
      }
    } catch {
      setBiometricMessage('Unable to authenticate. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (requiresBiometricGate && !biometricVerified && !biometricPrompted && !isLoading) {
      setBiometricPrompted(true);
      // Don't auto-trigger — user picks biometric or PIN from the screen
    }
  }, [requiresBiometricGate, biometricVerified, biometricPrompted, isLoading, runBiometricAuth]);

  const checkAuthStatus = async () => {
    console.log('🔍 Starting auth check...');
    try {
      // Check for saved student session
      const savedStudent = await offlineStorage.getCurrentStudent();
      if (savedStudent) {
        console.log('✅ Found saved student session:', savedStudent.regNo);
        setStudent(savedStudent);
        setUserType('STUDENT');
        setCurrentScreen('DASHBOARD');
        const hasFlag = await biometricAuthService.hasSessionFlag();
        setRequiresBiometricGate(hasFlag);
        setBiometricVerified(!hasFlag);
        setIsLoading(false);
        initPushNotifications(savedStudent.regNo, 'student');
        return;
      }

      // Check for saved staff session — but verify role hasn't changed (e.g. staff promoted to HOD)
      const savedStaff = await offlineStorage.getCurrentStaff();
      if (savedStaff) {
        console.log('✅ Found saved staff session:', savedStaff.staffCode);
        // Quick backend role check to catch stale sessions (e.g. HOD stored as STAFF)
        try {
          const actualRole = await apiService.detectRole(savedStaff.staffCode);
          if (actualRole === 'HOD') {
            console.log('⚠️ Staff session is actually HOD — clearing stale session');
            await offlineStorage.clearCurrentStaff();
            // Fall through to HOD check below
          } else if (actualRole === 'NON_TEACHING') {
            console.log('⚠️ Staff session is actually NTF — clearing stale session');
            await offlineStorage.clearCurrentStaff();
            // Fall through
          } else if (actualRole === 'NON_CLASS_INCHARGE') {
            console.log('⚠️ Staff session is actually NCI — clearing stale session');
            await offlineStorage.clearCurrentStaff();
            // Fall through
          } else {
            setStaff(savedStaff);
            setUserType('STAFF');
            setCurrentScreen('STAFF_DASHBOARD');
            const hasFlag = await biometricAuthService.hasSessionFlag();
            setRequiresBiometricGate(hasFlag);
            setBiometricVerified(!hasFlag);
            setIsLoading(false);
            initPushNotifications(savedStaff.staffCode, 'staff');
            return;
          }
        } catch {
          // Network error — trust cached session
          setStaff(savedStaff);
          setUserType('STAFF');
          setCurrentScreen('STAFF_DASHBOARD');
          const hasFlag = await biometricAuthService.hasSessionFlag();
          setRequiresBiometricGate(hasFlag);
          setBiometricVerified(!hasFlag);
          setIsLoading(false);
          initPushNotifications(savedStaff.staffCode, 'staff');
          return;
        }
      }

      // Check for saved HOD session
      const savedHOD = await offlineStorage.getCurrentHOD();
      if (savedHOD) {
        console.log('✅ Found saved HOD session:', savedHOD.hodCode);
        setHod(savedHOD);
        setUserType('HOD');
        setCurrentScreen('HOD_DASHBOARD');
        const hasFlag = await biometricAuthService.hasSessionFlag();
        setRequiresBiometricGate(hasFlag);
        setBiometricVerified(!hasFlag);
        setIsLoading(false);
        initPushNotifications(savedHOD.hodCode, 'hod');
        return;
      }

      // Check for saved HR session
      const savedHR = await offlineStorage.getCurrentHR();
      if (savedHR) {
        console.log('✅ Found saved HR session:', savedHR.hrCode);
        setHr(savedHR);
        setUserType('HR');
        setCurrentScreen('HR_DASHBOARD');
        const hasFlag = await biometricAuthService.hasSessionFlag();
        setRequiresBiometricGate(hasFlag);
        setBiometricVerified(!hasFlag);
        setIsLoading(false);
        initPushNotifications(savedHR.hrCode, 'hr');
        return;
      }

      // Check for saved Security session
      const savedSecurity = await offlineStorage.getCurrentSecurity();      if (savedSecurity) {
        console.log('✅ Found saved Security session:', savedSecurity.securityId);
        setSecurity(savedSecurity);
        setUserType('SECURITY');
        setCurrentScreen('SECURITY_DASHBOARD');
        const hasFlag = await biometricAuthService.hasSessionFlag();
        setRequiresBiometricGate(hasFlag);
        setBiometricVerified(!hasFlag);
        setIsLoading(false);
        initPushNotifications(savedSecurity.securityId, 'security');
        return;
      }

      // Check for saved Admin Officer session (BEFORE NTF — AO has non-teaching dept)
      const savedAdmin = await offlineStorage.getCurrentAdmin();
      if (savedAdmin) {
        console.log('✅ Found saved Admin Officer session:', savedAdmin.staffCode);
        setAdmin(savedAdmin);
        setUserType('ADMIN_OFFICER');
        setCurrentScreen('ADMIN_DASHBOARD');
        const hasFlag = await biometricAuthService.hasSessionFlag();
        setRequiresBiometricGate(hasFlag);
        setBiometricVerified(!hasFlag);
        setIsLoading(false);
        initPushNotifications(savedAdmin.staffCode, 'staff');
        return;
      }

      // Check for saved NTF session
      const savedNTF = await offlineStorage.getCurrentNTF();
      if (savedNTF) {
        console.log('✅ Found saved NTF session:', savedNTF.staffCode);
        setNtf(savedNTF);
        setUserType('NON_TEACHING');
        setCurrentScreen('NTF_DASHBOARD');
        const hasFlag = await biometricAuthService.hasSessionFlag();
        setRequiresBiometricGate(hasFlag);
        setBiometricVerified(!hasFlag);
        setIsLoading(false);
        initPushNotifications(savedNTF.staffCode, 'staff');
        return;
      }

      // Check for saved NCI session
      const savedNCI = await offlineStorage.getCurrentNCI();
      if (savedNCI) {
        console.log('✅ Found saved NCI session:', savedNCI.staffCode);
        setNci(savedNCI);
        setUserType('NON_CLASS_INCHARGE');
        setCurrentScreen('NCI_DASHBOARD');
        const hasFlag = await biometricAuthService.hasSessionFlag();
        setRequiresBiometricGate(hasFlag);
        setBiometricVerified(!hasFlag);
        setIsLoading(false);
        initPushNotifications(savedNCI.staffCode, 'staff');
        return;
      }

      console.log('ℹ️ No saved user session found - showing home screen');
      setIsLoading(false);
      setCurrentScreen('HOME');
      setRequiresBiometricGate(false);
      setBiometricVerified(false);
    } catch (error) {
      console.error('❌ Error checking auth status:', error);
      setIsLoading(false);
      setCurrentScreen('HOME');
    }
  };

  const handleUserTypeSelection = (selectedUserType: UserType) => {
    console.log('🔄 User type selected:', selectedUserType);
    setStudent(null);
    setStaff(null);
    setHod(null);
    setUserType(null);
    setCurrentScreen('HOME');

    setTimeout(() => {
      console.log('🚀 Navigating to UNIFIED_LOGIN');
      setCurrentScreen('UNIFIED_LOGIN');
    }, 50);
  };

  const clearAllSessionsExcept = async (roleToKeep: UserType) => {
    if (roleToKeep !== 'STUDENT') await offlineStorage.clearCurrentStudent();
    if (roleToKeep !== 'STAFF') await offlineStorage.clearCurrentStaff();
    if (roleToKeep !== 'HOD') await offlineStorage.clearCurrentHOD();
    if (roleToKeep !== 'HR') await offlineStorage.clearCurrentHR();
    if (roleToKeep !== 'SECURITY') await offlineStorage.clearCurrentSecurity();
    if (roleToKeep !== 'NON_TEACHING') await offlineStorage.clearCurrentNTF();
    if (roleToKeep !== 'NON_CLASS_INCHARGE') await offlineStorage.clearCurrentNCI();
    if ((roleToKeep as any) !== 'ADMIN_OFFICER') await offlineStorage.clearCurrentAdmin();
  };

  const handleStudentLogin = async (studentData: Student) => {
    console.log('🎓 Student login successful:', studentData.regNo);
    try {
      await clearAllSessionsExcept('STUDENT');
      await offlineStorage.saveCurrentStudent(studentData);
      console.log('✅ Student data saved to storage');
    } catch (error) {
      console.error('❌ Failed to save student data:', error);
    }
    setStudent(studentData);
    setUserType('STUDENT');
    setCurrentScreen('DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(studentData.regNo, 'student');
  };

  const handleStaffLogin = async (staffData: Staff) => {
    console.log('👨‍💼 Staff login successful:', staffData.staffCode);
    try {
      await clearAllSessionsExcept('STAFF');
      await offlineStorage.storeStaffData(staffData);
      console.log('✅ Staff data saved to storage');
    } catch (error) {
      console.error('❌ Failed to save staff data:', error);
    }
    setStaff(staffData);
    setUserType('STAFF');
    setCurrentScreen('STAFF_DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(staffData.staffCode, 'staff');
  };

  const handleHODLogin = async (hodData: HOD) => {
    console.log('🏛️ HOD login successful:', hodData.hodCode);
    try {
      await clearAllSessionsExcept('HOD');
      await offlineStorage.saveCurrentHOD(hodData);
      console.log('✅ HOD data saved to storage');
    } catch (error) {
      console.error('❌ Failed to save HOD data:', error);
    }
    setHod(hodData);
    setUserType('HOD');
    setCurrentScreen('HOD_DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(hodData.hodCode, 'hod');
  };

  const handleHRLogin = async (hrData: HR) => {
    console.log('👥 HR login successful:', hrData.hrCode);
    try {
      await clearAllSessionsExcept('HR');
      await offlineStorage.saveCurrentHR(hrData);
      console.log('✅ HR data saved to storage');
    } catch (error) {
      console.error('❌ Failed to save HR data:', error);
    }
    setHr(hrData);
    setUserType('HR');
    setCurrentScreen('HR_DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(hrData.hrCode, 'hr');
  };

  const handleSecurityLogin = async (securityData: SecurityPersonnel) => {
    console.log('🛡️ Security login successful:', securityData.securityId);
    try {
      await clearAllSessionsExcept('SECURITY');
      await offlineStorage.saveCurrentSecurity(securityData);
      console.log('✅ Security data saved to storage');
    } catch (error) {
      console.error('❌ Failed to save Security data:', error);
    }
    setSecurity(securityData);
    setUserType('SECURITY');
    setCurrentScreen('SECURITY_DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(securityData.securityId, 'security');
  };

  const handleNTFLogin = async (ntfData: NonTeachingFaculty) => {
    console.log('🏫 NTF login successful:', ntfData.staffCode);
    try {
      await clearAllSessionsExcept('NON_TEACHING');
      await offlineStorage.saveCurrentNTF(ntfData);
    } catch (error) {
      console.error('❌ Failed to save NTF data:', error);
    }
    setNtf(ntfData);
    setUserType('NON_TEACHING');
    setCurrentScreen('NTF_DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(ntfData.staffCode, 'staff');
  };

  const handleNCILogin = async (nciData: NonTeachingFaculty) => {
    console.log('🏛️ NCI login successful:', nciData.staffCode);
    // Store the staff role in designation field for Principal/Director detection
    const enriched = { ...nciData, designation: (nciData as any).role || nciData.designation || '' };
    try {
      await clearAllSessionsExcept('NON_CLASS_INCHARGE');
      await offlineStorage.saveCurrentNCI(enriched);
    } catch (error) {
      console.error('❌ Failed to save NCI data:', error);
    }
    setNci(enriched);
    setUserType('NON_CLASS_INCHARGE');
    setCurrentScreen('NCI_DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(nciData.staffCode, 'staff');
  };

  const handleAdminLogin = async (adminData: NonTeachingFaculty) => {
    console.log('🏢 Admin Officer login successful:', adminData.staffCode);
    const enriched = { ...adminData, role: 'ADMIN_OFFICER' };
    try {
      // Clear ALL other sessions including NTF (AO has non-teaching dept so stale NTF session possible)
      await offlineStorage.clearCurrentStudent();
      await offlineStorage.clearCurrentStaff();
      await offlineStorage.clearCurrentHOD();
      await offlineStorage.clearCurrentHR();
      await offlineStorage.clearCurrentSecurity();
      await offlineStorage.clearCurrentNTF();
      await offlineStorage.clearCurrentNCI();
      await offlineStorage.saveCurrentAdmin(enriched as any);
    } catch (error) {
      console.error('❌ Failed to save Admin data:', error);
    }
    setAdmin(enriched);
    setUserType('ADMIN_OFFICER');
    setCurrentScreen('ADMIN_DASHBOARD');
    setRequiresBiometricGate(false);
    setBiometricVerified(true);
    setBiometricPrompted(false);
    initPushNotifications(adminData.staffCode, 'staff');
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out user...');
      // Unregister push token before clearing session
      await unregisterPushToken();
      // Clear all user sessions
      await offlineStorage.clearCurrentStudent();
      await offlineStorage.clearCurrentStaff();
      await offlineStorage.clearCurrentHOD();
      await offlineStorage.clearCurrentHR();
      await offlineStorage.clearCurrentSecurity();
      await offlineStorage.clearCurrentNTF();
      await offlineStorage.clearCurrentNCI();
      await offlineStorage.clearCurrentAdmin();
      await offlineStorage.clearCurrentNTF();
      
      // Reset all state
      setStudent(null);
      setStaff(null);
      setHod(null);
      setHr(null);
      setSecurity(null);
      setNtf(null);
      setNci(null);
      setAdmin(null);
      setUserType(null);
      setCurrentScreen('HOME');
      setRequiresBiometricGate(false);
      setBiometricVerified(false);
      setBiometricPrompted(false);
      await biometricAuthService.clearSession();
      console.log('✅ Logout completed - all sessions cleared');
    } catch (error) {
      console.log('❌ Error during logout:', error);
    }
  };

  const navigateToScreen = (screen: ScreenName) => {
    console.log(`🚀 Navigating to screen: ${screen}`);
    setCurrentScreen(screen);
  };

  const navigateBack = () => {
    if (userType === 'STUDENT') setCurrentScreen('DASHBOARD');
    else if (userType === 'STAFF') setCurrentScreen('STAFF_DASHBOARD');
    else if (userType === 'HOD') setCurrentScreen('HOD_DASHBOARD');
    else if (userType === 'HR') setCurrentScreen('HR_DASHBOARD');
    else if (userType === 'SECURITY') setCurrentScreen('SECURITY_DASHBOARD');
    else if (userType === 'NON_TEACHING') setCurrentScreen('NTF_DASHBOARD');
    else if (userType === 'NON_CLASS_INCHARGE') setCurrentScreen('NCI_DASHBOARD');
    else if (userType === 'ADMIN_OFFICER') setCurrentScreen('ADMIN_DASHBOARD');
    else setCurrentScreen('HOME');
  };

  const goBackToHome = React.useCallback(() => {
    setUserType(null);
    setCurrentScreen('HOME');
  }, []);

  const runExitAnimationAndClose = React.useCallback(() => {
    if (exitAnimating) return;
    setExitAnimating(true);
    exitOpacity.setValue(0);
    exitTranslateY.setValue(12);
    Animated.parallel([
      Animated.timing(exitOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.timing(exitTranslateY, { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setTimeout(() => {
        BackHandler.exitApp();
      }, 180);
    });
  }, [exitAnimating, exitOpacity, exitTranslateY]);

  // ── Hardware back button / gesture back ──────────────────────────────────
  // HOME + all dashboard screens → show exit confirmation
  // Any other screen → go back to the role's dashboard

  const handleSwipeBack = React.useCallback(() => {
    if (isLoading) return;
    if ((global as any).__actionLocked) return;

    if (EXIT_SCREENS.includes(currentScreen)) {
      const now = Date.now();
      if (now - lastBackPress.current < 2000) {
        BackHandler.exitApp();
      } else {
        lastBackPress.current = now;
        setShowExitToast(true);
        if (exitToastTimer.current) clearTimeout(exitToastTimer.current);
        exitToastTimer.current = setTimeout(() => setShowExitToast(false), 2000);
      }
      return;
    }
    if (userType) navigateBack();
    else setCurrentScreen('HOME');
  }, [currentScreen, isLoading, userType]);

  React.useEffect(() => {
    const onBackPress = () => {
      if (isLoading) return true;
      if ((global as any).__actionLocked) return true;

      if (EXIT_SCREENS.includes(currentScreen)) {
        const now = Date.now();
        if (now - lastBackPress.current < 2000) {
          BackHandler.exitApp();
        } else {
          lastBackPress.current = now;
          setShowExitToast(true);
          if (exitToastTimer.current) clearTimeout(exitToastTimer.current);
          exitToastTimer.current = setTimeout(() => setShowExitToast(false), 2000);
        }
        return true;
      }
      if (userType) navigateBack();
      else setCurrentScreen('HOME');
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [currentScreen, userType, isLoading]);

  const renderCurrentScreen = () => {
    console.log(`📱 RENDER: screen=${currentScreen}, userType=${userType}, isLoading=${isLoading}`);

    try {
      // Show loading screen
      if (isLoading) {
        return <LoadingScreen />;
      }

      // Battery optimization gate — must be configured before login is allowed
      if (batteryGateChecked && !batteryOptimizationOK) {
        return (
          <BatteryOptimizationGateScreen
            onAllDone={() => setBatteryOptimizationOK(true)}
          />
        );
      }

      if (requiresBiometricGate && !biometricVerified) {
        return (
          <BiometricGateScreen
            loading={biometricLoading}
            message={biometricMessage}
            onBiometric={runBiometricAuth}
            onDeviceCredential={runDeviceCredentialAuth}
          />
        );
      }

      // Handle unified login screen
      if (currentScreen === 'UNIFIED_LOGIN') {
        console.log('🔐 Rendering ModernUnifiedLoginScreen');
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'STUDENT') handleStudentLogin(user);
              else if (role === 'STAFF') handleStaffLogin(user);
              else if (role === 'HOD') handleHODLogin(user);
              else if (role === 'HR') handleHRLogin(user);
              else if (role === 'SECURITY') handleSecurityLogin(user);
              else if (role === 'NON_TEACHING') handleNTFLogin(user);
              else if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
              else if (role === 'ADMIN_OFFICER') handleAdminLogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle authenticated student screens
      if (userType === 'STUDENT' && student) {
        switch (currentScreen) {
          case 'DASHBOARD':
            return (
              <StudentDashboardContainer
                student={student}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
          case 'PROFILE':
            return (
              <ProfileScreen
                user={student}
                userType="STUDENT"
                onBack={goBackToHome}
                onLogout={handleLogout}
              />
            );
          case 'HISTORY':
            return (
              <EntryExitHistoryScreen 
                user={student} 
                onBack={() => setCurrentScreen('DASHBOARD')}
              />
            );
          case 'REQUESTS':
            return (
              <RequestsScreen 
                user={student} 
                onBack={() => setCurrentScreen('DASHBOARD')}
                onNavigate={navigateToScreen}
              />
            );
          case 'NEW_PASS_REQUEST':
            if (!student) {
              console.log('⚠️ Student is null in NEW_PASS_REQUEST, redirecting to dashboard');
              setTimeout(() => setCurrentScreen('DASHBOARD'), 0);
              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
                  <ThemedText style={{ color: '#666' }}>Loading...</ThemedText>
                </View>
              );
            }
            console.log('✅ Rendering GatePassRequestScreen with student:', student.regNo);
            return (
              <GatePassRequestScreen 
                user={student} 
                onBack={() => setCurrentScreen('DASHBOARD')}
              />
            );
          case 'NOTIFICATIONS':
            return (
              <NotificationsScreen
                userId={student.regNo}
                userType="student"
                onBack={navigateBack}
              />
            );
          default:
            return (
              <StudentDashboardContainer
                student={student}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
        }
      }

      // Handle unauthenticated student - redirect to unified login
      if (userType === 'STUDENT' && !student) {
        console.log('🎓 Student not authenticated - showing UnifiedLoginScreen');
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'STUDENT') handleStudentLogin(user);
              else if (role === 'STAFF') handleStaffLogin(user);
              else if (role === 'HOD') handleHODLogin(user);
              else if (role === 'HR') handleHRLogin(user);
              else if (role === 'SECURITY') handleSecurityLogin(user);
              else if (role === 'NON_TEACHING') handleNTFLogin(user);
              else if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
              else if (role === 'ADMIN_OFFICER') handleAdminLogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle authenticated staff screens
      if (userType === 'STAFF' && staff) {
        switch (currentScreen) {
          case 'STAFF_DASHBOARD':
            return (
              <StaffDashboardContainer
                staff={staff}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
          case 'HISTORY':
            return (
              <EntryExitHistoryScreen 
                user={staff as any} 
                onBack={() => setCurrentScreen('STAFF_DASHBOARD')}
              />
            );
          case 'NEW_PASS_REQUEST':
            if (!staff) {
              console.log('⚠️ Staff is null in NEW_PASS_REQUEST, redirecting to dashboard');
              setTimeout(() => setCurrentScreen('STAFF_DASHBOARD'), 0);
              return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' }}>
                  <ThemedText style={{ color: '#666' }}>Loading...</ThemedText>
                </View>
              );
            }
            console.log('✅ Rendering GatePassRequestScreen with staff:', staff.staffCode);
            return (
              <GatePassRequestScreen 
                user={staff as any} 
                onBack={() => setCurrentScreen('STAFF_DASHBOARD')}
              />
            );
          case 'STAFF_BULK_GATE_PASS':
            return (
              <ModernBulkGatePassScreen 
                user={staff} 
                onBack={() => setCurrentScreen('STAFF_DASHBOARD')}
              />
            );
          case 'MY_REQUESTS':
            return (
              <MyRequestsScreen 
                user={staff} 
                onBack={() => setCurrentScreen('STAFF_DASHBOARD')}
              />
            );
          case 'NOTIFICATIONS':
            return (
              <NotificationsScreen
                userId={staff.staffCode}
                userType="staff"
                onBack={navigateBack}
              />
            );
          case 'GUEST_PRE_REQUEST':
            return (
              <GuestPreRequestScreen
                creatorRole="STAFF"
                creatorStaffCode={staff.staffCode}
                creatorName={staff.staffName}
                creatorDepartment={staff.department}
                onBack={() => setCurrentScreen('STAFF_DASHBOARD')}
              />
            );
          default:
            return (
              <StaffDashboardContainer
                staff={staff}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
        }
      }

      // Handle unauthenticated staff - redirect to unified login
      if (userType === 'STAFF' && !staff) {
        console.log('👨‍💼 Staff not authenticated - showing UnifiedLoginScreen');
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'STUDENT') handleStudentLogin(user);
              else if (role === 'STAFF') handleStaffLogin(user);
              else if (role === 'HOD') handleHODLogin(user);
              else if (role === 'HR') handleHRLogin(user);
              else if (role === 'SECURITY') handleSecurityLogin(user);
              else if (role === 'NON_TEACHING') handleNTFLogin(user);
              else if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
              else if (role === 'ADMIN_OFFICER') handleAdminLogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle authenticated HOD screens
      if (userType === 'HOD' && hod) {
        switch (currentScreen) {
          case 'HOD_DASHBOARD':
            return (
              <HODDashboardContainer
                hod={hod}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
          case 'HOD_GATE_PASS_REQUEST':
            return (
              <HODGatePassRequestScreen
                user={hod}
                onBack={() => navigateToScreen('HOD_DASHBOARD')}
              />
            );
          case 'HOD_BULK_GATE_PASS':
            return (
              <HODBulkGatePassScreen
                user={hod}
                onBack={() => navigateToScreen('HOD_DASHBOARD')}
              />
            );
          case 'HOD_MY_REQUESTS':
            return (
              <HODMyRequestsScreen
                user={hod}
                onBack={() => navigateToScreen('HOD_DASHBOARD')}
              />
            );
          case 'PROFILE':
            // Handled internally by HODDashboardContainer
            return (
              <HODDashboardContainer
                hod={hod}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
          case 'HISTORY':
            return (
              <EntryExitHistoryScreen
                user={hod as any}
                onBack={() => setCurrentScreen('HOD_DASHBOARD')}
              />
            );
          case 'NOTIFICATIONS':
            return (
              <NotificationsScreen
                userId={hod.hodCode}
                userType="hod"
                onBack={navigateBack}
              />
            );
          case 'GUEST_PRE_REQUEST':
            return (
              <GuestPreRequestScreen
                creatorRole="HOD"
                creatorStaffCode={hod.hodCode}
                creatorName={hod.hodName}
                creatorDepartment={hod.department}
                onBack={() => setCurrentScreen('HOD_DASHBOARD')}
              />
            );
          default:
            return (
              <HODDashboardContainer
                hod={hod}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
        }
      }

      // Handle authenticated HR screens
      if (userType === 'HR' && hr) {
        switch (currentScreen) {
          case 'HR_DASHBOARD':
            return (
              <HRDashboardContainer
                hr={hr}
                onLogout={handleLogout}
                onNavigate={(screen: ScreenName) => setCurrentScreen(screen)}
              />
            );
          case 'HR_APPROVAL':
            return (
              <HRApprovalScreen
                user={hr as any}
                request={selectedRequest}
                onBack={() => setCurrentScreen('HR_DASHBOARD')}
              />
            );
          case 'NOTIFICATIONS':
            return (
              <NotificationsScreen
                userId={hr.hrCode}
                userType="hr"
                onBack={navigateBack}
              />
            );
          case 'GUEST_PRE_REQUEST':
            return (
              <GuestPreRequestScreen
                creatorRole="HR"
                creatorStaffCode={hr.hrCode}
                creatorName={hr.hrName || hr.name}
                creatorDepartment={hr.department}
                onBack={() => setCurrentScreen('HR_DASHBOARD')}
              />
            );
          default:
            return (
              <HRDashboardContainer
                hr={hr}
                onLogout={handleLogout}
                onNavigate={(screen: ScreenName) => setCurrentScreen(screen)}
              />
            );
        }
      }

      // Handle unauthenticated HOD - redirect to unified login
      if (userType === 'HOD' && !hod) {
        console.log('🏛️ HOD not authenticated - showing UnifiedLoginScreen');
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'STUDENT') handleStudentLogin(user);
              else if (role === 'STAFF') handleStaffLogin(user);
              else if (role === 'HOD') handleHODLogin(user);
              else if (role === 'HR') handleHRLogin(user);
              else if (role === 'SECURITY') handleSecurityLogin(user);
              else if (role === 'NON_TEACHING') handleNTFLogin(user);
              else if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
              else if (role === 'ADMIN_OFFICER') handleAdminLogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle authenticated Security screens
      if (userType === 'SECURITY' && security) {
        return (
          <SecurityDashboardContainer
            security={security}
            onLogout={handleLogout}
            onNavigate={navigateToScreen}
          />
        );
      }

      // Handle unauthenticated Security - redirect to unified login
      if (userType === 'SECURITY' && !security) {
        console.log('🛡️ Security not authenticated - showing UnifiedLoginScreen');
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'STUDENT') handleStudentLogin(user);
              else if (role === 'STAFF') handleStaffLogin(user);
              else if (role === 'HOD') handleHODLogin(user);
              else if (role === 'HR') handleHRLogin(user);
              else if (role === 'SECURITY') handleSecurityLogin(user);
              else if (role === 'NON_TEACHING') handleNTFLogin(user);
              else if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
              else if (role === 'ADMIN_OFFICER') handleAdminLogin(user);
              else if (role === 'NON_TEACHING') handleNTFLogin(user);
              else if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
              else if (role === 'ADMIN_OFFICER') handleAdminLogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle authenticated NTF screens
      if (userType === 'NON_TEACHING' && ntf) {
        switch (currentScreen) {
          case 'NTF_DASHBOARD':
            return (
              <NTFDashboardContainer
                ntf={ntf}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
          case 'NEW_PASS_REQUEST':
            return (
              <GatePassRequestScreen
                user={ntf as any}
                onBack={() => setCurrentScreen('NTF_DASHBOARD')}
                isNTF={true}
              />
            );
          case 'NTF_MY_REQUESTS':
            return (
              <NTFMyRequestsScreen
                user={ntf}
                onBack={() => setCurrentScreen('NTF_DASHBOARD')}
              />
            );
          case 'HISTORY':
            return (
              <EntryExitHistoryScreen
                user={ntf as any}
                onBack={() => setCurrentScreen('NTF_DASHBOARD')}
              />
            );
          case 'NOTIFICATIONS':
            return (
              <NotificationsScreen
                userId={ntf.staffCode}
                userType="staff"
                onBack={navigateBack}
              />
            );
          case 'GUEST_PRE_REQUEST':
            return (
              <GuestPreRequestScreen
                creatorRole="NTF"
                creatorStaffCode={ntf.staffCode}
                creatorName={ntf.staffName || ntf.name || ''}
                creatorDepartment={ntf.department || ''}
                onBack={() => setCurrentScreen('NTF_DASHBOARD')}
              />
            );
          default:
            return (
              <NTFDashboardContainer
                ntf={ntf}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
        }
      }

      // Handle unauthenticated NTF
      if (userType === 'NON_TEACHING' && !ntf) {
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'NON_TEACHING') handleNTFLogin(user);
              else if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle authenticated NCI screens
      if (userType === 'NON_CLASS_INCHARGE' && nci) {
        switch (currentScreen) {
          case 'NCI_DASHBOARD':
            return (
              <NCIDashboardContainer
                nci={nci}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
          case 'NEW_PASS_REQUEST':
            return (
              <GatePassRequestScreen
                user={nci as any}
                onBack={() => setCurrentScreen('NCI_DASHBOARD')}
                isNCI={true}
              />
            );
          case 'NCI_MY_REQUESTS':
            return (
              <NCIMyRequestsScreen
                user={nci}
                onBack={() => setCurrentScreen('NCI_DASHBOARD')}
              />
            );
          case 'NCI_EXITS':
            return (
              <NCIExitsScreen
                nci={nci}
                onBack={() => setCurrentScreen('NCI_DASHBOARD')}
              />
            );
          case 'GUEST_PRE_REQUEST':
            return (
              <GuestPreRequestScreen
                creatorRole="NTF"
                creatorStaffCode={nci.staffCode}
                creatorName={nci.staffName || nci.name || ''}
                creatorDepartment={nci.department || ''}
                onBack={() => setCurrentScreen('NCI_DASHBOARD')}
              />
            );
          case 'NOTIFICATIONS':
            return (
              <NotificationsScreen
                userId={nci.staffCode}
                userType="staff"
                onBack={navigateBack}
              />
            );
          default:
            return (
              <NCIDashboardContainer
                nci={nci}
                onLogout={handleLogout}
                onNavigate={navigateToScreen}
              />
            );
        }
      }

      // Handle unauthenticated NCI
      if (userType === 'NON_CLASS_INCHARGE' && !nci) {
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'NON_CLASS_INCHARGE') handleNCILogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle authenticated Admin Officer
      if (userType === 'ADMIN_OFFICER' && admin) {
        switch (currentScreen) {
          case 'ADMIN_DASHBOARD':
            return <AdminDashboardContainer admin={admin} onLogout={handleLogout} onNavigate={navigateToScreen} />;
          case 'NOTIFICATIONS':
            return <NotificationsScreen userId={admin.staffCode} userType="staff" onBack={navigateBack} />;
          default:
            return <AdminDashboardContainer admin={admin} onLogout={handleLogout} onNavigate={navigateToScreen} />;
        }
      }

      // Handle unauthenticated Admin Officer
      if (userType === 'ADMIN_OFFICER' && !admin) {
        return (
          <ModernUnifiedLoginScreen
            onLoginSuccess={(user: any, role: UserRole) => {
              if (role === 'ADMIN_OFFICER') handleAdminLogin(user);
            }}
            onBack={goBackToHome}
          />
        );
      }

      // Handle home screen
      if (currentScreen === 'HOME' || !userType) {
        console.log('🏠 Rendering HomeScreen');
        return <HomeScreen onSelectUserType={handleUserTypeSelection} />;
      }

      // Default fallback
      console.log('📱 Rendering HomeScreen (default fallback)');
      return <HomeScreen onSelectUserType={handleUserTypeSelection} />;
    } catch (error) {
      console.error('❌ Error in renderCurrentScreen:', error);
      return (
        <View style={styles.errorContainer}>
          <ThemedText style={{ color: 'red', fontSize: 18, marginBottom: 20 }}>
            Error Loading Screen
          </ThemedText>
          <ThemedText style={{ color: '#666', textAlign: 'center' }}>
            {String(error)}
          </ThemedText>
        </View>
      );
    }
  };

  const isRootScreen = EXIT_SCREENS.includes(currentScreen);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider userId={
          student?.regNo ||
          staff?.staffCode ||
          hod?.hodCode ||
          hr?.hrCode ||
          security?.securityId ||
          nci?.staffCode ||
          admin?.staffCode ||
          undefined
        }>
          <RefreshProvider>
          <ActionLockProvider>
            <NotificationProvider onNavigate={handleNotificationRoute}>
              <ProfileProvider>
                <ThemedApp>
                  <View style={[styles.container, { backgroundColor: '#F8FAFC' }]}>
                    <StatusBar
                      barStyle="dark-content"
                      backgroundColor="transparent"
                      translucent={true}
                    />
                    <AppNavigator
                      isRootScreen={isRootScreen}
                      isLoading={isLoading}
                      onBack={handleSwipeBack}
                    >
                      <ErrorBoundary fallbackScreen={goBackToHome}>
                        {renderCurrentScreen()}
                      </ErrorBoundary>
                    </AppNavigator>
                    {exitAnimating && (
                      <Animated.View
                        pointerEvents="none"
                        style={[
                          StyleSheet.absoluteFillObject,
                          styles.exitOverlay,
                          { opacity: exitOpacity },
                        ]}
                      >
                        <Animated.View style={[styles.exitToast, { transform: [{ translateY: exitTranslateY }] }]}>
                          <ThemedText style={styles.exitToastTitle}>Closing application</ThemedText>
                          <ThemedText style={styles.exitToastSub}>Please wait…</ThemedText>
                        </Animated.View>
                      </Animated.View>
                    )}

                    {/* Double-back-to-exit toast */}
                    {showExitToast && (
                      <Animated.View
                        pointerEvents="none"
                        style={styles.exitToastContainer}
                      >
                        <ThemedText style={styles.exitToastText}>Press back again to exit</ThemedText>
                      </Animated.View>
                    )}
                  </View>
                </ThemedApp>
              </ProfileProvider>
            </NotificationProvider>
          </ActionLockProvider>
          </RefreshProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: professionalTheme.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  exitOverlay: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  exitToast: {
    width: '88%',
    maxWidth: 420,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0F172A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  exitToastTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', marginBottom: 2, letterSpacing: 0.2 },
  exitToastSub: { color: 'rgba(255,255,255,0.78)', fontSize: 12, fontWeight: '600' },
  exitToastContainer: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  exitToastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
});

export default App;
