import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import QRCode from 'react-native-qrcode-svg';
import { Student } from '../../types';
import { THEME } from '../../config/api.config';

interface MyQRCodesScreenProps {
  user: Student;
  navigation?: any;
  onBack?: () => void;
}

const MyQRCodesScreen: React.FC<MyQRCodesScreenProps> = ({ user, navigation, onBack }) => {
  const [refreshing, setRefreshing] = useState(false);
  const [qrCodes, setQrCodes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleGoBack = () => {
    if (navigation?.goBack) {
      navigation.goBack();
    } else if (onBack) {
      onBack();
    }
  };

  useEffect(() => {
    loadQRCodes();
  }, []);

  const loadQRCodes = async () => {
    setIsLoading(true);
    try {
      // Generate default student QR code
      const defaultQR = {
        id: 1,
        type: 'STUDENT_ID',
        data: user.regNo,
        label: 'Student ID QR',
        description: 'Use this for campus entry',
      };

      setQrCodes([defaultQR]);
    } catch (error) {
      console.error('Error loading QR codes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQRCodes();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={THEME.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My QR Codes</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={THEME.colors.primary} />
            <Text style={styles.loadingText}>Loading QR codes...</Text>
          </View>
        ) : qrCodes.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="qr-code-outline" size={64} color={THEME.colors.textSecondary} />
            <Text style={styles.emptyStateText}>No QR codes available</Text>
          </View>
        ) : (
          qrCodes.map((qr) => (
            <View key={qr.id} style={styles.qrCard}>
              <View style={styles.qrHeader}>
                <View>
                  <Text style={styles.qrLabel}>{qr.label}</Text>
                  <Text style={styles.qrDescription}>{qr.description}</Text>
                </View>
                <View style={styles.qrTypeBadge}>
                  <Text style={styles.qrTypeText}>{qr.type}</Text>
                </View>
              </View>

              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={qr.data}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              </View>

              <View style={styles.qrInfo}>
                <Text style={styles.qrInfoLabel}>Student Name</Text>
                <Text style={styles.qrInfoValue}>{user.firstName} {user.lastName}</Text>
                <Text style={styles.qrInfoLabel}>Registration Number</Text>
                <Text style={styles.qrInfoValue}>{user.regNo}</Text>
                <Text style={styles.qrInfoLabel}>Department</Text>
                <Text style={styles.qrInfoValue}>{user.department}</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: THEME.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: THEME.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: THEME.colors.textSecondary,
    marginTop: 16,
  },
  qrCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  qrLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: THEME.colors.text,
  },
  qrDescription: {
    fontSize: 14,
    color: THEME.colors.textSecondary,
    marginTop: 4,
  },
  qrTypeBadge: {
    backgroundColor: THEME.colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  qrTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.primary,
  },
  qrCodeContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginBottom: 20,
  },
  qrInfo: {
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    paddingTop: 16,
  },
  qrInfoLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 8,
  },
  qrInfoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.colors.text,
    marginTop: 2,
  },
});

export default MyQRCodesScreen;
