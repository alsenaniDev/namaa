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

const TOTAL_STEPS = 4;

export default function SetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { saveUserProfile, loadSampleData } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('SAR');
  const [salary, setSalary] = useState('');
  const [savingGoal, setSavingGoal] = useState('');
  const [monthStartDay, setMonthStartDay] = useState('1');
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const goNext = () => {
    if (step === 0 && !name.trim()) {
      setNameError('الرجاء إدخال اسمك');
      return;
    }
    setNameError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));
  };

  const goBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFinish = async (withSample: boolean) => {
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

  const steps = [
    {
      icon: 'user',
      title: 'مرحباً بك في مالي',
      subtitle: 'تطبيقك الشخصي لإدارة الميزانية الشهرية',
      content: (
        <>
          <Text style={[styles.fieldTitle, { color: colors.foreground }]}>ما اسمك؟</Text>
          <Input
            value={name}
            onChangeText={(v) => { setName(v); setNameError(''); }}
            placeholder="أدخل اسمك الكريم"
            error={nameError}
            autoFocus
          />
        </>
      ),
    },
    {
      icon: 'dollar-sign',
      title: 'بياناتك المالية',
      subtitle: 'أدخل معلوماتك المالية الأساسية',
      content: (
        <>
          <Select
            label="العملة المفضلة"
            value={currency}
            options={CURRENCIES}
            onValueChange={setCurrency}
          />
          <Input
            label="الراتب الشهري الأساسي"
            value={salary}
            onChangeText={setSalary}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />
        </>
      ),
    },
    {
      icon: 'target',
      title: 'تفضيلات الادخار',
      subtitle: 'حدد أهدافك المالية (اختياري)',
      content: (
        <>
          <Input
            label="هدف الادخار الشهري"
            value={savingGoal}
            onChangeText={setSavingGoal}
            placeholder="0.00 (اختياري)"
            keyboardType="decimal-pad"
          />
          <Input
            label="يوم بدء الشهر المالي"
            value={monthStartDay}
            onChangeText={setMonthStartDay}
            placeholder="1"
            keyboardType="number-pad"
          />
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            يوم بدء الشهر المالي هو اليوم الذي يبدأ فيه حساب ميزانيتك الشهرية
          </Text>
        </>
      ),
    },
    {
      icon: 'check-circle',
      title: 'كل شيء جاهز!',
      subtitle: 'هل تريد إضافة بيانات تجريبية للبدء؟',
      content: (
        <>
          <View style={[styles.finishCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Feather name="info" size={20} color={colors.primary} />
            <Text style={[styles.finishText, { color: colors.foreground }]}>
              البيانات التجريبية ستساعدك على استكشاف التطبيق بسرعة وفهم كيفية عمله
            </Text>
          </View>
          <Button
            title={loading ? 'جاري الإعداد...' : 'ابدأ بالبيانات التجريبية'}
            onPress={() => handleFinish(true)}
            loading={loading}
            fullWidth
            style={{ marginBottom: 12 }}
          />
          <Button
            title="ابدأ بدون بيانات"
            onPress={() => handleFinish(false)}
            variant="outline"
            fullWidth
            disabled={loading}
          />
        </>
      ),
    },
  ];

  const current = steps[step];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: topPad + 20, paddingBottom: bottomPad + 20 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Dots */}
        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === step ? colors.primary : i < step ? colors.primary + '60' : colors.border,
                  width: i === step ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Step Indicator */}
        <Text style={[styles.stepNum, { color: colors.mutedForeground }]}>{step + 1} / {TOTAL_STEPS}</Text>

        {/* Icon */}
        <View style={[styles.iconWrap, { backgroundColor: colors.primary + '15', borderRadius: 40 }]}>
          <Feather name={current.icon as any} size={40} color={colors.primary} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.foreground }]}>{current.title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{current.subtitle}</Text>

        {/* Content */}
        <View style={styles.form}>{current.content}</View>

        {/* Navigation (not shown on last step) */}
        {step < TOTAL_STEPS - 1 ? (
          <View style={styles.navRow}>
            {step > 0 ? (
              <Button title="السابق" onPress={goBack} variant="ghost" style={{ flex: 1 }} />
            ) : <View style={{ flex: 1 }} />}
            <Button title="التالي" onPress={goNext} style={{ flex: 2, marginRight: 8 }} />
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, alignItems: 'stretch' },
  dotsRow: { flexDirection: 'row-reverse', justifyContent: 'center', gap: 6, marginBottom: 12 },
  dot: { height: 8, borderRadius: 4 },
  stepNum: { textAlign: 'center', fontSize: 13, fontFamily: 'Inter_400Regular', marginBottom: 32 },
  iconWrap: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontFamily: 'Inter_700Bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  fieldTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'right', marginBottom: 12 },
  form: { width: '100%', marginBottom: 24 },
  hint: { fontSize: 12, fontFamily: 'Inter_400Regular', textAlign: 'right', lineHeight: 20, marginTop: -6 },
  navRow: { flexDirection: 'row-reverse', gap: 8 },
  finishCard: { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20 },
  finishText: { flex: 1, fontSize: 14, lineHeight: 22, fontFamily: 'Inter_400Regular', textAlign: 'right' },
});
