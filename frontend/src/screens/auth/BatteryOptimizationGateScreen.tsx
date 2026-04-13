import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ThemedText from '../../components/ThemedText';
import {
  getAllNotificationSettings,
  openBatteryOptimizationSettings,
  openNotificationSettings,
  NotificationSettings,
} from '../../services/batteryOptimization.service';

interface Props {
  onAllDone: () => void;
}

const BatteryOptimizationGateScreen: React.FC<Props> = ({ onAllDone }) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [rechecking, setRechecking] = useState(false);
  const onAllDoneRef = useRef(onAllDone);
  onAllDoneRef.current = onAllDone;

  const doCheck = async () => {
    setRechecking(true);
    try {
      const s = await getAllNotificationSettings();
      setSettings(s);
      return s;
    } finally {
      setRechecking(false);
    }
  };

  useEffect(() => { doCheck(); }, []);

  // Auto-proceed the moment all checks pass
  useEffect(() => {
    if (!settings) return;
    const brand = (settings.brand || '').toLowerCase();
    const isMotorolaOrStock = brand.includes('motorola') || brand.includes('moto') || brand.includes('google') || brand.includes('pixel');
    const battOk = isMotorolaOrStock || settings.batteryOptimizationDisabled;
    if (battOk && settings.notificationsEnabled && settings.channelsEnabled) {
      onAllDoneRef.current();
    }
  }, [settings]);

  const handleRecheck = async () => {
    const s = await doCheck();
    if (s) {
      const b = (s.brand || '').toLowerCase();
      const isMotorolaOrStock = b.includes('motorola') || b.includes('moto') || b.includes('google') || b.includes('pixel');
      const battOk = isMotorolaOrStock || s.batteryOptimizationDisabled;
      if (battOk && s.notificationsEnabled && s.channelsEnabled) {
        onAllDoneRef.current();
      }
    }
  };

  if (!settings) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#1E40AF" />
        <ThemedText style={styles.loadingText}>Checking settings…</ThemedText>
      </View>
    );
  }

  const brand = (settings.brand || '').toLowerCase();
  const isMotorolaOrStock = brand.includes('motorola') || brand.includes('moto') || brand.includes('google') || brand.includes('pixel');

  // On Motorola/stock Android, battery optimization is not an issue — skip that check
  const allDone = (isMotorolaOrStock || settings.batteryOptimizationDisabled) && settings.notificationsEnabled && settings.channelsEnabled;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={44} color="#1E40AF" />
        </View>
        <ThemedText style={styles.title}>Setup Required</ThemedText>
        <ThemedText style={styles.subtitle}>
          These settings must be configured before you can log in. They ensure you receive gate pass approvals and security alerts instantly.
        </ThemedText>

        {/* Check 1 — Battery Optimization (skip on Motorola/stock Android) */}
        {!isMotorolaOrStock && (
        <CheckCard
          index={1}
          title="Battery Optimization"
          description="Must be disabled so the app can receive notifications when closed."
          isOk={settings.batteryOptimizationDisabled}
          steps={[
            'Tap "Fix" below',
            'The system will ask: "Remove battery restrictions for RIT Gate?"',
            'Tap "Allow"',
          ]}
          fixLabel="Disable Battery Optimization"
          onFix={openBatteryOptimizationSettings}
          onDone={handleRecheck}
          recheckLoading={rechecking}
        />
        )}

        {/* Check 2 — Notification Permission */}
        <CheckCard
          index={2}
          title="Notifications Enabled"
          description="The app needs permission to show notifications."
          steps={[
            'Tap "Fix" below to open notification settings',
            'Make sure the main toggle at the top is ON',
          ]}
          isOk={settings.notificationsEnabled}
          fixLabel="Open Notification Settings"
          onFix={openNotificationSettings}
          onDone={handleRecheck}
          recheckLoading={rechecking}
        />

        {/* Check 3 — Channels not blocked */}
        <CheckCard
          index={3}
          title="Notification Channels"
          description="All notification channels must be enabled (none blocked)."
          isOk={settings.channelsEnabled}
          steps={[
            'Tap "Fix" below to open notification settings',
            'Scroll down to see all channels',
            'Make sure none are set to "Off" or "Silent"',
          ]}
          fixLabel="Open Channel Settings"
          onFix={openNotificationSettings}
          onDone={handleRecheck}
          recheckLoading={rechecking}
        />

        {/* Re-check / Continue */}
        <TouchableOpacity
          style={[styles.recheckBtn, allDone && styles.recheckBtnDone]}
          onPress={handleRecheck}
          disabled={rechecking}
          activeOpacity={0.85}
        >
          {rechecking ? (
            <ActivityIndicator size="small" color="#1E40AF" />
          ) : (
            <>
              <Ionicons
                name={allDone ? 'checkmark-circle' : 'refresh-outline'}
                size={18}
                color={allDone ? '#10B981' : '#1E40AF'}
              />
              <ThemedText style={[styles.recheckBtnText, allDone && styles.recheckBtnTextDone]}>
                {allDone ? 'All set — continue' : 'Re-check all settings'}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>

        <ThemedText style={styles.footer}>
          You cannot log in until all settings above are configured.
        </ThemedText>
      </ScrollView>
    </SafeAreaView>
  );
};

