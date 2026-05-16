import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { CURRENCIES } from '@/types';

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saveUserProfile, loadSampleData } = useApp();

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [salary, setSalary] = useState('');
  const [savingGoal, setSavingGoal] = useState('');
  const [monthStartDay, setMonthStartDay] = useState('1');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');

  const topPad = Platform.OS === 'web' ? 24 : insets.top + 8;
  const bottomPad = Platform.OS === 'web' ? 24 : insets.bottom + 8;

  const handleFinish = async (withSample: boolean) => {
    if (!name.trim()) {
      setNameError('الرجاء إدخال اسمك أولاً');
      return;
    }
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveUserProfile({
      name: name.trim(),
      preferredCurrency: currency,
      monthlySalary: parseFloat(salary) || 0,
      monthlySavingGoal: parseFloat(savingGoal) || 0,
      financialMonthStartDay: parseInt(monthStartDay) || 1,
      isDarkMode: false,
    });
    if (withSample) await loadSampleData();
    setLoading(false);
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad, paddingBottom: bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15', borderRadius: 40 }]}>
          <Feather name="dollar-sign" size={40} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>مرحباً في مالي</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          أدخل بياناتك لبدء تتبع ميزانيتك الشخصية
        </Text>

        {/* Form */}
        <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formSection, { color: colors.mutedForeground }]}>المعلومات الأساسية</Text>

          <Input
            label="اسمك الكريم *"
            value={name}
            onChangeText={(v) => { setName(v); setNameError(''); }}
            placeholder="أدخل اسمك"
            error={nameError}
            autoFocus
          />

          <Select
            label="العملة المفضلة"
            value={currency}
            options={CURRENCIES}
            onValueChange={setCurrency}
          />

          <Input
            label="الراتب الشهري (اختياري)"
            value={salary}
            onChangeText={setSalary}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={[styles.formSection, { color: colors.mutedForeground, marginTop: 8 }]}>إعدادات إضافية</Text>

          <Input
            label="هدف الادخار الشهري (اختياري)"
            value={savingGoal}
            onChangeText={setSavingGoal}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Input
            label="يوم بدء الشهر المالي (1-28)"
            value={monthStartDay}
            onChangeText={setMonthStartDay}
            placeholder="1"
            keyboardType="number-pad"
          />
        </View>

        {/* Sample data notice */}
        <View style={[styles.infoBox, { backgroundColor: colors.primary + '0D', borderColor: colors.primary + '25' }]}>
          <Feather name="info" size={16} color={colors.primary} style={{ marginLeft: 8 }} />
          <Text style={[styles.infoText, { color: colors.foreground }]}>
            يمكنك تحميل بيانات تجريبية لاستكشاف التطبيق بسرعة، أو البدء بقائمة فارغة.
          </Text>
        </View>

        {/* Actions */}
        <Button
          title={loading ? 'جاري الإعداد...' : 'ابدأ مع بيانات تجريبية'}
          onPress={() => handleFinish(true)}
          fullWidth
          loading={loading}
          style={{ marginBottom: 10 }}
        />
        <Button
          title="ابدأ بقائمة فارغة"
          onPress={() => handleFinish(false)}
          variant="outline"
          fullWidth
          disabled={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20 },
  iconWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16, marginTop: 16 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  form: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  formSection: { fontSize: 11, fontFamily: 'Inter_600SemiBold', textAlign: 'right', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoBox: { flexDirection: 'row-reverse', alignItems: 'flex-start', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 21, fontFamily: 'Inter_400Regular', textAlign: 'right' },
});
