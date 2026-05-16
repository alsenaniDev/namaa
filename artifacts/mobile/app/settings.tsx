import React, { useState } from 'react';
import {
  ScrollView, View, Text, StyleSheet, Alert, Platform, Share, TouchableOpacity, TextInput,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { CURRENCIES, INCOME_TYPES, COMMITMENT_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import type { CustomTypes } from '@/utils/storage';

type TypeCategory = keyof CustomTypes;

function TypeManager({ title, category, builtins }: { title: string; category: TypeCategory; builtins: string[] }) {
  const colors = useColors();
  const { customTypes, addCustomType, removeCustomType } = useApp();
  const [input, setInput] = useState('');
  const items = customTypes[category];

  const handleAdd = async () => {
    const val = input.trim();
    if (!val) return;
    if (builtins.includes(val) || items.includes(val)) {
      Alert.alert('موجود مسبقاً', 'هذا النوع مضاف بالفعل');
      return;
    }
    await addCustomType(category, val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInput('');
  };

  const handleRemove = async (val: string) => {
    await removeCustomType(category, val);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View style={styles.typeManager}>
      <Text style={[styles.typeTitle, { color: colors.foreground }]}>{title}</Text>

      {/* Built-in chips */}
      <View style={styles.chipRow}>
        {builtins.map((t) => (
          <View key={t} style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{t}</Text>
          </View>
        ))}
      </View>

      {/* Custom items */}
      {items.map((t) => (
        <View key={t} style={[styles.customItem, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <TouchableOpacity onPress={() => handleRemove(t)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.danger} />
          </TouchableOpacity>
          <Text style={[styles.customItemText, { color: colors.primary }]}>{t}</Text>
          <View style={[styles.customDot, { backgroundColor: colors.primary }]} />
        </View>
      ))}

      {/* Add row */}
      <View style={[styles.addRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity
          onPress={handleAdd}
          style={[styles.addBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]}
          disabled={!input.trim()}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={17} color={input.trim() ? '#fff' : colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="أضف نوعاً مخصصاً..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.addInput, { color: colors.foreground }]}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          textAlign="right"
        />
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, updateUserProfile, clearAllData, loadSampleData, exportData } = useApp();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [name, setName] = useState(userProfile?.name ?? '');
  const [currency, setCurrency] = useState(userProfile?.preferredCurrency ?? 'SAR');
  const [salary, setSalary] = useState(userProfile?.monthlySalary?.toString() ?? '');
  const [savingGoal, setSavingGoal] = useState(userProfile?.monthlySavingGoal?.toString() ?? '');
  const [monthStartDay, setMonthStartDay] = useState(userProfile?.financialMonthStartDay?.toString() ?? '1');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('خطأ', 'الرجاء إدخال الاسم'); return; }
    setSaving(true);
    await updateUserProfile({
      name: name.trim(),
      preferredCurrency: currency,
      monthlySalary: parseFloat(salary) || 0,
      monthlySavingGoal: parseFloat(savingGoal) || 0,
      financialMonthStartDay: parseInt(monthStartDay) || 1,
    });
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('تم الحفظ', 'تم تحديث إعداداتك بنجاح');
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      if (Platform.OS === 'web') {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mali_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: data, title: 'نسخة احتياطية - مالي' });
      }
    } catch {
      Alert.alert('خطأ', 'تعذّر تصدير البيانات');
    }
  };

  const handleLoadSample = () => {
    Alert.alert('بيانات تجريبية', 'سيتم إضافة بيانات نموذجية للتجربة. هل تريد المتابعة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تحميل',
        onPress: async () => {
          await loadSampleData();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('تم', 'تم تحميل البيانات التجريبية');
        },
      },
    ]);
  };

  const handleClearData = () => {
    Alert.alert('تحذير نهائي', 'سيتم حذف جميع بياناتك نهائياً ولا يمكن استرجاعها. هل أنت متأكد تماماً؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'نعم، احذف كل شيء', style: 'destructive',
        onPress: async () => {
          await clearAllData();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Profile ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>الملف الشخصي</Text>
      <Card style={styles.card}>
        <Input label="الاسم" value={name} onChangeText={setName} placeholder="أدخل اسمك" />
        <Select label="العملة المفضلة" value={currency} options={CURRENCIES} onValueChange={setCurrency} />
        <Input label="الراتب الشهري" value={salary} onChangeText={setSalary} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="هدف الادخار الشهري (اختياري)" value={savingGoal} onChangeText={setSavingGoal} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label="يوم بدء الشهر المالي (1-28)" value={monthStartDay} onChangeText={setMonthStartDay} placeholder="1" keyboardType="number-pad" />
        <Button title={saving ? 'جاري الحفظ...' : 'حفظ التغييرات'} onPress={handleSave} fullWidth loading={saving} />
      </Card>

      {/* ── Custom Categories ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>إدارة التصنيفات</Text>
      <Card style={styles.card} padding={14}>
        <TypeManager title="أنواع الدخل" category="incomeTypes" builtins={[...INCOME_TYPES]} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TypeManager title="فئات الالتزامات" category="commitmentCategories" builtins={[...COMMITMENT_CATEGORIES]} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TypeManager title="فئات المصاريف" category="expenseCategories" builtins={[...EXPENSE_CATEGORIES]} />
      </Card>

      {/* ── Data Management ── */}
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>إدارة البيانات</Text>

      {/* Sample Data */}
      <TouchableOpacity
        onPress={handleLoadSample}
        activeOpacity={0.8}
        style={[styles.dataCard, { backgroundColor: colors.primary + '0E', borderColor: colors.primary + '35' }]}
      >
        <View style={[styles.dataIconCircle, { backgroundColor: colors.primary }]}>
          <Feather name="database" size={22} color="#fff" />
        </View>
        <View style={styles.dataCardText}>
          <Text style={[styles.dataCardTitle, { color: colors.foreground }]}>بيانات تجريبية</Text>
          <Text style={[styles.dataCardSub, { color: colors.mutedForeground }]}>
            أضف بيانات نموذجية لاستكشاف ميزات التطبيق
          </Text>
        </View>
      </TouchableOpacity>

      {/* Export */}
      <TouchableOpacity
        onPress={handleExport}
        activeOpacity={0.8}
        style={[styles.dataCard, { backgroundColor: colors.success + '0E', borderColor: colors.success + '35' }]}
      >
        <View style={[styles.dataIconCircle, { backgroundColor: colors.success }]}>
          <Feather name="share-2" size={22} color="#fff" />
        </View>
        <View style={styles.dataCardText}>
          <Text style={[styles.dataCardTitle, { color: colors.foreground }]}>تصدير البيانات</Text>
          <Text style={[styles.dataCardSub, { color: colors.mutedForeground }]}>
            احفظ نسخة احتياطية من جميع بياناتك
          </Text>
        </View>
      </TouchableOpacity>

      {/* Clear */}
      <TouchableOpacity
        onPress={handleClearData}
        activeOpacity={0.8}
        style={[styles.dataCard, { backgroundColor: colors.danger + '0E', borderColor: colors.danger + '35' }]}
      >
        <View style={[styles.dataIconCircle, { backgroundColor: colors.danger }]}>
          <Feather name="trash-2" size={22} color="#fff" />
        </View>
        <View style={styles.dataCardText}>
          <Text style={[styles.dataCardTitle, { color: colors.danger }]}>مسح جميع البيانات</Text>
          <Text style={[styles.dataCardSub, { color: colors.mutedForeground }]}>
            حذف نهائي لا يمكن التراجع عنه
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Credit ── */}
      <View style={[styles.creditBox, { borderColor: colors.border }]}>
        <Feather name="code" size={14} color={colors.primary} style={{ marginLeft: 8 }} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.creditName, { color: colors.foreground }]}>تطوير: Mohammed Alsenani</Text>
          <Text style={[styles.creditSub, { color: colors.mutedForeground }]}>
            مالي v1.0 — بياناتك محفوظة على جهازك فقط
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: { marginBottom: 24 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },

  // TypeManager
  typeManager: { marginBottom: 4 },
  typeTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', textAlign: 'right', marginBottom: 10 },
  chipRow: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  customItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    gap: 8,
  },
  customItemText: { flex: 1, fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  customDot: { width: 6, height: 6, borderRadius: 3 },
  addRow: { flexDirection: 'row-reverse', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, overflow: 'hidden', height: 46 },
  addInput: { flex: 1, paddingHorizontal: 12, fontSize: 14, fontFamily: 'Inter_400Regular', height: '100%' },
  addBtn: { width: 46, height: '100%', alignItems: 'center', justifyContent: 'center' },

  // Data Management cards
  dataCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 14,
  },
  dataIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dataCardText: { flex: 1 },
  dataCardTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'right', marginBottom: 3 },
  dataCardSub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'right', lineHeight: 18 },

  // Credit
  creditBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 14,
    gap: 10,
  },
  creditName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textAlign: 'right' },
  creditSub: { fontSize: 11, fontFamily: 'Inter_400Regular', textAlign: 'right', marginTop: 2 },
});
