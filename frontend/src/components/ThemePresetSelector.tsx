import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Switch,
  FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme, THEME_PRESETS, ThemePresetId } from '../context/ThemeContext';
import ThemedText from './ThemedText';

interface ThemePresetSelectorProps {
  onScrollLock?: (locked: boolean) => void;
}

const ThemePresetSelector: React.FC<ThemePresetSelectorProps> = () => {
  const { theme, isDark, activePreset, transitioning, applyPreset, toggleTheme } = useTheme();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeTheme = THEME_PRESETS.find(p => p.id === activePreset);

  const handleSelect = (id: ThemePresetId) => {
    if (transitioning) return;
    applyPreset(id);
    setDropdownOpen(false);
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.surface }]}>
      {/* Header row: icon + title + dark toggle */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="color-palette-outline" size={18} color={theme.primary} />
          <ThemedText style={[styles.headerTitle, { color: theme.text }]}>App Theme</ThemedText>
        </View>
        <View style={styles.darkToggle}>
          <Ionicons
            name={isDark ? 'moon' : 'sunny-outline'}
            size={16}
            color={isDark ? '#A78BFA' : '#F59E0B'}
          />
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#E5E7EB', true: '#6D28D9' }}
            thumbColor={isDark ? '#A78BFA' : '#FFFFFF'}
            style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
          />
        </View>
      </View>

      {/* Dropdown trigger */}
      <TouchableOpacity
        style={[styles.dropdownTrigger, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
        onPress={() => setDropdownOpen(true)}
        activeOpacity={0.8}
      >
        {activeTheme && (
          <View style={styles.triggerContent}>
            {/* Color swatches preview */}
            <View style={styles.swatchRow}>
              {activeTheme.preview.slice(0, 3).map((color, i) => (
                <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
              ))}
            </View>
            <ThemedText style={[styles.triggerName, { color: theme.text }]}>{activeTheme.name}</ThemedText>
          </View>
        )}
        <Ionicons name="chevron-down" size={18} color={theme.textSecondary} />
      </TouchableOpacity>

      {/* Active label */}
      <View style={[styles.activeRow, { borderTopColor: theme.border }]}>
        <View style={[styles.activeDot, { backgroundColor: theme.primary }]} />
        <ThemedText style={[styles.activeLabel, { color: theme.textSecondary }]}>
          {`${activeTheme?.name ?? ''} · ${isDark ? 'Dark' : 'Light'}`}
        </ThemedText>
      </View>

      {/* Dropdown modal */}
      <Modal
        visible={dropdownOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDropdownOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownOpen(false)}
        >
          <View style={[styles.dropdownList, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <ThemedText style={[styles.dropdownTitle, { color: theme.textSecondary, borderBottomColor: theme.border }]}>
              Select Theme
            </ThemedText>
            {THEME_PRESETS.map(preset => {
              const isActive = activePreset === preset.id;
              const [c1, c2, c3] = preset.preview;
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.dropdownItem,
                    { borderBottomColor: theme.border },
                    isActive && { backgroundColor: theme.primary + '12' },
                  ]}
                  onPress={() => handleSelect(preset.id)}
                  activeOpacity={0.75}
                >
                  <View style={styles.itemSwatchRow}>
                    {[c1, c2, c3].map((color, i) => (
                      <View key={i} style={[styles.itemSwatch, { backgroundColor: color }]} />
                    ))}
                  </View>
                  <View style={styles.itemText}>
                    <ThemedText style={[styles.itemName, { color: isActive ? theme.primary : theme.text }]}>
                      {preset.name}
                    </ThemedText>
                    <ThemedText style={[styles.itemDesc, { color: theme.textSecondary }]}>
                      {preset.description}
                    </ThemedText>
                  </View>
                  {isActive && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  darkToggle: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  swatchRow: { flexDirection: 'row', gap: 3 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  triggerName: { fontSize: 14, fontWeight: '700' },
  triggerDesc: { fontSize: 12, fontWeight: '500' },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeLabel: { fontSize: 12, fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownList: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  dropdownTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  itemSwatchRow: { flexDirection: 'row', gap: 4 },
  itemSwatch: { width: 16, height: 16, borderRadius: 8 },
  itemText: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  itemDesc: { fontSize: 12, fontWeight: '500' },
});

export default ThemePresetSelector;
