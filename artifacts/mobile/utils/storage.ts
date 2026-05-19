import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile, Income, Commitment, CommitmentPayment, Expense, Lender,
  SavingsGoal, GoalContribution, CategoryBudget, Subscription,
} from '../types';

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
  GOALS: '@mali/goals',
  GOAL_CONTRIBUTIONS: '@mali/goal_contributions',
  BUDGETS: '@mali/budgets',
  SUBSCRIPTIONS: '@mali/subscriptions',
  STORAGE_VERSION: '@mali/storage_version',
};

// Bump when introducing a schema migration that may invalidate older data.
// v3 (Phase 3): adds goals/contributions/budgets/subscriptions. Additive only —
// no destructive migration needed.
const CURRENT_STORAGE_VERSION = '3';

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

const ALL_DOMAIN_KEYS = [
  KEYS.USER_PROFILE, KEYS.INCOMES, KEYS.COMMITMENTS, KEYS.COMMITMENT_PAYMENTS,
  KEYS.EXPENSES, KEYS.CUSTOM_TYPES, KEYS.LENDERS,
  KEYS.GOALS, KEYS.GOAL_CONTRIBUTIONS, KEYS.BUDGETS, KEYS.SUBSCRIPTIONS,
];

/**
 * Run once at app startup. Pre-v2 installs are wiped (legacy commitment model).
 * v2 → v3 is additive (goals/budgets/subs default to empty arrays). All later
 * migrations should transform data in place rather than wipe.
 */
export async function runStorageMigrations(): Promise<void> {
  try {
    const version = await AsyncStorage.getItem(KEYS.STORAGE_VERSION);
    if (version === CURRENT_STORAGE_VERSION) return;

    if (version === null) {
      // Pre-v2: wipe legacy commitment/lender data.
      await AsyncStorage.multiRemove(ALL_DOMAIN_KEYS);
    }
    // v2 → v3: no-op, new keys default to empty arrays.
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

  getGoals: () => getItem<SavingsGoal[]>(KEYS.GOALS, []),
  saveGoals: (items: SavingsGoal[]) => setItem(KEYS.GOALS, items),

  getGoalContributions: () => getItem<GoalContribution[]>(KEYS.GOAL_CONTRIBUTIONS, []),
  saveGoalContributions: (items: GoalContribution[]) => setItem(KEYS.GOAL_CONTRIBUTIONS, items),

  getBudgets: () => getItem<CategoryBudget[]>(KEYS.BUDGETS, []),
  saveBudgets: (items: CategoryBudget[]) => setItem(KEYS.BUDGETS, items),

  getSubscriptions: () => getItem<Subscription[]>(KEYS.SUBSCRIPTIONS, []),
  saveSubscriptions: (items: Subscription[]) => setItem(KEYS.SUBSCRIPTIONS, items),

  clearAll: async () => {
    // Keep STORAGE_VERSION so re-clear doesn't re-trigger a wipe.
    await AsyncStorage.multiRemove(ALL_DOMAIN_KEYS);
  },

  exportAll: async (): Promise<string> => {
    const [
      profile, incomes, commitments, payments, expenses, customTypes, lenders,
      goals, goalContributions, budgets, subscriptions,
    ] = await Promise.all([
      getItem<UserProfile | null>(KEYS.USER_PROFILE, null),
      getItem<Income[]>(KEYS.INCOMES, []),
      getItem<Commitment[]>(KEYS.COMMITMENTS, []),
      getItem<CommitmentPayment[]>(KEYS.COMMITMENT_PAYMENTS, []),
      getItem<Expense[]>(KEYS.EXPENSES, []),
      getItem<CustomTypes>(KEYS.CUSTOM_TYPES, DEFAULT_CUSTOM_TYPES),
      getItem<Lender[]>(KEYS.LENDERS, []),
      getItem<SavingsGoal[]>(KEYS.GOALS, []),
      getItem<GoalContribution[]>(KEYS.GOAL_CONTRIBUTIONS, []),
      getItem<CategoryBudget[]>(KEYS.BUDGETS, []),
      getItem<Subscription[]>(KEYS.SUBSCRIPTIONS, []),
    ]);
    return JSON.stringify({
      version: CURRENT_STORAGE_VERSION,
      profile, incomes, commitments, payments, expenses, customTypes, lenders,
      goals, goalContributions, budgets, subscriptions,
      exportedAt: new Date().toISOString(),
    });
  },

  importAll: async (jsonString: string): Promise<void> => {
    const data = JSON.parse(jsonString);
    await AsyncStorage.multiRemove(ALL_DOMAIN_KEYS);
    await Promise.all([
      data.profile ? setItem(KEYS.USER_PROFILE, data.profile) : Promise.resolve(),
      setItem(KEYS.INCOMES, Array.isArray(data.incomes) ? data.incomes : []),
      setItem(KEYS.COMMITMENTS, Array.isArray(data.commitments) ? data.commitments : []),
      setItem(KEYS.COMMITMENT_PAYMENTS, Array.isArray(data.payments) ? data.payments : []),
      setItem(KEYS.EXPENSES, Array.isArray(data.expenses) ? data.expenses : []),
      setItem(KEYS.CUSTOM_TYPES, data.customTypes ?? DEFAULT_CUSTOM_TYPES),
      setItem(KEYS.LENDERS, Array.isArray(data.lenders) ? data.lenders : []),
      setItem(KEYS.GOALS, Array.isArray(data.goals) ? data.goals : []),
      setItem(KEYS.GOAL_CONTRIBUTIONS, Array.isArray(data.goalContributions) ? data.goalContributions : []),
      setItem(KEYS.BUDGETS, Array.isArray(data.budgets) ? data.budgets : []),
      setItem(KEYS.SUBSCRIPTIONS, Array.isArray(data.subscriptions) ? data.subscriptions : []),
    ]);
    await AsyncStorage.setItem(KEYS.STORAGE_VERSION, CURRENT_STORAGE_VERSION);
  },
};
