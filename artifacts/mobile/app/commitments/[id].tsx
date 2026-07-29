import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, TouchableOpacity, Platform,
  Modal, KeyboardAvoidingView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { formatCurrency, formatDate, getCurrentMonthYear, toAsciiDigits } from '@/utils/format';
import {
  getCommitmentProgress,
  getCommitmentMonthlyShare,
  willArchiveCommitmentAfterPaid,
  willArchiveCommitmentAfterPaidPeriods,
} from '@/utils/calculations';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LenderAvatar } from '@/components/LenderAvatar';
import { CommitmentArchiveCelebrationModal } from '@/components/CommitmentArchiveCelebrationModal';
import { CurrencyAmountInput } from '@/components/CurrencyAmountInput';
import type { CommitmentPayment } from '@/types';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

type ScheduleRow = {
  index: number;          // 1-based installment number
  month: number;          // 1..12
  year: number;
  payment?: CommitmentPayment;
};

export default function CommitmentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id: string }>();
  const { commitments, commitmentPayments, lenders, userProfile, markCommitmentPaid, markCommitmentUnpaid, bulkUpdateCommitmentPayments } = useApp();

  const commitment = commitments.find((c) => c.id === params.id);
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const [editAmount, setEditAmount] = useState('');
  // Bulk selection mode: when on, tapping rows toggles selection instead of
  // opening the single-installment editor. Selected periods are keyed by
  // "year-month" so we can dedupe across renders.
  const [selectMode, setSelectMode] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const archiveActionRef = useRef<(() => Promise<void> | void) | null>(null);
  const [archiveCongratsName, setArchiveCongratsName] = useState<string | null>(null);
  const periodKey = (m: number, y: number) => `${y}-${m}`;

  // Payments for this commitment, sorted oldest → newest by (year, month).
  const myPayments = useMemo(
    () => commitmentPayments
      .filter((p) => p.commitmentId === params.id)
      .sort((a, b) => (a.year - b.year) || (a.month - b.month)),
    [commitmentPayments, params.id],
  );

  const isFinite = commitment?.kind === 'finite_loan' && !!commitment.installmentCount && commitment.installmentCount > 0;
  const { month: curMonth, year: curYear } = getCurrentMonthYear();

  // Build the full installment schedule for finite loans.
  // Anchor priority: explicit startDate (YYYY-MM-DD) → earliest recorded
  // payment → current month. This keeps installment numbering aligned with
  // the real loan start when the user provided it, but degrades gracefully.
  // Installments walk forward from anchor for `installmentCount` months.
  //
  // NOTE: this useMemo MUST run on every render (including when commitment
  // is undefined after a delete), otherwise React throws "Rendered fewer
  // hooks than expected" and the error screen appears.
  const schedule: ScheduleRow[] = useMemo(() => {
    if (!commitment || !isFinite) return [];
    const count = commitment.installmentCount!;
    let anchor: { y: number; m: number } | null = null;
    if (commitment.startDate) {
      const parts = commitment.startDate.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
        anchor = { y, m };
      }
    }
    if (!anchor && myPayments[0]) {
      anchor = { y: myPayments[0].year, m: myPayments[0].month };
    }
    if (!anchor) anchor = { y: curYear, m: curMonth };

    const rows: ScheduleRow[] = [];
    let y = anchor.y;
    let m = anchor.m;
    for (let i = 1; i <= count; i++) {
      const payment = commitmentPayments.find(
        (p) => p.commitmentId === commitment.id && p.year === y && p.month === m,
      );
      rows.push({ index: i, month: m, year: y, payment });
      m += 1;
      if (m === 13) { m = 1; y += 1; }
    }
    return rows;
  }, [isFinite, commitment, myPayments, commitmentPayments, curMonth, curYear]);

  // If the commitment is deleted (or the id is invalid), bounce back to the
  // list instead of trying to render against undefined data.
  useEffect(() => {
    if (!commitment) {
      router.replace('/commitments');
    }
  }, [commitment, router]);

  if (!commitment) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground }}>—</Text>
      </View>
    );
  }

  const lender = commitment.lenderId ? lenders.find((l) => l.id === commitment.lenderId) : undefined;
  const accent = lender?.color ?? colors.commitment;
  const monthlyShare = getCommitmentMonthlyShare(commitment);
  const progress = getCommitmentProgress(commitment, commitmentPayments);

  const thisMonthPayment = commitmentPayments.find(
    (p) => p.commitmentId === commitment.id && p.month === curMonth && p.year === curYear,
  );
  const isPaidThisMonth = thisMonthPayment?.status === 'paid';

  const openArchiveCongrats = (name: string, onConfirm: () => Promise<void> | void) => {
    archiveActionRef.current = onConfirm;
    setArchiveCongratsName(name);
  };

  const closeArchiveCongrats = () => {
    archiveActionRef.current = null;
    setArchiveCongratsName(null);
  };

  const confirmArchiveCongrats = () => {
    const action = archiveActionRef.current;
    closeArchiveCongrats();
    action?.();
  };

  const confirmArchiveThenPay = (
    month: number,
    year: number,
    amount: number,
    onPay: () => Promise<void> | void,
  ) => {
    if (!willArchiveCommitmentAfterPaid(commitment, commitmentPayments, month, year, amount)) {
      onPay();
      return;
    }
    openArchiveCongrats(commitment.title, onPay);
  };

  const confirmArchiveThenPayPeriods = (
    periods: { month: number; year: number }[],
    amount: number,
    onPay: () => Promise<void> | void,
  ) => {
    if (!willArchiveCommitmentAfterPaidPeriods(commitment, commitmentPayments, periods, amount)) {
      onPay();
      return;
    }
    openArchiveCongrats(commitment.title, onPay);
  };

  // History for non-finite (recurring bills): show all recorded payments newest first.
  const history = useMemo(
    () => [...myPayments].sort((a, b) => (b.year - a.year) || (b.month - a.month)),
    [myPayments],
  );

  const togglePaidThisMonth = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPaidThisMonth) markCommitmentUnpaid(commitment.id, curMonth, curYear);
    else confirmArchiveThenPay(
      curMonth,
      curYear,
      monthlyShare,
      () => markCommitmentPaid(commitment.id, curMonth, curYear, monthlyShare),
    );
  };

  const openEditor = (row: ScheduleRow) => {
    Haptics.selectionAsync();
    setBulkMode(false);
    setEditing(row);
    setEditAmount((row.payment?.amount ?? monthlyShare).toString());
  };

  const closeEditor = () => {
    setEditing(null);
    setEditAmount('');
    setBulkMode(false);
  };

  // Editor action: what should the save button do?
  //  - 'paid'    → mark the installment(s) paid with the entered amount
  //  - 'unpaid'  → clear payment records entirely (single mode only)
  //  - 'amount'  → keep status unpaid but persist an amount override so the
  //                schedule row shows the custom value instead of the default
  type SaveAction = 'paid' | 'unpaid' | 'amount';

  const saveEditor = async (action: SaveAction) => {
    if (!editing) return;
    const raw = parseFloat(toAsciiDigits(editAmount));
    // Allow 0 explicitly (e.g. a waived/skipped installment, or a partial
    // amount-only override of 0). Only fall back to the default installment
    // amount when the field is empty or non-numeric. Negative values clamp to 0.
    const amt = Number.isFinite(raw)
      ? Math.max(0, raw)
      : (editAmount.trim() === '' ? monthlyShare : 0);
    if (bulkMode) {
      const periods = Array.from(selectedKeys).map((k) => {
        const [y, m] = k.split('-').map((n) => parseInt(n, 10));
        return { month: m, year: y };
      });
      Haptics.notificationAsync(
        action === 'paid'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      const applyBulk = async () => {
        await bulkUpdateCommitmentPayments(
          commitment.id, periods, action, action === 'unpaid' ? undefined : amt,
        );
        setSelectMode(false);
        setSelectedKeys(new Set());
      };
      if (action === 'paid') {
        confirmArchiveThenPayPeriods(periods, amt, applyBulk);
      } else {
        await applyBulk();
      }
    } else if (action === 'paid') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      confirmArchiveThenPay(
        editing.month,
        editing.year,
        amt,
        () => markCommitmentPaid(commitment.id, editing.month, editing.year, amt),
      );
    } else if (action === 'unpaid') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await markCommitmentUnpaid(commitment.id, editing.month, editing.year);
    } else {
      // amount-only override for a single installment via bulk method (single
      // period). Keeps status unpaid but stores the custom amount.
      Haptics.selectionAsync();
      await bulkUpdateCommitmentPayments(
        commitment.id,
        [{ month: editing.month, year: editing.year }],
        'amount',
        amt,
      );
    }
    closeEditor();
  };

  const toggleSelectMode = () => {
    Haptics.selectionAsync();
    setSelectMode((v) => !v);
    setSelectedKeys(new Set());
  };

  const toggleRowSelected = (row: ScheduleRow) => {
    Haptics.selectionAsync();
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      const k = periodKey(row.month, row.year);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const selectAll = () => {
    Haptics.selectionAsync();
    setSelectedKeys(new Set(schedule.map((r) => periodKey(r.month, r.year))));
  };

  const clearSelection = () => {
    Haptics.selectionAsync();
    setSelectedKeys(new Set());
  };

  /**
   * "Mark unpaid" in the bulk bar applies immediately (no amount needed).
   * "Update" opens the editor modal in bulk mode so the user can enter a
   * single amount and choose to either save it as paid for all selected
   * installments, or save it as an amount override only (still unpaid).
   */
  const bulkMarkUnpaid = () => {
    if (selectedKeys.size === 0) return;
    const periods = Array.from(selectedKeys).map((k) => {
      const [y, m] = k.split('-').map((n) => parseInt(n, 10));
      return { month: m, year: y };
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    bulkUpdateCommitmentPayments(commitment.id, periods, 'unpaid');
    setSelectMode(false);
    setSelectedKeys(new Set());
  };

  const openBulkEditor = () => {
    if (selectedKeys.size === 0) return;
    Haptics.selectionAsync();
    setBulkMode(true);
    setEditing({ index: 0, month: 0, year: 0 }); // sentinel; modal renders differently in bulk
    setEditAmount(monthlyShare.toString());
  };

  const kindLabel =
    commitment.kind === 'finite_loan' ? t.commitments.kindFiniteLoan
      : commitment.kind === 'one_time' ? t.commitments.kindOneTime
        : t.commitments.kindRecurringBill;

  return (
    <>
      <Stack.Screen
        options={{
          title: commitment.title,
          // headerRight is reserved globally for the back button (see root
          // _layout). The edit action lives on headerLeft (visual left) so
          // it doesn't compete with the user's tap target for "back".
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/commitments/add', params: { id: commitment.id } })}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={{ paddingHorizontal: 14, paddingVertical: 6 }}
            >
              <Feather name="edit-2" size={20} color={colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <ScrollView
        {...iosScrollViewObserverProps}
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <Text style={[styles.title, { textAlign: dir.textAlign, color: colors.foreground }]}>{commitment.title}</Text>
          <View style={[styles.headerMeta, { flexDirection: dir.row }]}>
            <View style={[styles.pill, { backgroundColor: accent + '18' }]}>
              <Text style={[styles.pillText, { color: accent }]}>{commitment.category}</Text>
            </View>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{kindLabel}</Text>
          </View>
          <View style={[styles.amountRow, { flexDirection: dir.row }]}>
            <View>
              <Text style={[styles.amountLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.forms.commitmentAmountLabel}</Text>
              <Text style={[styles.amountValue, { color: colors.commitment, textAlign: dir.textAlign }]}>
                {formatCurrency(monthlyShare, currency)}
              </Text>
            </View>
            <View>
              <Text style={[styles.amountLabel, { color: colors.mutedForeground, textAlign: dir.isRTL ? 'left' : 'right' }]}>{t.dashboard.dueOn}</Text>
              <Text style={[styles.dueValue, { color: colors.foreground, textAlign: dir.isRTL ? 'left' : 'right' }]}>{commitment.dueDay}</Text>
            </View>
          </View>
        </Card>

        {/* Lender */}
        {lender ? (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/lenders/[id]', params: { id: lender.id } })}
            activeOpacity={0.78}
            style={[styles.lenderCard, { flexDirection: dir.row, backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}
          >
            <LenderAvatar lender={lender} size={38} fontSize={16} borderWidth={0} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.lenderName, { textAlign: dir.textAlign, color: colors.foreground }]} numberOfLines={1}>{lender.name}</Text>
              <Text style={[styles.lenderType, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.typeLabels[lender.type]}</Text>
            </View>
            <Feather name={dir.chevronDetail as any} size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}

        {/* Progress for finite loans */}
        {progress.isFinite ? (
          <>
            <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitments.progressTitle}</Text>
            <Card style={styles.card}>
              <View style={[styles.progressHeader, { flexDirection: dir.row }]}>
                <Text style={[styles.progressPercent, { color: accent }]}>{Math.round(progress.progressPercent)}%</Text>
                <Text style={[styles.progressInstallments, { color: colors.mutedForeground }]}>
                  {t.commitments.installmentsPaid(progress.paidInstallmentCount, progress.installmentCount)}
                </Text>
              </View>
              <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progress.progressPercent}%`,
                      backgroundColor: accent,
                      ...(dir.isRTL ? { right: 0 } : { left: 0 }),
                    },
                  ]}
                />
              </View>
              <View style={[styles.progressBreakdown, { flexDirection: dir.row }]}>
                <View>
                  <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>{t.commitments.paidLabel}</Text>
                  <Text style={[styles.breakdownValue, { color: colors.success, textAlign: dir.textAlign }]}>{formatCurrency(progress.paidAmount, currency)}</Text>
                </View>
                <View>
                  <Text style={[styles.breakdownLabel, { color: colors.mutedForeground, textAlign: dir.isRTL ? 'left' : 'right' }]}>{t.commitments.remainingLabel}</Text>
                  <Text style={[styles.breakdownValue, { color: colors.warning, textAlign: dir.isRTL ? 'left' : 'right' }]}>{formatCurrency(progress.remainingAmount, currency)}</Text>
                </View>
              </View>
              <Text style={[styles.totalLine, { color: colors.mutedForeground, textAlign: dir.textAlign }]}>
                {t.commitments.ofTotal(formatCurrency(progress.totalAmount, currency))}
              </Text>
            </Card>
          </>
        ) : null}

        {/* This month action */}
        <View style={{ marginTop: 14 }}>
          <Button
            title={isPaidThisMonth ? t.commitments.markUnpaid : t.commitments.markPaid}
            onPress={togglePaidThisMonth}
            variant={isPaidThisMonth ? 'outline' : 'primary'}
            fullWidth
          />
        </View>

        {/* Installment schedule (finite) OR payment history (recurring) */}
        {isFinite ? (
          <>
            <View style={[styles.sectionHeader, { flexDirection: dir.row }]}>
              <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground, marginTop: 0, marginBottom: 0, flex: 1 }]}>{t.commitments.scheduleTitle}</Text>
              <TouchableOpacity onPress={toggleSelectMode} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={[styles.sectionAction, { color: colors.primary }]}>
                  {selectMode ? t.commitments.scheduleSelectDone : t.commitments.scheduleSelect}
                </Text>
              </TouchableOpacity>
            </View>
            <Card style={styles.card} padding={0}>
              {schedule.map((row, idx) => {
                const isPaid = row.payment?.status === 'paid';
                // An "override" row is one where the user saved a custom
                // amount without marking the installment as paid. It still
                // counts as unpaid for totals, but the row shows the custom
                // amount + a small badge so it's clear it's not the default.
                const isOverride = !!row.payment && row.payment.status !== 'paid';
                const k = periodKey(row.month, row.year);
                const isSelected = selectedKeys.has(k);
                return (
                  <TouchableOpacity
                    key={`${row.year}-${row.month}-${row.index}`}
                    onPress={() => (selectMode ? toggleRowSelected(row) : openEditor(row))}
                    onLongPress={() => {
                      if (!selectMode) { setSelectMode(true); toggleRowSelected(row); }
                    }}
                    activeOpacity={0.7}
                    style={[
                      styles.scheduleRow,
                      { flexDirection: dir.row, borderBottomColor: colors.border },
                      idx === schedule.length - 1 && { borderBottomWidth: 0 },
                      isSelected && { backgroundColor: colors.primary + '10' },
                    ]}
                  >
                    {selectMode ? (
                      <View style={[
                        styles.checkbox,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}>
                        {isSelected ? <Feather name="check" size={14} color="#fff" /> : null}
                      </View>
                    ) : null}
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: isPaid ? colors.success + '20' : colors.muted, borderColor: isPaid ? colors.success : colors.border },
                    ]}>
                      {isPaid
                        ? <Feather name="check" size={14} color={colors.success} />
                        : <Text style={[styles.statusDotText, { color: colors.mutedForeground }]}>{row.index}</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.scheduleMonth, { textAlign: dir.textAlign, color: colors.foreground }]}>
                        {t.commitments.scheduleInstallment(row.index)} · {String(row.month).padStart(2, '0')}/{row.year}
                      </Text>
                      <Text style={[
                        styles.scheduleStatus,
                        {
                          textAlign: dir.textAlign,
                          color: isPaid ? colors.success : isOverride ? colors.primary : colors.mutedForeground,
                        },
                      ]}>
                        {isPaid
                          ? `${t.commitments.scheduleStatusPaid}${row.payment?.paidDate ? ` · ${formatDate(row.payment.paidDate)}` : ''}`
                          : isOverride
                            ? `${t.commitments.scheduleStatusUnpaid} · ${t.commitments.scheduleStatusOverride}`
                            : t.commitments.scheduleStatusUnpaid}
                      </Text>
                    </View>
                    <Text style={[styles.scheduleAmount, { color: isPaid || isOverride ? colors.foreground : colors.mutedForeground }]}>
                      {formatCurrency(row.payment?.amount ?? monthlyShare, currency)}
                    </Text>
                    {!selectMode ? <Feather name="edit-2" size={14} color={colors.mutedForeground} style={{ opacity: 0.6 }} /> : null}
                  </TouchableOpacity>
                );
              })}
            </Card>
            {selectMode ? (
              <View style={[styles.selectBar, { flexDirection: dir.row }]}>
                <TouchableOpacity onPress={selectAll} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Text style={[styles.selectBarLink, { color: colors.primary }]}>{t.commitments.scheduleSelectAll}</Text>
                </TouchableOpacity>
                {selectedKeys.size > 0 ? (
                  <TouchableOpacity onPress={clearSelection} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={[styles.selectBarLink, { color: colors.mutedForeground }]}>{t.commitments.scheduleSelectClear}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitments.paymentHistory}</Text>
            {history.length === 0 ? (
              <Card style={styles.card}>
                <Text style={[styles.emptyText, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.commitments.noPayments}</Text>
              </Card>
            ) : (
              <Card style={styles.card} padding={0}>
                {history.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => openEditor({ index: idx + 1, month: p.month, year: p.year, payment: p })}
                    activeOpacity={0.7}
                    style={[
                      styles.historyRow,
                      { flexDirection: dir.row, borderBottomColor: colors.border },
                      idx === history.length - 1 && { borderBottomWidth: 0 },
                    ]}
                  >
                    <View style={[styles.historyIcon, { backgroundColor: colors.success + '18' }]}>
                      <Feather name="check" size={14} color={colors.success} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.historyMonth, { textAlign: dir.textAlign, color: colors.foreground }]}>
                        {String(p.month).padStart(2, '0')}/{p.year}
                      </Text>
                      {p.paidDate ? (
                        <Text style={[styles.historyDate, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                          {formatDate(p.paidDate)}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={[styles.historyAmount, { color: colors.foreground }]}>{formatCurrency(p.amount, currency)}</Text>
                    <Feather name="edit-2" size={14} color={colors.mutedForeground} style={{ opacity: 0.6 }} />
                  </TouchableOpacity>
                ))}
              </Card>
            )}
          </>
        )}

        {commitment.notes ? (
          <Card style={[styles.card, { marginTop: 14 }]} padding={14}>
            <Text style={[styles.notesText, { textAlign: dir.textAlign, color: colors.foreground }]}>{commitment.notes}</Text>
          </Card>
        ) : null}
      </ScrollView>

      {/* Floating bulk action bar: shows when select mode is on AND at least
          one row is selected. Sits above the system bottom inset. */}
      {selectMode && selectedKeys.size > 0 ? (
        <View style={[
          styles.bulkBar,
          {
            bottom: 0,
            paddingBottom: bottomPad + 12,
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            flexDirection: dir.row,
          },
        ]}>
          <Text style={[styles.bulkBarCount, { color: colors.foreground, textAlign: dir.textAlign }]}>
            {t.commitments.scheduleSelectedCount(selectedKeys.size)}
          </Text>
          <Button
            title={t.commitments.scheduleBulkMarkUnpaid}
            onPress={bulkMarkUnpaid}
            variant="outline"
          />
          <Button
            title={t.commitments.scheduleBulkUpdate}
            onPress={openBulkEditor}
          />
        </View>
      ) : null}

      {/* Installment editor modal */}
      <Modal visible={!!editing} transparent animationType="fade" onRequestClose={closeEditor}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <TouchableOpacity activeOpacity={1} style={styles.modalBackdropTouch} onPress={closeEditor} />
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: colors.radius }]}>
            <Text style={[styles.modalTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>
              {t.commitments.scheduleEditTitle}
            </Text>
            {editing && !bulkMode ? (
              <Text style={[styles.modalSubtitle, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                {t.commitments.scheduleInstallment(editing.index)} · {String(editing.month).padStart(2, '0')}/{editing.year}
              </Text>
            ) : null}
            {bulkMode ? (
              <>
                <Text style={[styles.modalSubtitle, { textAlign: dir.textAlign, color: colors.foreground, fontFamily: 'Cairo_600SemiBold' }]}>
                  {t.commitments.scheduleBulkTitle(selectedKeys.size)}
                </Text>
                <Text style={[styles.modalSubtitle, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
                  {t.commitments.scheduleBulkHint}
                </Text>
              </>
            ) : null}
            <CurrencyAmountInput
              label={t.commitments.scheduleAmountLabel}
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder={monthlyShare.toString()}
              // The field is pre-filled with the existing installment amount.
              // Without selectTextOnFocus, tapping just lands the cursor at the
              // end and users end up appending digits (e.g. 500 → 5007) instead
              // of replacing — the "can't update paid installment" symptom.
              selectTextOnFocus
              maxLength={16}
            />
            <View style={[styles.modalActions, { flexDirection: dir.row }]}>
              <Button
                title={t.commitments.scheduleCancel}
                onPress={closeEditor}
                variant="outline"
                style={{ flex: 1 }}
              />
              {!bulkMode && editing?.payment?.status === 'paid' ? (
                <Button
                  title={t.commitments.scheduleMarkUnpaid}
                  onPress={() => saveEditor('unpaid')}
                  variant="destructive"
                  style={{ flex: 1 }}
                />
              ) : null}
              {/* "Save amount only" keeps the installment unpaid but persists
                  the custom amount. In bulk mode it may include paid rows and
                  flip them back to unpaid — labelled accordingly so the
                  side-effect is explicit. For paid single rows it's hidden:
                  the "Save" button (action='paid') below already updates the
                  amount in place while keeping paid status. */}
              {bulkMode || editing?.payment?.status !== 'paid' ? (
                <Button
                  title={
                    bulkMode
                      ? `${t.commitments.scheduleSaveAmountOnly} (${t.commitments.scheduleStatusUnpaid})`
                      : t.commitments.scheduleSaveAmountOnly
                  }
                  onPress={() => saveEditor('amount')}
                  variant="outline"
                  style={{ flexBasis: '100%' }}
                />
              ) : null}
              <Button
                title={
                  bulkMode
                    ? t.commitments.scheduleBulkMarkPaid
                    : editing?.payment?.status === 'paid'
                      ? t.commitments.scheduleSave
                      : t.commitments.scheduleMarkPaid
                }
                onPress={() => saveEditor('paid')}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <CommitmentArchiveCelebrationModal
        visible={!!archiveCongratsName}
        kicker={t.commitments.archiveCongratsKicker}
        title={t.commitments.archiveCongratsTitle}
        message={archiveCongratsName ? t.commitments.archiveCongratsMsg(archiveCongratsName) : ''}
        confirmLabel={t.commitments.archiveCongratsAction}
        cancelLabel={t.common.cancel}
        onConfirm={confirmArchiveCongrats}
        onCancel={closeArchiveCongrats}
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  headerCard: { marginBottom: 12 },
  title: { fontSize: 20, fontFamily: 'Cairo_700Bold', marginBottom: 10 },
  headerMeta: { alignItems: 'center', gap: 8, marginBottom: 14 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  pillText: { fontSize: 11, fontFamily: 'Cairo_500Medium' },
  metaText: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  amountRow: { justifyContent: 'space-between', alignItems: 'flex-end' },
  amountLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium', marginBottom: 4 },
  amountValue: { fontSize: 22, fontFamily: 'Cairo_700Bold' },
  dueValue: { fontSize: 22, fontFamily: 'Cairo_700Bold' },
  lenderCard: { alignItems: 'center', padding: 12, borderWidth: 1, gap: 12, marginBottom: 4 },
  lenderName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', marginBottom: 2 },
  lenderType: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  sectionLabel: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeader: { alignItems: 'center', marginTop: 16, marginBottom: 8, gap: 8 },
  sectionAction: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  selectBar: { alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingVertical: 6, gap: 16 },
  selectBarLink: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
  bulkBar: { position: 'absolute', left: 0, right: 0, padding: 12, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 10 },
  bulkBarCount: { fontSize: 13, fontFamily: 'Cairo_600SemiBold', flex: 1 },
  card: { marginBottom: 8 },
  progressHeader: { justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
  progressPercent: { fontSize: 28, fontFamily: 'Cairo_700Bold' },
  progressInstallments: { fontSize: 12, fontFamily: 'Cairo_500Medium' },
  progressBar: { height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 14 },
  progressFill: { position: 'absolute', top: 0, bottom: 0, height: '100%', borderRadius: 5 },
  progressBreakdown: { justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 11, fontFamily: 'Cairo_500Medium', marginBottom: 3 },
  breakdownValue: { fontSize: 15, fontFamily: 'Cairo_700Bold' },
  totalLine: { fontSize: 11, fontFamily: 'Cairo_400Regular' },
  emptyText: { fontSize: 13, fontFamily: 'Cairo_400Regular', paddingVertical: 8 },
  scheduleRow: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  statusDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  statusDotText: { fontSize: 11, fontFamily: 'Cairo_600SemiBold' },
  scheduleMonth: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  scheduleStatus: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  scheduleAmount: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  historyRow: { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  historyIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyMonth: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  historyDate: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  historyAmount: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  notesText: { fontSize: 13, fontFamily: 'Cairo_400Regular', lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalBackdropTouch: { ...StyleSheet.absoluteFillObject },
  modalCard: { padding: 18, borderWidth: 1, gap: 10 },
  modalTitle: { fontSize: 16, fontFamily: 'Cairo_700Bold' },
  modalSubtitle: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  modalActions: { gap: 8, marginTop: 8, flexWrap: 'wrap', rowGap: 8 },
});
