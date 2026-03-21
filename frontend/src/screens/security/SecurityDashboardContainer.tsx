import React, { useState } from 'react';
import { View } from 'react-native';
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
  const [activeScreen, setActiveScreen] = useState<InternalScreen>('DASHBOARD');

  const handleNavigate = (screen: ScreenName) => {
    switch (screen) {
      case 'SECURITY_DASHBOARD':  setActiveScreen('DASHBOARD'); break;
      case 'QR_SCANNER':          setActiveScreen('QR_SCANNER'); break;
      case 'VISITOR_REGISTRATION': setActiveScreen('VISITOR_REGISTRATION'); break;
      case 'VISITOR_QR':          setActiveScreen('VISITOR_QR'); break;
      case 'VEHICLE_REGISTRATION': setActiveScreen('VEHICLE_REGISTRATION'); break;
      case 'SCAN_HISTORY':        setActiveScreen('SCAN_HISTORY'); break;
      case 'HOD_CONTACTS':        setActiveScreen('HOD_CONTACTS'); break;
      case 'PROFILE':             setActiveScreen('PROFILE'); break;
      case 'NOTIFICATIONS':       setActiveScreen('NOTIFICATIONS'); break;
      default:                    onNavigate(screen); break;
    }
  };

  const goHome = () => setActiveScreen('DASHBOARD');

  switch (activeScreen) {
    case 'QR_SCANNER':
      return (
        <ModernQRScannerScreen
          security={security}
          onBack={goHome}
          onNavigate={handleNavigate}
        />
      );
    case 'VISITOR_REGISTRATION':
      return (
        <ModernVisitorRegistrationScreen
          security={security}
          onBack={goHome}
          onNavigate={handleNavigate}
        />
      );
    case 'VISITOR_QR':
      return (
        <SecurityVisitorQRScreen
          security={security}
          onBack={goHome}
          onNavigate={handleNavigate}
        />
      );
    case 'VEHICLE_REGISTRATION':
      return (
        <ModernVehicleRegistrationScreen
          security={security}
          onBack={goHome}
          onNavigate={handleNavigate}
        />
      );
    case 'SCAN_HISTORY':
      return (
        <ModernScanHistoryScreen
          security={security}
          onBack={goHome}
          onNavigate={handleNavigate}
        />
      );
    case 'HOD_CONTACTS':
      return (
        <ModernHODContactsScreen
          security={security}
          onBack={goHome}
          onNavigate={handleNavigate}
        />
      );
    case 'PROFILE':
      return (
        <ProfileScreen
          user={security}
          userType="SECURITY"
          onBack={goHome}
          onLogout={onLogout}
        />
      );
    case 'NOTIFICATIONS':
      return (
        <NotificationsScreen
          userId={security.securityId}
          userType="security"
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
