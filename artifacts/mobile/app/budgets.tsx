import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import { BudgetRow } from '@/components/BudgetRow';
import { EXPENSE_CATEGORIES } from '@/types';
import { getBudgetUsages } from '@/utils/calculations';
import { getCurrentMonthYear, toAsciiDigits } from '@/utils/format';
import { validateAmount } from '@/utils/validation';

export default function BudgetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const t = useT();
  const dir = useDir();
  const { budgets, expenses, customTypes, userProfile, upsertBudget, deleteBudget } = useApp();
  const currency = userProfile?.preferredCurrency ?? 'SAR';
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const { month, year } = getCurrentMonthYear();

  // Categories available for NEW budgets = built-ins + custom, minus those that
  // already have a budget. Editing an existing budget happens via tap-on-row.
  const allCategories = useMemo(
    () => [...EXPENSE_CATEGORIES, ...customTypes.expenseCategories],
    [customTypes.expenseCategories],
  );
  const taken = useMemo(() => new Set(budgets.map((b) => b.category)), [budgets]);
  const available = allCategories.filter((c) => !taken.has(c));

  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [pickedCategory, setPickedCategory] = useState(available[0] ?? '');
  const [limit, setLimit] = useState('');
  const [errLimit, setErrLimit] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const usages = getBudgetUsages(budgets, expenses, month, year);

  const beginEdit = (category: string, currentLimit: number) => {
    setEditingCategory(category);
    setPickedCategory(category);
    setLimit(currentLimit.toString());
    setErrLimit(undefined);
  };

  const resetForm = () => {
    setEditingCategory(null);
    setPickedCategory(available[0] ?? '');
    setLimit('');
    setErrLimit(undefined);
  };

  const handleSave = async () => {
    const cat = editingCategory ?? pickedCategory;
    if (!cat) return;
    const err = validateAmount(limit, t);
    setErrLimit(err);
    if (err) return;
    setSaving(true);
    await upsertBudget(cat, parseFloat(toAsciiDigits(limit)));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(false);
    resetForm();
  };

  const handleDelete = (id: string, category: string) => {
    Alert.alert(t.budgets.deleteTitle, t.budgets.deleteMsg(category), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteBudget(id);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          if (editingCategory === category) resetForm();
        },
      },
    ]);
  };

  const canSave =
    !!(editingCategory ?? pickedCategory) &&
    !!limit.trim();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Card padding={14} style={[styles.hint, { backgroundColor: colors.primary + '0E', borderColor: colors.primary + '35' }]}>
        <View style={[styles.hintRow, { flexDirection: dir.row }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <Text style={[styles.hintText, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.budgets.hintCard}</Text>
        </View>
      </Card>

      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>
        {editingCategory ? editingCategory : t.budgets.addCategory}
      </Text>
      <Card padding={14} style={{ marginBottom: 20 }}>
        {editingCategory ? (
          <Text style={[styles.editingCat, { textAlign: dir.textAlign, color: colors.foreground }]}>{editingCategory}</Text>
        ) : available.length > 0 ? (
          <Select
            label={t.budgets.pickCategory}
            value={pickedCategory}
            options={available.map((c) => ({ label: c, value: c }))}
            onValueChange={setPickedCategory}
          />
        ) : (
          <Text style={[styles.allSet, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.budgets.allCategoriesSet}</Text>
        )}
        {(editingCategory || available.length > 0) ? (
          <>
            <Input
              label={t.budgets.monthlyLimit}
              value={limit}
              onChangeText={(v) => { setLimit(v); setErrLimit(undefined); }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              error={errLimit}
            />
            <View style={[styles.btnRow, { flexDirection: dir.row }]}>
              {editingCategory ? (
                <Button title={t.common.cancel} onPress={resetForm} variant="outline" style={{ flex: 1 }} />
              ) : null}
              <Button title={saving ? t.common.saving : t.budgets.saveBtn} onPress={handleSave} loading={saving} disabled={!canSave} style={{ flex: 1 }} />
            </View>
          </>
        ) : null}
      </Card>

      <Text style={[styles.sectionTitle, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.budgets.title}</Text>
      {usages.length === 0 ? (
        <EmptyState icon="pie-chart" title={t.budgets.emptyTitle} description={t.budgets.emptyDesc} />
      ) : (
        usages.map((u) => {
          const b = budgets.find((x) => x.category === u.category)!;
          return (
            <BudgetRow
              key={b.id}
              usage={u}
              currency={currency}
              onEdit={() => beginEdit(u.category, u.limit)}
              onDelete={() => handleDelete(b.id, u.category)}
            />
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
  hint: { borderWidth: 1, marginBottom: 16 },
  hintRow: { alignItems: 'center', gap: 10 },
  hintText: { flex: 1, fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  sectionTitle: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  editingCat: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', marginBottom: 12 },
  allSet: { fontSize: 13, fontFamily: 'Cairo_400Regular', marginBottom: 6 },
  btnRow: { gap: 8, marginTop: 4 },
  empty: { fontSize: 13, fontFamily: 'Cairo_400Regular' },
});
