import React from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import ThemedText from '../../components/ThemedText';

interface BiometricGateScreenProps {
  loading: boolean;
  message?: string;
  onRetry: () => void;
  onUseLogin: () => void;
}

const BiometricGateScreen: React.FC<BiometricGateScreenProps> = ({
  loading,
  message,
  onRetry,
  onUseLogin,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Ionicons name="finger-print-outline" size={52} color="#0EA5E9" />
        </View>
        <ThemedText style={styles.title}>Secure Access</ThemedText>
        <ThemedText style={styles.subtitle}>
          Authenticate with fingerprint or your device PIN/pattern/password.
        </ThemedText>
        {!!message && <ThemedText style={styles.message}>{message}</ThemedText>}

        <TouchableOpacity style={styles.primaryBtn} onPress={onRetry} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.primaryBtnText}>Authenticate</ThemedText>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={onUseLogin} disabled={loading}>
          <ThemedText style={styles.secondaryBtnText}>Use Login Instead</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  iconWrap: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#E0F2FE', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#475569', textAlign: 'center', lineHeight: 22, marginBottom: 14 },
  message: { fontSize: 13, color: '#DC2626', textAlign: 'center', marginBottom: 14, fontWeight: '600' },
  primaryBtn: { width: '100%', backgroundColor: '#0EA5E9', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { width: '100%', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  secondaryBtnText: { color: '#334155', fontSize: 14, fontWeight: '600' },
});

export default BiometricGateScreen;
