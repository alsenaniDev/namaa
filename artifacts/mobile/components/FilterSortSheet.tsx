import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

export interface FilterSortOption {
  label: string;
  value: string;
}

interface FilterSortSheetProps {
  visible: boolean;
  title: string;
  filterLabel: string;
  sortLabel: string;
  filterValue: string;
  sortValue: string;
  defaultFilterValue: string;
  defaultSortValue: string;
  filterOptions: FilterSortOption[];
  sortOptions: FilterSortOption[];
  applyLabel: string;
  resetLabel: string;
  onApply: (filterValue: string, sortValue: string) => void;
  onClose: () => void;
}

export function FilterSortSheet({
  visible,
  title,
  filterLabel,
  sortLabel,
  filterValue,
  sortValue,
  defaultFilterValue,
  defaultSortValue,
  filterOptions,
  sortOptions,
  applyLabel,
  resetLabel,
  onApply,
  onClose,
}: FilterSortSheetProps) {
  const colors = useColors();
  const dir = useDir();
  const insets = useSafeAreaInsets();
  const [draftFilter, setDraftFilter] = useState(filterValue);
  const [draftSort, setDraftSort] = useState(sortValue);

  useEffect(() => {
    if (!visible) return;
    setDraftFilter(filterValue);
    setDraftSort(sortValue);
  }, [filterValue, sortValue, visible]);

  const chooseFilter = (value: string) => {
    Haptics.selectionAsync();
    setDraftFilter(value);
  };

  const chooseSort = (value: string) => {
    Haptics.selectionAsync();
    setDraftSort(value);
  };

  const apply = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onApply(draftFilter, draftSort);
    onClose();
  };

  const reset = () => {
    Haptics.selectionAsync();
    setDraftFilter(defaultFilterValue);
    setDraftSort(defaultSortValue);
  };

  const renderOptions = (
    options: FilterSortOption[],
    selectedValue: string,
    onSelect: (value: string) => void,
  ) => options.map((option) => {
    const selected = option.value === selectedValue;
    return (
      <TouchableOpacity
        key={option.value}
        activeOpacity={0.78}
        onPress={() => onSelect(option.value)}
        style={[
          styles.option,
          { flexDirection: dir.row, borderColor: selected ? colors.primary + '70' : colors.border, backgroundColor: selected ? colors.primary + '10' : colors.background },
        ]}
      >
        <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent' }]}>
          {selected ? <Feather name="check" size={12} color="#fff" /> : null}
        </View>
        <Text style={[styles.optionText, { color: selected ? colors.primary : colors.foreground, textAlign: dir.textAlign }]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 14 }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={[styles.header, { flexDirection: dir.row }]}>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={onClose}
              style={[styles.iconButton, { backgroundColor: colors.muted }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={[styles.title, { color: colors.foreground, textAlign: dir.textAlign }]}>{title}</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.78}
              onPress={reset}
              style={[styles.resetButton, { backgroundColor: colors.muted }]}
            >
              <Text style={[styles.resetText, { color: colors.mutedForeground }]}>{resetLabel}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView {...iosScrollViewObserverProps} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{filterLabel}</Text>
            <View style={styles.optionsWrap}>{renderOptions(filterOptions, draftFilter, chooseFilter)}</View>

            <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{sortLabel}</Text>
            <View style={styles.optionsWrap}>{renderOptions(sortOptions, draftSort, chooseSort)}</View>
          </ScrollView>

          <TouchableOpacity activeOpacity={0.84} onPress={apply} style={[styles.applyButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.applyText}>{applyLabel}</Text>
            <Feather name="check" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { ...StyleSheet.absoluteFillObject },
  sheet: {
    maxHeight: '82%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  header: { alignItems: 'center', gap: 10, marginBottom: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 17, fontFamily: 'Cairo_700Bold' },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  resetButton: { minHeight: 36, borderRadius: 18, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  resetText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  content: { paddingBottom: 8 },
  sectionTitle: { fontSize: 12, fontFamily: 'Cairo_700Bold', marginBottom: 8, marginTop: 4 },
  optionsWrap: { gap: 8, marginBottom: 16 },
  option: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, alignItems: 'center', gap: 10 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1, fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  applyButton: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  applyText: { color: '#fff', fontSize: 14, fontFamily: 'Cairo_700Bold' },
});
