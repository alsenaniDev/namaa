import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Income, Commitment, CommitmentPayment, Expense, Lender } from '../types';

export interface CustomTypes {
  incomeTypes: string[];
  commitmentCategories: string[];
  expenseCategories: string[];
}

const KEYS = {
  USER_PROFILE: '@mali/user_profile',
  INCOMES: '@mali/incomes',
  COMMITMENTS: '@mali/commitments',
  COMMITMENT_PAYMENTS: '@mali/commitment_payments',
  EXPENSES: '@mali/expenses',
  CUSTOM_TYPES: '@mali/custom_types',
  LENDERS: '@mali/lenders',
  STORAGE_VERSION: '@mali/storage_version',
};

// Bump when introducing a schema migration that may invalidate older data.
const CURRENT_STORAGE_VERSION = '2';

async function getItem<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function setItem<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

const DEFAULT_CUSTOM_TYPES: CustomTypes = { incomeTypes: [], commitmentCategories: [], expenseCategories: [] };

/**
 * Run once at app startup. If we detect storage from a pre-v2 install (no
 * version marker) we wipe legacy data so the app starts fresh on the new
 * richer Commitment/Lender model. From v2 onward, future migrations should
 * transform data in place rather than wipe.
 */
export async function runStorageMigrations(): Promise<void> {
  try {
    const version = await AsyncStorage.getItem(KEYS.STORAGE_VERSION);
    if (version === CURRENT_STORAGE_VERSION) return;

    // Pre-v2: wipe everything (fresh-start migration agreed with product).
    if (version === null) {
      await AsyncStorage.multiRemove([
        KEYS.USER_PROFILE,
        KEYS.INCOMES,
        KEYS.COMMITMENTS,
        KEYS.COMMITMENT_PAYMENTS,
        KEYS.EXPENSES,
        KEYS.CUSTOM_TYPES,
        KEYS.LENDERS,
      ]);
    }
    await AsyncStorage.setItem(KEYS.STORAGE_VERSION, CURRENT_STORAGE_VERSION);
  } catch {
    // If migration itself fails, fall through — the app can still load.
  }
}

export const storage = {
  getUserProfile: () => getItem<UserProfile | null>(KEYS.USER_PROFILE, null),
  saveUserProfile: (p: UserProfile) => setItem(KEYS.USER_PROFILE, p),

  getIncomes: () => getItem<Income[]>(KEYS.INCOMES, []),
  saveIncomes: (items: Income[]) => setItem(KEYS.INCOMES, items),

  getCommitments: () => getItem<Commitment[]>(KEYS.COMMITMENTS, []),
  saveCommitments: (items: Commitment[]) => setItem(KEYS.COMMITMENTS, items),

  getCommitmentPayments: () => getItem<CommitmentPayment[]>(KEYS.COMMITMENT_PAYMENTS, []),
  saveCommitmentPayments: (items: CommitmentPayment[]) => setItem(KEYS.COMMITMENT_PAYMENTS, items),

  getExpenses: () => getItem<Expense[]>(KEYS.EXPENSES, []),
  saveExpenses: (items: Expense[]) => setItem(KEYS.EXPENSES, items),

  getCustomTypes: () => getItem<CustomTypes>(KEYS.CUSTOM_TYPES, DEFAULT_CUSTOM_TYPES),
  saveCustomTypes: (types: CustomTypes) => setItem(KEYS.CUSTOM_TYPES, types),

  getLenders: () => getItem<Lender[]>(KEYS.LENDERS, []),
  saveLenders: (items: Lender[]) => setItem(KEYS.LENDERS, items),

  clearAll: async () => {
    // Keep STORAGE_VERSION so re-clear in v2 doesn't re-trigger a wipe.
    await AsyncStorage.multiRemove([
      KEYS.USER_PROFILE, KEYS.INCOMES, KEYS.COMMITMENTS,
      KEYS.COMMITMENT_PAYMENTS, KEYS.EXPENSES, KEYS.CUSTOM_TYPES, KEYS.LENDERS,
    ]);
  },

  exportAll: async (): Promise<string> => {
    const [profile, incomes, commitments, payments, expenses, customTypes, lenders] = await Promise.all([
      getItem<UserProfile | null>(KEYS.USER_PROFILE, null),
      getItem<Income[]>(KEYS.INCOMES, []),
      getItem<Commitment[]>(KEYS.COMMITMENTS, []),
      getItem<CommitmentPayment[]>(KEYS.COMMITMENT_PAYMENTS, []),
      getItem<Expense[]>(KEYS.EXPENSES, []),
      getItem<CustomTypes>(KEYS.CUSTOM_TYPES, DEFAULT_CUSTOM_TYPES),
      getItem<Lender[]>(KEYS.LENDERS, []),
    ]);
    return JSON.stringify({
      version: CURRENT_STORAGE_VERSION,
      profile, incomes, commitments, payments, expenses, customTypes, lenders,
      exportedAt: new Date().toISOString(),
    });
  },

  importAll: async (jsonString: string): Promise<void> => {
    const data = JSON.parse(jsonString);
    // Settings copy promises "replace all current data" — so clear every domain
    // key first, then write the imported values (with safe defaults for any
    // collection missing from the backup file).
    await AsyncStorage.multiRemove([
      KEYS.USER_PROFILE, KEYS.INCOMES, KEYS.COMMITMENTS,
      KEYS.COMMITMENT_PAYMENTS, KEYS.EXPENSES, KEYS.CUSTOM_TYPES, KEYS.LENDERS,
    ]);
    await Promise.all([
      data.profile ? setItem(KEYS.USER_PROFILE, data.profile) : Promise.resolve(),
      setItem(KEYS.INCOMES, Array.isArray(data.incomes) ? data.incomes : []),
      setItem(KEYS.COMMITMENTS, Array.isArray(data.commitments) ? data.commitments : []),
      setItem(KEYS.COMMITMENT_PAYMENTS, Array.isArray(data.payments) ? data.payments : []),
      setItem(KEYS.EXPENSES, Array.isArray(data.expenses) ? data.expenses : []),
      setItem(KEYS.CUSTOM_TYPES, data.customTypes ?? DEFAULT_CUSTOM_TYPES),
      setItem(KEYS.LENDERS, Array.isArray(data.lenders) ? data.lenders : []),
    ]);
    await AsyncStorage.setItem(KEYS.STORAGE_VERSION, CURRENT_STORAGE_VERSION);
  },
};
