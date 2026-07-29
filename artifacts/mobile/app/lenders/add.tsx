import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Alert, Platform, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useDir } from '@/hooks/useDir';
import { useApp } from '@/context/AppContext';
import { useT } from '@/hooks/useT';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { LENDER_TYPES, PAYMENT_METHODS, LENDER_COLOR_PALETTE, LenderType, PaymentMethodKind } from '@/types';
import { FIELD_LIMITS, validateTitle, validateNotes } from '@/utils/validation';
import { imageUriToPersistentDataUri } from '@/utils/lenderImages';
import { iosScrollViewObserverProps } from '@/utils/scrollView';

interface FormErrors {
  name?: string;
  notes?: string;
}

export default function AddLenderScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const dir = useDir();
  const params = useLocalSearchParams<{ id?: string }>();
  const { lenders, addLender, updateLender, deleteLender } = useApp();

  const existing = params.id ? lenders.find((l) => l.id === params.id) : undefined;
  const isEdit = !!existing;

  const [name, setName] = useState(existing?.name ?? '');
  const [type, setType] = useState<LenderType>(existing?.type ?? 'bank');
  const [color, setColor] = useState(existing?.color ?? LENDER_COLOR_PALETTE[0]);
  const [imageUri, setImageUri] = useState<string | undefined>(existing?.imageUri);
  const [phone, setPhone] = useState(existing?.phone ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [website, setWebsite] = useState(existing?.website ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKind>(existing?.paymentMethod ?? 'auto_debit');
  const [iban, setIban] = useState(existing?.iban ?? '');
  const [bankAccount, setBankAccount] = useState(existing?.bankAccount ?? '');
  const [bankName, setBankName] = useState(existing?.bankName ?? '');
  const [beneficiary, setBeneficiary] = useState(existing?.beneficiaryName ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const clearError = (f: keyof FormErrors) => setErrors((e) => ({ ...e, [f]: undefined }));

  const validate = (): boolean => {
    const errs: FormErrors = {
      name: validateTitle(name, t),
      notes: validateNotes(notes, t),
    };
    setErrors(errs);
    return !Object.values(errs).some(Boolean);
  };

  const handleSave = async () => {
    if (!validate()) return;
    setLoading(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const data = {
      name: name.trim(),
      type,
      color,
      imageUri: imageUri || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      address: address.trim() || undefined,
      paymentMethod,
      iban: iban.trim() || undefined,
      bankAccount: bankAccount.trim() || undefined,
      bankName: bankName.trim() || undefined,
      beneficiaryName: beneficiary.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (isEdit && params.id) await updateLender(params.id, data);
    else await addLender(data);
    setLoading(false);
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(t.lenders.deleteTitle, t.lenders.deleteMsg(existing?.name ?? ''), [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.common.delete,
        style: 'destructive',
        onPress: async () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          await deleteLender(params.id!);
          router.back();
        },
      },
    ]);
  };

  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const pickImage = async () => {
    if (Platform.OS !== 'web') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t.lenders.imagePermissionTitle, t.lenders.imagePermissionMsg);
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const pickedUri = result.assets[0].uri;
    Haptics.selectionAsync();
    setImageUri(await imageUriToPersistentDataUri(pickedUri));
  };

  const removeImage = () => {
    Haptics.selectionAsync();
    setImageUri(undefined);
  };

  return (
    <ScrollView
      {...iosScrollViewObserverProps}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Input
        label={t.lenders.fieldName}
        value={name}
        onChangeText={(v) => { setName(v); clearError('name'); }}
        placeholder={t.lenders.fieldName}
        error={errors.name}
        maxLength={FIELD_LIMITS.title}
      />
      <Select
        label={t.lenders.fieldType}
        value={type}
        options={LENDER_TYPES.map((tp) => ({ label: t.lenders.typeLabels[tp] ?? tp, value: tp }))}
        onValueChange={(v) => setType(v as LenderType)}
      />

      <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.lenders.fieldImage}</Text>
      <View style={[styles.imageRow, { flexDirection: dir.row }]}>
        <View style={[styles.imagePreview, { backgroundColor: color + '22', borderColor: color + '55' }]}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreviewImg} />
          ) : (
            <Feather name="image" size={26} color={color} />
          )}
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <TouchableOpacity
            onPress={pickImage}
            activeOpacity={0.78}
            style={[styles.imageBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          >
            <Feather name={imageUri ? 'refresh-cw' : 'upload'} size={14} color={colors.primary} />
            <Text style={[styles.imageBtnText, { color: colors.foreground }]}>
              {imageUri ? t.lenders.imageChange : t.lenders.imageAdd}
            </Text>
          </TouchableOpacity>
          {imageUri ? (
            <TouchableOpacity
              onPress={removeImage}
              activeOpacity={0.78}
              style={[styles.imageBtn, { borderColor: colors.danger + '50', backgroundColor: colors.danger + '10' }]}
            >
              <Feather name="trash-2" size={14} color={colors.danger} />
              <Text style={[styles.imageBtnText, { color: colors.danger }]}>{t.lenders.imageRemove}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <Text style={[styles.label, { textAlign: dir.textAlign, color: colors.foreground }]}>{t.lenders.fieldColor}</Text>
      <View style={[styles.colorRow, { flexDirection: dir.row }]}>
        {LENDER_COLOR_PALETTE.map((c) => (
          <TouchableOpacity
            key={c}
            onPress={() => { setColor(c); Haptics.selectionAsync(); }}
            style={[
              styles.colorSwatch,
              { backgroundColor: c, borderColor: color === c ? colors.foreground : 'transparent' },
            ]}
            activeOpacity={0.8}
          />
        ))}
      </View>

      <Text style={[styles.section, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.sectionContact}</Text>
      <Input label={t.lenders.fieldPhone} value={phone} onChangeText={setPhone} placeholder="05XXXXXXXX" keyboardType="phone-pad" maxLength={20} />
      <Input label={t.lenders.fieldEmail} value={email} onChangeText={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" maxLength={100} />
      <Input label={t.lenders.fieldWebsite} value={website} onChangeText={setWebsite} placeholder="example.com" autoCapitalize="none" maxLength={100} />
      <Input label={t.lenders.fieldAddress} value={address} onChangeText={setAddress} placeholder="" maxLength={200} />

      <Text style={[styles.section, { textAlign: dir.textAlign, color: colors.mutedForeground }]}>{t.lenders.sectionPayment}</Text>
      <Select
        label={t.lenders.fieldPaymentMethod}
        value={paymentMethod}
        options={PAYMENT_METHODS.map((pm) => ({ label: t.lenders.paymentMethodLabels[pm] ?? pm, value: pm }))}
        onValueChange={(v) => setPaymentMethod(v as PaymentMethodKind)}
      />
      <Input label={t.lenders.fieldBankName} value={bankName} onChangeText={setBankName} placeholder="" maxLength={80} />
      <Input label={t.lenders.fieldIban} value={iban} onChangeText={setIban} placeholder="SA00 0000 0000 0000 0000 0000" autoCapitalize="characters" maxLength={40} />
      <Input label={t.lenders.fieldBankAccount} value={bankAccount} onChangeText={setBankAccount} placeholder="" keyboardType="numbers-and-punctuation" maxLength={30} />
      <Input label={t.lenders.fieldBeneficiary} value={beneficiary} onChangeText={setBeneficiary} placeholder="" maxLength={80} />

      <Input
        label={t.forms.notesLabel}
        value={notes}
        onChangeText={(v) => { setNotes(v); clearError('notes'); }}
        placeholder=""
        multiline
        numberOfLines={3}
        maxLength={FIELD_LIMITS.notes}
        error={errors.notes}
        style={{ height: 80, textAlignVertical: 'top' }}
      />

      <Button
        title={loading ? t.common.saving : isEdit ? t.lenders.updateBtn : t.lenders.addBtn}
        onPress={handleSave}
        fullWidth
        loading={loading}
        style={{ marginTop: 8 }}
      />
      {isEdit ? (
        <Button
          title={t.lenders.deleteBtn}
          onPress={handleDelete}
          variant="destructive"
          fullWidth
          style={{ marginTop: 10 }}
          disabled={loading}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20 },
  label: { fontSize: 14, fontFamily: 'Cairo_500Medium', marginBottom: 8 },
  section: { fontSize: 11, fontFamily: 'Cairo_600SemiBold', marginTop: 8, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  colorRow: { flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5 },
  imageRow: { alignItems: 'center', gap: 12, marginBottom: 18 },
  imagePreview: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imagePreviewImg: { width: '100%', height: '100%' },
  imageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  imageBtnText: { fontSize: 12, fontFamily: 'Cairo_600SemiBold' },
});
