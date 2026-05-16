import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, FlatList, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as dir from '@/utils/dir';

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function Select({ label, value, options, onValueChange, placeholder = 'اختر...' }: SelectProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text> : null}
      <TouchableOpacity
        onPress={() => setOpen(true)}
        style={[
          styles.trigger,
          { borderColor: colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 2 },
        ]}
        activeOpacity={0.8}
      >
        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
        <Text style={[styles.triggerText, { color: selected ? colors.foreground : colors.mutedForeground }]}>
          {selected ? selected.label : placeholder}
        </Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} activeOpacity={1}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            {label ? <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text> : null}
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => { onValueChange(item.value); setOpen(false); }}
                  style={[
                    styles.option,
                    { borderBottomColor: colors.border, backgroundColor: item.value === value ? colors.secondary : 'transparent' },
                  ]}
                >
                  <Text style={[styles.optionText, { color: colors.foreground }]}>{item.label}</Text>
                  {item.value === value ? <Feather name="check" size={18} color={colors.primary} /> : null}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6, textAlign: dir.textAlign, fontFamily: 'Inter_500Medium' },
  trigger: { flexDirection: dir.row, alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 13, minHeight: 48, gap: 8 },
  triggerText: { flex: 1, fontSize: 15, textAlign: dir.textAlign, fontFamily: 'Inter_400Regular' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '70%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '600', textAlign: 'center', paddingVertical: 12, fontFamily: 'Inter_600SemiBold' },
  option: { flexDirection: dir.row, alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  optionText: { flex: 1, fontSize: 15, textAlign: dir.textAlign, fontFamily: 'Inter_400Regular' },
});
