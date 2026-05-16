import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, Income, Commitment, CommitmentPayment, Expense } from '../types';

const KEYS = {
  USER_PROFILE: '@mali/user_profile',
  INCOMES: '@mali/incomes',
  COMMITMENTS: '@mali/commitments',
  COMMITMENT_PAYMENTS: '@mali/commitment_payments',
  EXPENSES: '@mali/expenses',
};

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

  clearAll: async () => {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  },

  exportAll: async (): Promise<string> => {
    const [profile, incomes, commitments, payments, expenses] = await Promise.all([
      getItem<UserProfile | null>(KEYS.USER_PROFILE, null),
      getItem<Income[]>(KEYS.INCOMES, []),
      getItem<Commitment[]>(KEYS.COMMITMENTS, []),
      getItem<CommitmentPayment[]>(KEYS.COMMITMENT_PAYMENTS, []),
      getItem<Expense[]>(KEYS.EXPENSES, []),
    ]);
    return JSON.stringify({ profile, incomes, commitments, payments, expenses, exportedAt: new Date().toISOString() });
  },

  importAll: async (jsonString: string): Promise<void> => {
    const data = JSON.parse(jsonString);
    const ops: Promise<void>[] = [];
    if (data.profile) ops.push(setItem(KEYS.USER_PROFILE, data.profile));
    if (data.incomes) ops.push(setItem(KEYS.INCOMES, data.incomes));
    if (data.commitments) ops.push(setItem(KEYS.COMMITMENTS, data.commitments));
    if (data.payments) ops.push(setItem(KEYS.COMMITMENT_PAYMENTS, data.payments));
    if (data.expenses) ops.push(setItem(KEYS.EXPENSES, data.expenses));
    await Promise.all(ops);
  },
};