// ─── CheckCard ────────────────────────────────────────────────────────────────

interface CheckCardProps {
  index: number;
  title: string;
  description: string;
  isOk: boolean;
  steps: string[];
  fixLabel: string;
  onFix: () => void;
  onDone: () => void;
  recheckLoading: boolean;
}

const CheckCard: React.FC<CheckCardProps> = ({
  index, title, description, isOk, steps, fixLabel, onFix, onDone, recheckLoading,
}) => {
  const [expanded, setExpanded] = useState(!isOk);

  useEffect(() => { if (isOk) setExpanded(false); }, [isOk]);

  return (
    <View style={[styles.card, isOk && styles.cardOk]}>
      <TouchableOpacity style={styles.cardHeader} onPress={() => setExpanded(e => !e)} activeOpacity={0.7}>
        <View style={[styles.indexBadge, isOk && styles.indexBadgeOk]}>
          {isOk
            ? <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            : <ThemedText style={styles.indexText}>{index}</ThemedText>
          }
        </View>
        <View style={styles.cardHeaderText}>
          <ThemedText style={[styles.cardTitle, isOk && styles.cardTitleOk]}>{title}</ThemedText>
          <ThemedText style={styles.cardDesc}>{description}</ThemedText>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color="#94A3B8" />
      </TouchableOpacity>

      {expanded && !isOk && (
        <View style={styles.cardBody}>
          {steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepDot} />
              <ThemedText style={styles.stepText}>{step}</ThemedText>
            </View>
          ))}
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.fixBtn} onPress={onFix} activeOpacity={0.85}>
              <Ionicons name="settings-outline" size={15} color="#FFFFFF" />
              <ThemedText style={styles.fixBtnText}>{fixLabel}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={onDone} disabled={recheckLoading} activeOpacity={0.85}>
              {recheckLoading
                ? <ActivityIndicator size="small" color="#1E40AF" />
                : <ThemedText style={styles.doneBtnText}>Done</ThemedText>
              }
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#64748B' },
  scroll: { padding: 20, paddingBottom: 40 },
  headerIcon: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
    marginTop: 8, marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  card: {
    borderRadius: 14, borderWidth: 1.5, borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC', marginBottom: 12, overflow: 'hidden',
  },
  cardOk: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A', marginBottom: 2 },
  cardTitleOk: { color: '#166534' },
  cardDesc: { fontSize: 12, color: '#64748B', lineHeight: 17 },
  indexBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: '#1E40AF',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  indexBadgeOk: { backgroundColor: '#10B981' },
  indexText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 10 },
  stepDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#1E40AF', marginTop: 7, flexShrink: 0 },
  stepText: { fontSize: 13, color: '#334155', lineHeight: 20, flex: 1 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  fixBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: '#1E40AF', borderRadius: 10, paddingVertical: 11,
  },
  fixBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  doneBtn: {
    paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 11,
    borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  doneBtnText: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },
  recheckBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 14, paddingVertical: 15, marginTop: 4, marginBottom: 12,
    backgroundColor: '#EFF6FF', borderWidth: 1.5, borderColor: '#BFDBFE',
  },
  recheckBtnDone: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  recheckBtnText: { fontSize: 15, fontWeight: '700', color: '#1E40AF' },
  recheckBtnTextDone: { color: '#10B981' },
  footer: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
});

export default BatteryOptimizationGateScreen;
