import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, Platform, Share } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { CURRENCIES } from '@/types';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, updateUserProfile, clearAllData, loadSampleData, exportData } = useApp();
  const bottomPad = Platform.OS === 'web' ? 34 : 0;

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
    Alert.alert('تم', 'تم حفظ الإعدادات بنجاح');
  };

  const handleClearData = () => {
    Alert.alert(
      'مسح جميع البيانات',
      'هذا الإجراء سيحذف كل بياناتك بشكل نهائي ولا يمكن التراجع عنه. هل أنت متأكد؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'مسح الكل', style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  };

  const handleLoadSample = () => {
    Alert.alert('تحميل بيانات تجريبية', 'سيتم إضافة بيانات تجريبية لمساعدتك في استكشاف التطبيق. هل تريد المتابعة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'تحميل',
        onPress: async () => {
          await loadSampleData();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('تم', 'تم تحميل البيانات التجريبية بنجاح');
        },
      },
    ]);
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

  const SettingRow = ({ icon, label, children }: { icon: string; label: string; children: React.ReactNode }) => (
    <View style={styles.settingRow}>
      <Feather name={icon as any} size={16} color={colors.primary} style={{ marginLeft: 10 }} />
      <Text style={[styles.settingLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {children}
    </View>
  );

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + bottomPad + 90 }]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Profile Section */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الملف الشخصي</Text>
      <Card style={styles.card}>
        <Input
          label="الاسم"
          value={name}
          onChangeText={setName}
          placeholder="أدخل اسمك"
        />
        <Select
          label="العملة المفضلة"
          value={currency}
          options={CURRENCIES}
          onValueChange={setCurrency}
        />
        <Input
          label="الراتب الشهري"
          value={salary}
          onChangeText={setSalary}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="هدف الادخار الشهري (اختياري)"
          value={savingGoal}
          onChangeText={setSavingGoal}
          placeholder="0.00"
          keyboardType="decimal-pad"
        />
        <Input
          label="يوم بدء الشهر المالي"
          value={monthStartDay}
          onChangeText={setMonthStartDay}
          placeholder="1"
          keyboardType="number-pad"
        />
        <Button title={saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'} onPress={handleSave} fullWidth loading={saving} />
      </Card>

      {/* Data Management */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>إدارة البيانات</Text>
      <Card style={styles.card} padding={0}>
        <View>
          {[
            {
              icon: 'database', label: 'تحميل بيانات تجريبية', color: colors.primary,
              onPress: handleLoadSample, sub: 'أضف بيانات نموذجية للتجربة',
            },
            {
              icon: 'upload', label: 'تصدير نسخة احتياطية', color: colors.commitment,
              onPress: handleExport, sub: 'احفظ بياناتك خارجياً',
            },
            {
              icon: 'trash-2', label: 'مسح جميع البيانات', color: colors.danger,
              onPress: handleClearData, sub: 'حذف كل البيانات نهائياً',
            },
          ].map((item, i, arr) => (
            <View key={item.label}>
              <View style={[styles.dataRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1, paddingLeft: 16 }}>
                  <Text style={[styles.dataLabel, { color: item.color }]}>{item.label}</Text>
                  <Text style={[styles.dataSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
                </View>
                <Button
                  title={i === 2 ? 'مسح' : 'تنفيذ'}
                  onPress={item.onPress}
                  variant={i === 2 ? 'destructive' : 'outline'}
                  style={{ paddingHorizontal: 14, paddingVertical: 8, minHeight: 36, marginRight: 16 }}
                />
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* About */}
      <Card style={[styles.card, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '25' }]}>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutText, { color: colors.mutedForeground }]}>مالي - إدارة الميزانية الشخصية</Text>
          <Text style={[styles.aboutVersion, { color: colors.mutedForeground }]}>الإصدار 1.0.0</Text>
        </View>
        <Text style={[styles.aboutSub, { color: colors.mutedForeground }]}>
          تطبيق محلي بالكامل - بياناتك محفوظة على جهازك فقط
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16 },
  sectionTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold', textAlign: 'right', marginBottom: 10, marginTop: 6 },
  card: { marginBottom: 20 },
  settingRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  settingLabel: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  dataRow: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  dataLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', textAlign: 'right', marginBottom: 2 },
  dataSub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'right' },
  aboutRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  aboutText: { fontSize: 13, fontFamily: 'Inter_500Medium', textAlign: 'right' },
  aboutVersion: { fontSize: 12, fontFamily: 'Inter_400Regular' },
  aboutSub: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'right' },
});
