import React, { useState, useEffect, useCallback } from 'react';
import { View, BackHandler } from 'react-native';
import { SecurityPersonnel, ScreenName } from '../../types';
import NewSecurityDashboard from './NewSecurityDashboard';
import ModernQRScannerScreen from './ModernQRScannerScreen';
import ModernVisitorRegistrationScreen from './ModernVisitorRegistrationScreen';
import SecurityVisitorQRScreen from './SecurityVisitorQRScreen';
import ModernVehicleRegistrationScreen from './ModernVehicleRegistrationScreen';
import ModernScanHistoryScreen from './ModernScanHistoryScreen';
import ModernHODContactsScreen from './ModernHODContactsScreen';
import ProfileScreen from '../shared/ProfileScreen';
import NotificationsScreen from '../shared/NotificationsScreen';

interface SecurityDashboardContainerProps {
  security: SecurityPersonnel;
  onLogout: () => void;
  onNavigate: (screen: ScreenName) => void;
}

type InternalScreen =
  | 'DASHBOARD'
  | 'QR_SCANNER'
  | 'VISITOR_REGISTRATION'
  | 'VISITOR_QR'
  | 'VEHICLE_REGISTRATION'
  | 'SCAN_HISTORY'
  | 'HOD_CONTACTS'
  | 'PROFILE'
  | 'NOTIFICATIONS';

const SecurityDashboardContainer: React.FC<SecurityDashboardContainerProps> = ({
  security,
  onLogout,
  onNavigate,
}) => {
  // Stack-based navigation: back pops to previous screen
  const [stack, setStack] = useState<InternalScreen[]>(['DASHBOARD']);

  const activeScreen = stack[stack.length - 1];

  const push = useCallback((screen: InternalScreen) => {
    setStack(prev => [...prev, screen]);
  }, []);

  const pop = useCallback(() => {
    setStack(prev => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const goHome = useCallback(() => {
    setStack(['DASHBOARD']);
  }, []);

  // Hardware back: pop stack; if at DASHBOARD let App.tsx handle (exit modal)
  useEffect(() => {
    const onBack = () => {
      if (stack.length > 1) {
        pop();
        return true;
      }
      return false; // DASHBOARD — let App.tsx show exit modal
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [stack, pop]);

  const handleNavigate = (screen: ScreenName) => {
    switch (screen) {
      case 'SECURITY_DASHBOARD':   goHome(); break;
      case 'QR_SCANNER':           push('QR_SCANNER'); break;
      case 'VISITOR_REGISTRATION': push('VISITOR_REGISTRATION'); break;
      case 'VISITOR_QR':           push('VISITOR_QR'); break;
      case 'VEHICLE_REGISTRATION': push('VEHICLE_REGISTRATION'); break;
      case 'SCAN_HISTORY':         push('SCAN_HISTORY'); break;
      case 'HOD_CONTACTS':         push('HOD_CONTACTS'); break;
      case 'PROFILE':              push('PROFILE'); break;
      case 'NOTIFICATIONS':        push('NOTIFICATIONS'); break;
      default:                     onNavigate(screen); break;
    }
  };

  switch (activeScreen) {
    case 'QR_SCANNER':
      return (
        <ModernQRScannerScreen
          security={security}
          onBack={pop}
          onNavigate={handleNavigate}
        />
      );
    case 'VISITOR_REGISTRATION':
      return (
        <ModernVisitorRegistrationScreen
          security={security}
          onBack={pop}
          onNavigate={handleNavigate}
        />
      );
    case 'VISITOR_QR':
      return (
        <SecurityVisitorQRScreen
          security={security}
          onBack={pop}
          onNavigate={handleNavigate}
        />
      );
    case 'VEHICLE_REGISTRATION':
      return (
        <ModernVehicleRegistrationScreen
          security={security}
          onBack={pop}
          onNavigate={handleNavigate}
        />
      );
    case 'SCAN_HISTORY':
      return (
        <ModernScanHistoryScreen
          security={security}
          onBack={pop}
          onNavigate={handleNavigate}
        />
      );
    case 'HOD_CONTACTS':
      return (
        <ModernHODContactsScreen
          security={security}
          onBack={pop}
          onNavigate={handleNavigate}
        />
      );
    case 'PROFILE':
      return (
        <ProfileScreen
          user={security}
          userType="SECURITY"
          onBack={pop}
          onLogout={onLogout}
        />
      );
    case 'NOTIFICATIONS':
      return (
        <NotificationsScreen
          userId={security.securityId}
          userType="security"
          onBack={pop}
        />
      );
    default:
      return (
        <View style={{ flex: 1 }}>
          <NewSecurityDashboard
            user={security}
            onLogout={onLogout}
            onNavigate={handleNavigate}
          />
        </View>
      );
  }
};

export default SecurityDashboardContainer;
