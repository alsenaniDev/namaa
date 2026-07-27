import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, Platform, Share, TouchableOpacity, TextInput, Switch } from 'react-native';
import { requestPermissions } from '@/utils/notifications';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { CURRENCIES, INCOME_TYPES, COMMITMENT_CATEGORIES, EXPENSE_CATEGORIES } from '@/types';
import type { CustomTypes } from '@/utils/storage';

type TypeCategory = keyof CustomTypes;

const DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => {
  const value = String(i + 1);
  return { label: value, value };
});

function TypeManager({ title, category, builtins }: { title: string; category: TypeCategory; builtins: string[] }) {
  const colors = useColors();
  const dir = useDir();
  const t = useT();
  const { customTypes, addCustomType, removeCustomType } = useApp();
  const [input, setInput] = useState('');
  const items = customTypes[category];

  const handleAdd = async () => {
    const val = input.trim();
    if (!val) return;
    if (builtins.includes(val) || items.includes(val)) { Alert.alert(t.settings.alreadyExistsTitle, t.settings.alreadyExistsMsg); return; }
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
      <Text style={[styles.typeTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{title}</Text>
      <View style={[styles.chipRow, { flexDirection: dir.row }]}>
        {builtins.map((t) => (
          <View key={t} style={[styles.chip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>{t}</Text>
          </View>
        ))}
      </View>
      {items.map((item) => (
        <View key={item} style={[styles.customItem, { flexDirection: dir.row, backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <TouchableOpacity onPress={() => handleRemove(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x" size={16} color={colors.danger} />
          </TouchableOpacity>
          <Text style={[styles.customItemText, { textAlign: dir.textAlign, color: colors.primary }]}>{item}</Text>
          <View style={[styles.customDot, { backgroundColor: colors.primary }]} />
        </View>
      ))}
      <View style={[styles.addRow, { flexDirection: dir.row, borderColor: colors.border, backgroundColor: colors.card }]}>
        <TouchableOpacity onPress={handleAdd} style={[styles.addBtn, { backgroundColor: input.trim() ? colors.primary : colors.muted }]} disabled={!input.trim()} activeOpacity={0.8}>
          <Feather name="plus" size={17} color={input.trim() ? '#fff' : colors.mutedForeground} />
        </TouchableOpacity>
        <TextInput
          value={input} onChangeText={setInput} placeholder={t.settings.addCustomPlaceholder}
          placeholderTextColor={colors.mutedForeground}
          style={[styles.addInput, { color: colors.foreground }]}
          onSubmitEditing={handleAdd} returnKeyType="done" textAlign={dir.textAlign}
        />
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const { userProfile, updateUserProfile, clearAllData, loadSampleData, exportData, importData } = useApp();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const [name, setName] = useState(userProfile?.name ?? '');
  const [currency, setCurrency] = useState(userProfile?.preferredCurrency ?? 'SAR');
  const [salary, setSalary] = useState(userProfile?.monthlySalary?.toString() ?? '');
  const [savingGoal, setSavingGoal] = useState(userProfile?.monthlySavingGoal?.toString() ?? '');
  const [monthStartDay, setMonthStartDay] = useState(userProfile?.financialMonthStartDay?.toString() ?? '1');
  const [saving, setSaving] = useState(false);
  const notificationsEnabled = !!userProfile?.notificationsEnabled;

  const handleToggleNotifications = async (next: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert(t.settings.notificationsWebTitle, t.settings.notificationsWebMsg);
      return;
    }
    if (next) {
      const granted = await requestPermissions();
      if (!granted) {
        Alert.alert(t.settings.notificationsDeniedTitle, t.settings.notificationsDeniedMsg);
        return;
      }
    }
    await updateUserProfile({ notificationsEnabled: next });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert(t.common.errorTitle, t.settings.saveErrorMsg); return; }
    setSaving(true);
    await updateUserProfile({
      name: name.trim(),
      preferredCurrency: currency,
      monthlySalary: parseFloat(salary) || 0,
      monthlySavingGoal: parseFloat(savingGoal) || 0,
      financialMonthStartDay: Math.max(1, Math.min(31, parseInt(monthStartDay, 10) || 1)),
    });
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t.common.saved, t.common.savedMsg);
  };

  const handleExport = async () => {
    try {
      const data = await exportData();
      if (Platform.OS === 'web') {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `mali_backup_${new Date().toISOString().split('T')[0]}.json`; a.click(); URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: data, title: t.settings.exportShare });
      }
    } catch { Alert.alert(t.common.errorTitle, t.settings.exportError); }
  };

  const doImport = async (json: string) => {
    try {
      await importData(json);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t.common.done, t.settings.importSuccess);
    } catch {
      Alert.alert(t.common.errorTitle, t.settings.importError);
    }
  };

  const pickAndImportNative = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
      if (res.canceled || !res.assets?.[0]?.uri) return;
      const uri = res.assets[0].uri;
      const response = await fetch(uri);
      const json = await response.text();
      Alert.alert(t.settings.importConfirmTitle, t.settings.importConfirmMsg, [
        { text: t.common.cancel, style: 'cancel' },
        { text: t.settings.importConfirmBtn, style: 'destructive', onPress: () => doImport(json) },
      ]);
    } catch {
      Alert.alert(t.common.errorTitle, t.settings.importError);
    }
  };

  const pickAndImportWeb = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.onchange = async (ev: Event) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const json = await file.text();
      if (confirm(t.settings.importConfirmMsg)) {
        await doImport(json);
      }
    };
    input.click();
  };

  const handleImport = () => {
    if (Platform.OS === 'web') pickAndImportWeb();
    else pickAndImportNative();
  };

  const handleLoadSample = () => {
    Alert.alert(t.settings.sampleConfirmTitle, t.settings.sampleConfirmMsg, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.settings.sampleLoadBtn, onPress: async () => { await loadSampleData(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert(t.common.done, t.settings.sampleLoadedMsg); } },
    ]);
  };

  const handleClearData = () => {
    Alert.alert(t.settings.clearConfirmTitle, t.settings.clearConfirmMsg, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.settings.clearConfirmBtn,
        style: 'destructive',
        onPress: async () => {
          await clearAllData();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          router.replace('/setup');
        },
      },
    ]);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 32 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.settings.profileSection}</Text>
      <Card style={styles.card}>
        <Input label={t.settings.nameLabel} value={name} onChangeText={setName} placeholder="" />
        <Select label={t.settings.currencyLabel} value={currency} options={CURRENCIES} onValueChange={setCurrency} />
        <Input label={t.settings.salaryLabel} value={salary} onChangeText={setSalary} placeholder="0.00" keyboardType="decimal-pad" />
        <Input label={t.settings.savingGoalLabel} value={savingGoal} onChangeText={setSavingGoal} placeholder="0.00" keyboardType="decimal-pad" />
        <Select label={t.settings.monthStartLabel} value={monthStartDay} options={DAY_OPTIONS} onValueChange={setMonthStartDay} />

        <Button title={saving ? t.common.saving : t.common.saveChanges} onPress={handleSave} fullWidth loading={saving} />

        <View style={[styles.toggleRow, { flexDirection: dir.row, borderTopColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.settings.notificationsLabel}</Text>
            <Text style={[styles.toggleHint, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.settings.notificationsHint}</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: colors.muted, true: colors.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.settings.categoriesSection}</Text>
      <Card style={styles.card} padding={14}>
        <TypeManager title={t.settings.incomeTypesTitle} category="incomeTypes" builtins={[...INCOME_TYPES]} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TypeManager title={t.settings.commitmentCatsTitle} category="commitmentCategories" builtins={[...COMMITMENT_CATEGORIES]} />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <TypeManager title={t.settings.expenseCatsTitle} category="expenseCategories" builtins={[...EXPENSE_CATEGORIES]} />
      </Card>

      <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.settings.planningSection}</Text>
      {[
        { route: '/goals', icon: 'target', title: t.settings.goalsTitle, sub: t.settings.goalsDesc },
        { route: '/budgets', icon: 'pie-chart', title: t.settings.budgetsTitle, sub: t.settings.budgetsDesc },
        { route: '/financial-challenges', icon: 'flag', title: t.settings.challengesTitle, sub: t.settings.challengesDesc },
        { route: '/achievements', icon: 'award', title: t.settings.achievementsTitle, sub: t.settings.achievementsDesc },
        { route: '/subscriptions', icon: 'repeat', title: t.settings.subscriptionsTitle, sub: t.settings.subscriptionsDesc },
      ].map((nav) => (
        <TouchableOpacity
          key={nav.route}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(nav.route as any); }}
          activeOpacity={0.8}
          style={[styles.dataCard, { flexDirection: dir.row, backgroundColor: colors.primary + '0E', borderColor: colors.primary + '35' }]}
        >
          <View style={[styles.dataIconCircle, { backgroundColor: colors.primary }]}>
            <Feather name={nav.icon as any} size={22} color="#fff" />
          </View>
          <View style={styles.dataCardText}>
            <Text style={[styles.dataCardTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{nav.title}</Text>
            <Text style={[styles.dataCardSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{nav.sub}</Text>
          </View>
          <Feather name={dir.chevronDetail as any} size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      ))}

      <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground, marginTop: 14 }]}>{t.settings.lendersSection}</Text>
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/lenders'); }}
        activeOpacity={0.8}
        style={[styles.dataCard, { flexDirection: dir.row, backgroundColor: colors.primary + '0E', borderColor: colors.primary + '35', marginBottom: 24 }]}
      >
        <View style={[styles.dataIconCircle, { backgroundColor: colors.primary }]}>
          <Feather name="briefcase" size={22} color="#fff" />
        </View>
        <View style={styles.dataCardText}>
          <Text style={[styles.dataCardTitle, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.settings.lendersSection}</Text>
          <Text style={[styles.dataCardSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.settings.lendersDesc}</Text>
        </View>
        <Feather name={dir.chevronDetail as any} size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Text style={[styles.sectionLabel, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.settings.dataSection}</Text>

      {[
        { onPress: handleLoadSample, bg: colors.primary + '0E', border: colors.primary + '35', icon: 'database', ic: colors.primary, title: t.settings.sampleTitle, sub: t.settings.sampleDesc, titleColor: colors.foreground },
        { onPress: handleExport, bg: colors.success + '0E', border: colors.success + '35', icon: 'share-2', ic: colors.success, title: t.settings.exportTitle, sub: t.settings.exportDesc, titleColor: colors.foreground },
        { onPress: handleImport, bg: colors.primary + '0E', border: colors.primary + '35', icon: 'download', ic: colors.primary, title: t.settings.importTitle, sub: t.settings.importDesc, titleColor: colors.foreground },
        { onPress: handleClearData, bg: colors.danger + '0E', border: colors.danger + '35', icon: 'trash-2', ic: colors.danger, title: t.settings.clearTitle, sub: t.settings.clearDesc, titleColor: colors.danger },
      ].map((card) => (
        <TouchableOpacity key={card.title} onPress={card.onPress} activeOpacity={0.8} style={[styles.dataCard, { flexDirection: dir.row, backgroundColor: card.bg, borderColor: card.border }]}>
          <View style={[styles.dataIconCircle, { backgroundColor: card.ic }]}>
            <Feather name={card.icon as any} size={22} color="#fff" />
          </View>
          <View style={styles.dataCardText}>
            <Text style={[styles.dataCardTitle, { textAlign: dir.textAlign, color: card.titleColor }]}>{card.title}</Text>
            <Text style={[styles.dataCardSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{card.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}

      <View style={[styles.creditBox, { flexDirection: dir.row, borderColor: colors.border }]}>
        <Feather name="code" size={14} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.creditName, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.settings.creditDev}</Text>
          <Text style={[styles.creditSub, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.settings.creditSub}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionLabel: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: { marginBottom: 24 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  typeManager: { marginBottom: 4 },
  typeTitle: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 10 },
  chipRow: { flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: 'Cairo_400Regular' },
  customItem: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 8 },
  customItemText: { flex: 1, fontSize: 13, fontFamily: 'Cairo_500Medium' },
  customDot: { width: 6, height: 6, borderRadius: 3 },
  addRow: { alignItems: 'center', borderWidth: 1.5, borderRadius: 10, overflow: 'hidden', height: 46 },
  addInput: { flex: 1, paddingHorizontal: 12, fontSize: 14, fontFamily: 'Cairo_400Regular', height: '100%' },
  addBtn: { width: 46, height: '100%', alignItems: 'center', justifyContent: 'center' },
  dataCard: { alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1.5, marginBottom: 10, gap: 14 },
  dataIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  dataCardText: { flex: 1 },
  dataCardTitle: { fontSize: 15, fontFamily: 'Cairo_600SemiBold', marginBottom: 3 },
  dataCardSub: { fontSize: 12, fontFamily: 'Cairo_400Regular', lineHeight: 18 },
  creditBox: { alignItems: 'center', paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, gap: 10 },
  creditName: { fontSize: 13, fontFamily: 'Cairo_600SemiBold' },
  creditSub: { fontSize: 11, fontFamily: 'Cairo_400Regular', marginTop: 2 },
  toggleRow: { alignItems: 'center', gap: 12, paddingTop: 14, marginTop: 14, borderTopWidth: StyleSheet.hairlineWidth },
  toggleLabel: { fontSize: 14, fontFamily: 'Cairo_600SemiBold', marginBottom: 2 },
  toggleHint: { fontSize: 11, fontFamily: 'Cairo_400Regular', lineHeight: 16 },
});
