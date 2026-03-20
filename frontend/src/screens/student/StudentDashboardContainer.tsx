import React, { useState, useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { Student } from '../../types';
import StudentHomeScreen from './StudentHomeScreen';
import StudentRequestsScreen from './StudentRequestsScreen';
import StudentHistoryScreen from './StudentHistoryScreen';
import ProfileScreen from '../shared/ProfileScreen';
import GatePassRequestScreen from './GatePassRequestScreen';

interface StudentDashboardContainerProps {
  student: Student;
  onLogout: () => void;
  onNavigate: (screen: any) => void;
}

type TabType = 'HOME' | 'REQUESTS' | 'HISTORY' | 'PROFILE' | 'NEW_REQUEST';

const StudentDashboardContainer: React.FC<StudentDashboardContainerProps> = ({
  student,
  onLogout,
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('HOME');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchTab = (tab: TabType) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleTabChange = (tab: 'HOME' | 'REQUESTS' | 'HISTORY' | 'PROFILE') => switchTab(tab);
  const handleRequestGatePass = () => switchTab('NEW_REQUEST');
  const handleRequestSuccess = () => switchTab('REQUESTS');
  const handleBackToHome = () => switchTab('HOME');

  const renderScreen = () => {
    switch (activeTab) {
      case 'HOME':
        return (
          <StudentHomeScreen
            student={student}
            onLogout={onLogout}
            onNavigate={onNavigate}
            onTabChange={handleTabChange}
            onRequestGatePass={handleRequestGatePass}
          />
        );
      case 'REQUESTS':
        return (
          <StudentRequestsScreen
            student={student}
            onTabChange={handleTabChange}
          />
        );
      case 'HISTORY':
        return (
          <StudentHistoryScreen
            student={student}
            onTabChange={handleTabChange}
          />
        );
      case 'PROFILE':
        return (
          <ProfileScreen
            user={student}
            userType="STUDENT"
            onBack={handleBackToHome}
            onLogout={onLogout}
            showBottomNav={true}
            onTabChange={handleTabChange}
          />
        );
      case 'NEW_REQUEST':
        return (
          <GatePassRequestScreen
            user={student}
            onBack={handleBackToHome}
          />
        );
      default:
        return (
          <StudentHomeScreen
            student={student}
            onLogout={onLogout}
            onNavigate={onNavigate}
            onTabChange={handleTabChange}
            onRequestGatePass={handleRequestGatePass}
          />
        );
    }
  };

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      {renderScreen()}
    </Animated.View>
  );
};

export default StudentDashboardContainer;
