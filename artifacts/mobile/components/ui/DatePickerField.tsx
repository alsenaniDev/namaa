import React, { useMemo, useState } from 'react';
import { FlatList, GestureResponderEvent, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { getGregorianDateLocale, parseDateLocal } from '@/utils/format';
import { useT } from '@/hooks/useT';
import { useLanguage } from '@/context/LanguageContext';

interface DatePickerFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  allowClear?: boolean;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function DatePickerField({ label, value, onChange, error, allowClear = false }: DatePickerFieldProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dir = useDir();
  const t = useT();
  const { language } = useLanguage();
  const current = parseDateLocal(value) ?? new Date();
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(current.getFullYear());
  const [month, setMonth] = useState(current.getMonth() + 1);
  const [day, setDay] = useState(current.getDate());

  const years = useMemo(
    () => Array.from({ length: 41 }, (_, i) => currentYear - 10 + i),
    [currentYear],
  );
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const days = useMemo(
    () => Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1),
    [year, month],
  );

  const openPicker = () => {
    const d = parseDateLocal(value) ?? new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setDay(d.getDate());
    setOpen(true);
  };

  const chooseMonth = (nextMonth: number) => {
    setMonth(nextMonth);
    setDay((d) => Math.min(d, daysInMonth(year, nextMonth)));
  };

  const chooseYear = (nextYear: number) => {
    setYear(nextYear);
    setDay((d) => Math.min(d, daysInMonth(nextYear, month)));
  };

  const confirm = () => {
    onChange(toDateString(year, month, day));
    setOpen(false);
  };

  const clearValue = (event: GestureResponderEvent) => {
    event.stopPropagation();
    onChange('');
  };

  const displayDate = parseDateLocal(value);
  const display = displayDate
    ? displayDate.toLocaleDateString(getGregorianDateLocale(language), { year: 'numeric', month: 'long', day: 'numeric' })
    : t.common.none;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{label}</Text>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.8}
        style={[
          styles.trigger,
          { flexDirection: dir.row, borderColor: error ? colors.danger : colors.border, backgroundColor: colors.card, borderRadius: colors.radius - 2 },
        ]}
      >
        <Feather name="calendar" size={17} color={colors.mutedForeground} />
        <Text style={[styles.triggerText, { textAlign: dir.textAlign, color: value ? colors.foreground : colors.mutedForeground }]}>
          {display}
        </Text>
        {allowClear && value ? (
          <TouchableOpacity
            onPress={clearValue}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={17} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      {error ? <Text style={[styles.error, { textAlign: dir.textAlign, color: colors.danger }]}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={[styles.overlay, { backgroundColor: colors.overlay }]} activeOpacity={1} onPress={() => setOpen(false)}>
          <View
            onStartShouldSetResponder={() => true}
            style={[
              styles.sheet,
              { backgroundColor: colors.card, paddingBottom: insets.bottom + 16, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>{label}</Text>
            <View style={[styles.columns, { flexDirection: dir.row }]}>
              <PickerColumn values={days} selected={day} onSelect={setDay} suffix="" />
              <PickerColumn values={months} selected={month} onSelect={chooseMonth} suffix="" />
              <PickerColumn values={years} selected={year} onSelect={chooseYear} suffix="" />
            </View>
            <View style={[styles.actions, { flexDirection: dir.row }]}>
              <TouchableOpacity onPress={() => setOpen(false)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                <Text style={[styles.cancelText, { color: colors.foreground }]}>{t.common.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirm} style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={styles.doneText}>{t.common.done}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function PickerColumn({
  values,
  selected,
  onSelect,
}: {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  suffix: string;
}) {
  const colors = useColors();
  return (
    <FlatList
      data={values}
      keyExtractor={(item) => String(item)}
      style={styles.column}
      initialScrollIndex={Math.max(0, values.indexOf(selected))}
      getItemLayout={(_, index) => ({ length: 42, offset: 42 * index, index })}
      renderItem={({ item }) => {
        const active = item === selected;
        return (
          <TouchableOpacity
            onPress={() => onSelect(item)}
            style={[styles.dateOption, { backgroundColor: active ? colors.secondary : 'transparent' }]}
          >
            <Text style={[styles.dateOptionText, { color: active ? colors.primary : colors.foreground }]}>
              {item}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '500', marginBottom: 6, fontFamily: 'Cairo_500Medium' },
  trigger: { alignItems: 'center', borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 13, minHeight: 48, gap: 8 },
  triggerText: { flex: 1, fontSize: 15, fontFamily: 'Cairo_400Regular' },
  error: { fontSize: 12, marginTop: 4, fontFamily: 'Cairo_400Regular' },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '72%', paddingHorizontal: 16 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetTitle: { fontSize: 16, textAlign: 'center', paddingVertical: 12, fontFamily: 'Cairo_600SemiBold' },
  columns: { gap: 8, height: 240 },
  column: { flex: 1 },
  dateOption: { height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 10, marginBottom: 4 },
  dateOptionText: { fontSize: 15, fontFamily: 'Cairo_600SemiBold' },
  actions: { gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 46, borderRadius: 12, borderWidth: 1 },
  cancelText: { fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
  doneText: { color: '#fff', fontSize: 14, fontFamily: 'Cairo_600SemiBold' },
});
