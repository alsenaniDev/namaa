import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useT } from '@/hooks/useT';
import { useApp } from '@/context/AppContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatCurrency, getGregorianDateLocale, parseDateLocal } from '@/utils/format';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dir = useDir();
  const t = useT();
  const router = useRouter();
  const { language } = useLanguage();
  const { commitments, commitmentPayments, expenses, userProfile } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';

  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(
    today.getMonth() + 1 === viewMonth && today.getFullYear() === viewYear ? today.getDate() : null,
  );

  const locale = getGregorianDateLocale(language);

  const { cells, monthLabel } = useMemo(() => {
    // First day of month: 0=Sun..6=Sat
    const first = new Date(viewYear, viewMonth - 1, 1);
    const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
    const startOffset = first.getDay();

    const arr: ({ day: number } | null)[] = [];
    for (let i = 0; i < startOffset; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push({ day: d });
    while (arr.length % 7 !== 0) arr.push(null);

    const label = first.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    return { cells: arr, monthLabel: label };
  }, [viewMonth, viewYear, locale]);

  // Build day → commitments index, scoped to the currently viewed month.
  // A commitment only appears in a month if it is plausibly due that month
  // based on its recurrence/kind and any start/end bounds — otherwise
  // one-time and fully-paid finite loans would echo into every month.
  const commitmentsByDay = useMemo(() => {
    const map: Record<number, typeof commitments> = {};
    const viewStart = new Date(viewYear, viewMonth - 1, 1);
    const viewEnd = new Date(viewYear, viewMonth, 0); // last day of view month

    for (const c of commitments) {
      if (!c.isActive) continue;

      // Date bounds
      const startD = parseDateLocal(c.startDate);
      const endD = parseDateLocal(c.endDate);
      if (startD && startD > viewEnd) continue;
      if (endD && endD < viewStart) continue;

      // One-time: only the month matching startDate
      if (c.kind === 'one_time') {
        if (!startD) continue;
        if (startD.getMonth() + 1 !== viewMonth || startD.getFullYear() !== viewYear) continue;
      }

      // Finite loan: stop showing once all installments are paid
      if (c.kind === 'finite_loan' && c.installmentCount) {
        const paidCount = commitmentPayments.filter(
          (p) => p.commitmentId === c.id && p.status === 'paid',
        ).length;
        if (paidCount >= c.installmentCount) continue;
      }

      // Non-recurring & not a finite loan: only the month of its startDate
      if (!c.isRecurring && c.kind !== 'finite_loan') {
        if (!startD) continue;
        if (startD.getMonth() + 1 !== viewMonth || startD.getFullYear() !== viewYear) continue;
      }

      const list = map[c.dueDay] ?? [];
      list.push(c);
      map[c.dueDay] = list;
    }
    return map;
  }, [commitments, commitmentPayments, viewMonth, viewYear]);

  const expensesByDay = useMemo(() => {
    const map: Record<number, typeof expenses> = {};
    for (const e of expenses) {
      const d = parseDateLocal(e.expenseDate);
      if (!d || d.getMonth() + 1 !== viewMonth || d.getFullYear() !== viewYear) continue;
      const day = d.getDate();
      const list = map[day] ?? [];
      list.push(e);
      map[day] = list;
    }
    return map;
  }, [expenses, viewMonth, viewYear]);

  const paidThisMonth = useMemo(() => {
    const s = new Set<string>();
    for (const p of commitmentPayments) {
      if (p.month === viewMonth && p.year === viewYear && p.status === 'paid') s.add(p.commitmentId);
    }
    return s;
  }, [commitmentPayments, viewMonth, viewYear]);

  const goPrev = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
    setSelectedDay(null);
  };
  const goNext = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
    setSelectedDay(null);
  };
  const goToday = () => {
    setViewMonth(today.getMonth() + 1);
    setViewYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  // Weekday labels Sun..Sat from locale (short).
  const weekdayLabels = useMemo(() => {
    const labels: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(2024, 0, 7 + i); // 2024-01-07 is a Sunday
      labels.push(d.toLocaleDateString(locale, { weekday: 'narrow' }));
    }
    return labels;
  }, [locale]);

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() + 1 && viewYear === today.getFullYear();

  const selectedCommitments = selectedDay ? (commitmentsByDay[selectedDay] ?? []) : [];
  const selectedExpenses = selectedDay ? (expensesByDay[selectedDay] ?? []) : [];
  const selectedHasItems = selectedCommitments.length > 0 || selectedExpenses.length > 0;
  const selectedDateLabel = selectedDay
    ? new Date(viewYear, viewMonth - 1, selectedDay).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + bottomPad + 24 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Month navigator */}
      <View style={[styles.navRow, { flexDirection: dir.row, borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={goPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.navBtn}>
          <Feather name={dir.isRTL ? 'chevron-right' : 'chevron-left'} size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={goToday} style={styles.navTitle} activeOpacity={0.7}>
          <Text style={[styles.navTitleText, { color: colors.foreground }]}>{monthLabel}</Text>
          <Text style={[styles.navTodayText, { color: colors.primary }]}>{t.calendar.today}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.navBtn}>
          <Feather name={dir.isRTL ? 'chevron-left' : 'chevron-right'} size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Weekday header */}
      <View style={[styles.weekRow, { flexDirection: dir.row }]}>
        {weekdayLabels.map((w, i) => (
          <Text key={i} style={[styles.weekday, { color: colors.mutedForeground }]}>{w}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={[styles.grid, { flexDirection: dir.row }]}>
        {cells.map((cell, idx) => {
          if (!cell) {
            return <View key={idx} style={styles.cell} />;
          }
          const day = cell.day;
          const dayCommitments = commitmentsByDay[day] ?? [];
          const dayExpenses = expensesByDay[day] ?? [];
          const hasCommitments = dayCommitments.length > 0;
          const hasExpenses = dayExpenses.length > 0;
          const allPaid = hasCommitments && dayCommitments.every((c) => paidThisMonth.has(c.id));
          const todayCell = isToday(day);
          const selected = selectedDay === day;
          return (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.7}
              onPress={() => setSelectedDay(day)}
              style={[
                styles.cell,
                {
                  backgroundColor: selected
                    ? colors.primary + '22'
                    : todayCell
                      ? colors.primary + '10'
                      : 'transparent',
                  borderColor: selected ? colors.primary : 'transparent',
                },
              ]}
            >
              <Text style={[styles.dayNum, { color: todayCell ? colors.primary : colors.foreground, fontFamily: todayCell ? 'Cairo_700Bold' : 'Cairo_500Medium' }]}>
                {day}
              </Text>
              <View style={styles.dotsRow}>
                {hasCommitments ? (
                  <View style={[styles.dot, { backgroundColor: allPaid ? colors.success : colors.commitment }]} />
                ) : null}
                {hasExpenses ? (
                  <View style={[styles.dot, { backgroundColor: colors.expense }]} />
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legend */}
      <View style={[styles.legend, { flexDirection: dir.row }]}>
        <LegendItem color={colors.commitment} label={t.calendar.commitmentsDot} />
        <LegendItem color={colors.success} label={t.calendar.paidDot} />
        <LegendItem color={colors.expense} label={t.calendar.expensesDot} />
      </View>

      {/* Selected day panel */}
      {selectedDay ? (
        <View style={styles.panel}>
          <Text style={[styles.panelTitle, { color: colors.foreground, textAlign: dir.textAlign }]}>{selectedDateLabel}</Text>

          {!selectedHasItems ? (
            <Card style={styles.emptyWrap}>
              <EmptyState icon="calendar" title={t.calendar.noItems} />
            </Card>
          ) : null}

          {selectedCommitments.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.calendar.commitmentsHeading}</Text>
              {selectedCommitments.map((c) => {
                const isPaid = paidThisMonth.has(c.id);
                return (
                  <Card key={c.id} style={styles.item} padding={12}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => router.push(`/commitments/${c.id}` as any)}
                      style={[styles.itemRow, { flexDirection: dir.row }]}
                    >
                      <View style={[styles.itemStrip, { backgroundColor: isPaid ? colors.success : colors.commitment }]} />
                      <View style={{ flex: 1, marginHorizontal: 10 }}>
                        <Text style={[styles.itemTitle, { color: colors.foreground, textAlign: dir.textAlign }]} numberOfLines={1}>{c.title}</Text>
                        <Text style={[styles.itemSub, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{c.category}</Text>
                      </View>
                      <Text style={[styles.itemAmt, { color: isPaid ? colors.success : colors.commitment }]}>{formatCurrency(c.amount, currency)}</Text>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </View>
          ) : null}

          {selectedExpenses.length > 0 ? (
            <View style={{ marginTop: 12 }}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.calendar.expensesHeading}</Text>
              {selectedExpenses.map((e) => (
                <Card key={e.id} style={styles.item} padding={12}>
                  <View style={[styles.itemRow, { flexDirection: dir.row }]}>
                    <View style={[styles.itemStrip, { backgroundColor: colors.expense }]} />
                    <View style={{ flex: 1, marginHorizontal: 10 }}>
                      <Text style={[styles.itemTitle, { color: colors.foreground, textAlign: dir.textAlign }]} numberOfLines={1}>{e.title}</Text>
                      <Text style={[styles.itemSub, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{e.category}</Text>
                    </View>
                    <Text style={[styles.itemAmt, { color: colors.expense }]}>{formatCurrency(e.amount, currency)}</Text>
                  </View>
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const colors = useColors();
  const dir = useDir();
  return (
    <View style={[styles.legendItem, { flexDirection: dir.row }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: { alignItems: 'center', justifyContent: 'space-between', padding: 8, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  navBtn: { padding: 8 },
  navTitle: { flex: 1, alignItems: 'center' },
  navTitleText: { fontSize: 16, fontFamily: 'Cairo_700Bold' },
  navTodayText: { fontSize: 11, fontFamily: 'Cairo_500Medium', marginTop: 2 },
  weekRow: { marginBottom: 6, paddingHorizontal: 2 },
  weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  grid: { flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    padding: 4,
  },
  dayNum: { fontSize: 14 },
  dotsRow: { flexDirection: 'row', gap: 3, marginTop: 4, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: { gap: 14, marginTop: 12, marginBottom: 4, flexWrap: 'wrap' },
  legendItem: { alignItems: 'center', gap: 6 },
  legendLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  panel: { marginTop: 16 },
  panelTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold', marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: 'Cairo_600SemiBold', marginBottom: 6, textTransform: 'uppercase' },
  item: { marginBottom: 6 },
  itemRow: { alignItems: 'center' },
  itemStrip: { width: 4, height: 32, borderRadius: 2 },
  itemTitle: { fontSize: 14, fontFamily: 'Cairo_500Medium', marginBottom: 2 },
  itemSub: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  itemAmt: { fontSize: 14, fontFamily: 'Cairo_700Bold' },
  emptyWrap: { marginTop: 8, paddingVertical: 16 },
});
