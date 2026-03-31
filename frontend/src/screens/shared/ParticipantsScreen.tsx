import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';
import ThemedText from '../../components/ThemedText';

export interface Participant {
  id: string;
  name: string;
  type: 'student' | 'staff';
  department?: string;
  isReceiver?: boolean;
}

interface ParticipantsScreenProps {
  participants: Participant[];
  onBack: () => void;
  title?: string;
}

type FilterTab = 'All' | 'Students' | 'Staff';

const ParticipantsScreen: React.FC<ParticipantsScreenProps> = ({
  participants,
  onBack,
  title = 'Participants',
}) => {
  const hasStudents = participants.some(p => p.type === 'student');
  const hasStaff = participants.some(p => p.type === 'staff');
  const showTabs = hasStudents && hasStaff;

  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = participants;

    if (showTabs && activeTab === 'Students') {
      list = list.filter(p => p.type === 'student');
    } else if (showTabs && activeTab === 'Staff') {
      list = list.filter(p => p.type === 'staff');
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }

    return list;
  }, [participants, activeTab, search, showTabs]);

  const renderItem = ({ item }: { item: Participant }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, item.type === 'staff' ? styles.avatarStaff : styles.avatarStudent]}>
        <ThemedText style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</ThemedText>
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardRow}>
          <ThemedText style={styles.cardName} numberOfLines={1}>{item.name}</ThemedText>
          {item.isReceiver && (
            <View style={styles.receiverBadge}>
              <Ionicons name="qr-code" size={10} color="#FFF" />
              <ThemedText style={styles.receiverBadgeText}>QR</ThemedText>
            </View>
          )}
        </View>
        <ThemedText style={styles.cardId}>{item.id}{item.department ? ` • ${item.department}` : ''}</ThemedText>
      </View>
      <View style={[styles.rolePill, item.type === 'staff' ? styles.rolePillStaff : styles.rolePillStudent]}>
        <ThemedText style={[styles.roleText, item.type === 'staff' ? styles.roleTextStaff : styles.roleTextStudent]}>
          {item.type === 'staff' ? 'Staff' : 'Student'}
        </ThemedText>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.headerTitle}>{title}</ThemedText>
          <ThemedText style={styles.headerSub}>{participants.length} participants</ThemedText>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or ID..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Filter Tabs — only when both types exist */}
      {showTabs && (
        <View style={styles.tabRow}>
          {(['All', 'Students', 'Staff'] as FilterTab[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </ThemedText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item, i) => `${item.type}-${item.id}-${i}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={52} color="#D1D5DB" />
            <ThemedText style={styles.emptyText}>No participants found</ThemedText>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
  headerSub: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#1F2937' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarStudent: { backgroundColor: '#DBEAFE' },
  avatarStaff: { backgroundColor: '#D1FAE5' },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#374151' },
  cardInfo: { flex: 1 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  cardName: { fontSize: 15, fontWeight: '600', color: '#1F2937', flex: 1 },
  cardId: { fontSize: 12, color: '#9CA3AF' },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rolePillStudent: { backgroundColor: '#EFF6FF' },
  rolePillStaff: { backgroundColor: '#ECFDF5' },
  roleText: { fontSize: 11, fontWeight: '700' },
  roleTextStudent: { color: '#2563EB' },
  roleTextStaff: { color: '#059669' },
  receiverBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  receiverBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFF' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: '#9CA3AF', marginTop: 12 },
});

export default ParticipantsScreen;
