import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, FlatList, StyleSheet, Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import ThemedText from './ThemedText';

export interface DropdownItem {
  label: string;
  value: string;
}

interface SearchableDropdownProps {
  items: DropdownItem[];
  selectedValue: string;
  onSelect: (value: string, label: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  items,
  selectedValue,
  onSelect,
  placeholder = 'Select...',
  disabled = false,
}) => {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<View>(null);

  const selectedLabel = items.find(i => i.value === selectedValue)?.label || '';

  const handleOpen = () => {
    if (disabled) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setDropdownPos({ top: y + height + 4, left: x, width });
      setOpen(true);
    });
  };

  const handleSelect = (item: DropdownItem) => {
    onSelect(item.value, item.label);
    setOpen(false);
  };

  return (
    <>
      {/* Trigger */}
      <View ref={triggerRef} collapsable={false}>
        <TouchableOpacity
          style={[
            styles.trigger,
            { backgroundColor: theme.surface, borderColor: disabled ? theme.border : theme.primary },
            disabled && { opacity: 0.5 },
          ]}
          onPress={handleOpen}
          activeOpacity={0.8}
          disabled={disabled}
        >
          <ThemedText
            style={[styles.triggerText, { color: selectedValue ? theme.text : theme.textTertiary }]}
            numberOfLines={1}
          >
            {selectedLabel || placeholder}
          </ThemedText>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      {/* Dropdown — anchored to trigger */}
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
        <View
          style={[
            styles.dropdownCard,
            {
              backgroundColor: theme.surface,
              borderColor: theme.primary,
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            },
          ]}
        >
          <FlatList
            data={items}
            keyExtractor={item => item.value}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.listItem,
                  { borderBottomColor: theme.border },
                  item.value === selectedValue && { backgroundColor: theme.primary + '12' },
                ]}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <ThemedText
                  style={[
                    styles.listItemText,
                    { color: theme.text },
                    item.value === selectedValue && { color: theme.primary, fontWeight: '700' },
                  ]}
                >
                  {item.label}
                </ThemedText>
                {item.value === selectedValue && (
                  <Ionicons name="checkmark" size={16} color={theme.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <ThemedText style={[styles.emptyText, { color: theme.textTertiary }]}>No options</ThemedText>
              </View>
            }
          />
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 50,
  },
  triggerText: { flex: 1, fontSize: 15, marginRight: 8 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  dropdownCard: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 1.5,
    maxHeight: 300,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  list: { maxHeight: 300 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listItemText: { fontSize: 15, flex: 1 },
  empty: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14 },
});

export default SearchableDropdown;
