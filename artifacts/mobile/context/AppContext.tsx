import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UserProfile, Income, Commitment, CommitmentPayment, Expense, Lender,
  SavingsGoal, GoalContribution, CategoryBudget, Subscription,
} from '../types';
import { storage, CustomTypes, runStorageMigrations } from '../utils/storage';
import { generateId } from '../utils/format';
import { generateSampleData } from '../utils/sampleData';
import { MonthlyTotals } from '../types';
import { calculateMonthlyTotals } from '../utils/calculations';
import { initNotifications, syncReminders, cancelAllScheduled } from '../utils/notifications';

interface AppContextType {
  userProfile: UserProfile | null;
  incomes: Income[];
  commitments: Commitment[];
  commitmentPayments: CommitmentPayment[];
  expenses: Expense[];
  lenders: Lender[];
  goals: SavingsGoal[];
  goalContributions: GoalContribution[];
  budgets: CategoryBudget[];
  subscriptions: Subscription[];
  customTypes: CustomTypes;
  isLoading: boolean;
  saveUserProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addIncome: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (id: string, income: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addCommitment: (commitment: Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateCommitment: (id: string, commitment: Partial<Commitment>) => Promise<void>;
  deleteCommitment: (id: string) => Promise<void>;
  markCommitmentPaid: (commitmentId: string, month: number, year: number, amount: number) => Promise<void>;
  markCommitmentUnpaid: (commitmentId: string, month: number, year: number) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  addLender: (lender: Omit<Lender, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateLender: (id: string, lender: Partial<Lender>) => Promise<void>;
  deleteLender: (id: string) => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateGoal: (id: string, goal: Partial<SavingsGoal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addGoalContribution: (c: Omit<GoalContribution, 'id' | 'createdAt'>) => Promise<void>;
  deleteGoalContribution: (id: string) => Promise<void>;
  upsertBudget: (category: string, monthlyLimit: number) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  addSubscription: (sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateSubscription: (id: string, sub: Partial<Subscription>) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  addCustomType: (category: keyof CustomTypes, value: string) => Promise<void>;
  removeCustomType: (category: keyof CustomTypes, value: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  getMonthlyTotals: (month: number, year: number) => MonthlyTotals;
  exportData: () => Promise<string>;
  importData: (json: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_CUSTOM_TYPES: CustomTypes = { incomeTypes: [], commitmentCategories: [], expenseCategories: [] };

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [commitmentPayments, setCommitmentPayments] = useState<CommitmentPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([]);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customTypes, setCustomTypes] = useState<CustomTypes>(DEFAULT_CUSTOM_TYPES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        await runStorageMigrations();
        const [profile, inc, com, payments, exp, ct, lend, gls, gcs, bgs, subs] = await Promise.all([
          storage.getUserProfile(),
          storage.getIncomes(),
          storage.getCommitments(),
          storage.getCommitmentPayments(),
          storage.getExpenses(),
          storage.getCustomTypes(),
          storage.getLenders(),
          storage.getGoals(),
          storage.getGoalContributions(),
          storage.getBudgets(),
          storage.getSubscriptions(),
        ]);
        setUserProfile(profile);
        setIncomes(inc);
        setCommitments(com);
        setCommitmentPayments(payments);
        setExpenses(exp);
        setCustomTypes(ct);
        setLenders(lend);
        setGoals(gls);
        setGoalContributions(gcs);
        setBudgets(bgs);
        setSubscriptions(subs);
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
    // Configure foreground handler + Android channel once at startup.
    initNotifications();
  }, []);

  // Reschedule local reminders whenever the inputs that drive them change.
  // Stateless sync — cancel all + reschedule from current data.
  useEffect(() => {
    if (isLoading) return;
    syncReminders({
      enabled: !!userProfile?.notificationsEnabled,
      commitments,
      subscriptions,
    });
  }, [isLoading, userProfile?.notificationsEnabled, commitments, subscriptions]);

  const saveUserProfile = useCallback(async (data: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const profile: UserProfile = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    await storage.saveUserProfile(profile);
    setUserProfile(profile);
  }, []);

  const updateUserProfile = useCallback(async (data: Partial<UserProfile>) => {
    if (!userProfile) return;
    const updated = { ...userProfile, ...data, updatedAt: new Date().toISOString() };
    await storage.saveUserProfile(updated);
    setUserProfile(updated);
  }, [userProfile]);

  const addIncome = useCallback(async (data: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: Income = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    const updated = [...incomes, item];
    await storage.saveIncomes(updated);
    setIncomes(updated);
  }, [incomes]);

  const updateIncome = useCallback(async (id: string, data: Partial<Income>) => {
    const updated = incomes.map((i) => i.id === id ? { ...i, ...data, updatedAt: new Date().toISOString() } : i);
    await storage.saveIncomes(updated);
    setIncomes(updated);
  }, [incomes]);

  const deleteIncome = useCallback(async (id: string) => {
    const updated = incomes.filter((i) => i.id !== id);
    await storage.saveIncomes(updated);
    setIncomes(updated);
  }, [incomes]);

  const addCommitment = useCallback(async (data: Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: Commitment = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    const updated = [...commitments, item];
    await storage.saveCommitments(updated);
    setCommitments(updated);
    return item.id;
  }, [commitments]);

  const updateCommitment = useCallback(async (id: string, data: Partial<Commitment>) => {
    const updated = commitments.map((c) => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
    await storage.saveCommitments(updated);
    setCommitments(updated);
  }, [commitments]);

  const deleteCommitment = useCallback(async (id: string) => {
    const updatedC = commitments.filter((c) => c.id !== id);
    const updatedP = commitmentPayments.filter((p) => p.commitmentId !== id);
    await Promise.all([storage.saveCommitments(updatedC), storage.saveCommitmentPayments(updatedP)]);
    setCommitments(updatedC);
    setCommitmentPayments(updatedP);
  }, [commitments, commitmentPayments]);

  const markCommitmentPaid = useCallback(async (commitmentId: string, month: number, year: number, amount: number) => {
    const existing = commitmentPayments.find((p) => p.commitmentId === commitmentId && p.month === month && p.year === year);
    let updated: CommitmentPayment[];
    if (existing) {
      updated = commitmentPayments.map((p) =>
        p.commitmentId === commitmentId && p.month === month && p.year === year
          ? { ...p, status: 'paid' as const, paidDate: new Date().toISOString(), amount }
          : p,
      );
    } else {
      const newPayment: CommitmentPayment = {
        id: generateId(), commitmentId, month, year, amount,
        paidDate: new Date().toISOString(), status: 'paid',
      };
      updated = [...commitmentPayments, newPayment];
    }
    await storage.saveCommitmentPayments(updated);
    setCommitmentPayments(updated);
  }, [commitmentPayments]);

  const markCommitmentUnpaid = useCallback(async (commitmentId: string, month: number, year: number) => {
    const updated = commitmentPayments.filter(
      (p) => !(p.commitmentId === commitmentId && p.month === month && p.year === year),
    );
    await storage.saveCommitmentPayments(updated);
    setCommitmentPayments(updated);
  }, [commitmentPayments]);

  const addExpense = useCallback(async (data: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: Expense = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    const updated = [...expenses, item];
    await storage.saveExpenses(updated);
    setExpenses(updated);
  }, [expenses]);

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    const updated = expenses.map((e) => e.id === id ? { ...e, ...data, updatedAt: new Date().toISOString() } : e);
    await storage.saveExpenses(updated);
    setExpenses(updated);
  }, [expenses]);

  const deleteExpense = useCallback(async (id: string) => {
    const updated = expenses.filter((e) => e.id !== id);
    await storage.saveExpenses(updated);
    setExpenses(updated);
  }, [expenses]);

  const addLender = useCallback(async (data: Omit<Lender, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: Lender = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    const updated = [...lenders, item];
    await storage.saveLenders(updated);
    setLenders(updated);
    return item.id;
  }, [lenders]);

  const updateLender = useCallback(async (id: string, data: Partial<Lender>) => {
    const updated = lenders.map((l) => l.id === id ? { ...l, ...data, updatedAt: new Date().toISOString() } : l);
    await storage.saveLenders(updated);
    setLenders(updated);
  }, [lenders]);

  const deleteLender = useCallback(async (id: string) => {
    const updatedLenders = lenders.filter((l) => l.id !== id);
    const updatedCommitments = commitments.map((c) =>
      c.lenderId === id ? { ...c, lenderId: undefined, updatedAt: new Date().toISOString() } : c,
    );
    await Promise.all([
      storage.saveLenders(updatedLenders),
      storage.saveCommitments(updatedCommitments),
    ]);
    setLenders(updatedLenders);
    setCommitments(updatedCommitments);
  }, [lenders, commitments]);

  // ─── Goals ───────────────────────────────────────────────────────────────
  const addGoal = useCallback(async (data: Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: SavingsGoal = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    const updated = [...goals, item];
    await storage.saveGoals(updated);
    setGoals(updated);
    return item.id;
  }, [goals]);

  const updateGoal = useCallback(async (id: string, data: Partial<SavingsGoal>) => {
    const updated = goals.map((g) => g.id === id ? { ...g, ...data, updatedAt: new Date().toISOString() } : g);
    await storage.saveGoals(updated);
    setGoals(updated);
  }, [goals]);

  const deleteGoal = useCallback(async (id: string) => {
    const updatedG = goals.filter((g) => g.id !== id);
    const updatedC = goalContributions.filter((c) => c.goalId !== id);
    await Promise.all([storage.saveGoals(updatedG), storage.saveGoalContributions(updatedC)]);
    setGoals(updatedG);
    setGoalContributions(updatedC);
  }, [goals, goalContributions]);

  const addGoalContribution = useCallback(async (data: Omit<GoalContribution, 'id' | 'createdAt'>) => {
    const item: GoalContribution = { id: generateId(), ...data, createdAt: new Date().toISOString() };
    const updated = [...goalContributions, item];
    await storage.saveGoalContributions(updated);
    setGoalContributions(updated);
  }, [goalContributions]);

  const deleteGoalContribution = useCallback(async (id: string) => {
    const updated = goalContributions.filter((c) => c.id !== id);
    await storage.saveGoalContributions(updated);
    setGoalContributions(updated);
  }, [goalContributions]);

  // ─── Budgets ─────────────────────────────────────────────────────────────
  // One budget per category. Upsert keeps the screen UI simple.
  const upsertBudget = useCallback(async (category: string, monthlyLimit: number) => {
    const now = new Date().toISOString();
    const existing = budgets.find((b) => b.category === category);
    let updated: CategoryBudget[];
    if (existing) {
      updated = budgets.map((b) =>
        b.id === existing.id ? { ...b, monthlyLimit, updatedAt: now } : b,
      );
    } else {
      updated = [...budgets, { id: generateId(), category, monthlyLimit, createdAt: now, updatedAt: now }];
    }
    await storage.saveBudgets(updated);
    setBudgets(updated);
  }, [budgets]);

  const deleteBudget = useCallback(async (id: string) => {
    const updated = budgets.filter((b) => b.id !== id);
    await storage.saveBudgets(updated);
    setBudgets(updated);
  }, [budgets]);

  // ─── Subscriptions ───────────────────────────────────────────────────────
  const addSubscription = useCallback(async (data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: Subscription = { id: generateId(), ...data, createdAt: now, updatedAt: now };
    const updated = [...subscriptions, item];
    await storage.saveSubscriptions(updated);
    setSubscriptions(updated);
    return item.id;
  }, [subscriptions]);

  const updateSubscription = useCallback(async (id: string, data: Partial<Subscription>) => {
    const updated = subscriptions.map((s) => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
    await storage.saveSubscriptions(updated);
    setSubscriptions(updated);
  }, [subscriptions]);

  const deleteSubscription = useCallback(async (id: string) => {
    const updated = subscriptions.filter((s) => s.id !== id);
    await storage.saveSubscriptions(updated);
    setSubscriptions(updated);
  }, [subscriptions]);

  const addCustomType = useCallback(async (category: keyof CustomTypes, value: string) => {
    const trimmed = value.trim();
    if (!trimmed || customTypes[category].includes(trimmed)) return;
    const updated = { ...customTypes, [category]: [...customTypes[category], trimmed] };
    await storage.saveCustomTypes(updated);
    setCustomTypes(updated);
  }, [customTypes]);

  const removeCustomType = useCallback(async (category: keyof CustomTypes, value: string) => {
    const updated = { ...customTypes, [category]: customTypes[category].filter((v) => v !== value) };
    await storage.saveCustomTypes(updated);
    setCustomTypes(updated);
  }, [customTypes]);

  const clearAllData = useCallback(async () => {
    await cancelAllScheduled();
    await storage.clearAll();
    setUserProfile(null);
    setIncomes([]);
    setCommitments([]);
    setCommitmentPayments([]);
    setExpenses([]);
    setLenders([]);
    setGoals([]);
    setGoalContributions([]);
    setBudgets([]);
    setSubscriptions([]);
    setCustomTypes(DEFAULT_CUSTOM_TYPES);
  }, []);

  const loadSampleData = useCallback(async () => {
    const sample = generateSampleData();
    const newLenders = [...lenders, ...sample.lenders];
    const newIncomes = [...incomes, ...sample.incomes];
    const newCommitments = [...commitments, ...sample.commitments];
    const newPayments = [...commitmentPayments, ...sample.commitmentPayments];
    const newExpenses = [...expenses, ...sample.expenses];
    const newGoals = [...goals, ...sample.goals];
    const newContribs = [...goalContributions, ...sample.goalContributions];
    // Budgets and subscriptions: skip categories/names that already exist to
    // avoid duplicate-looking rows in the upsert-by-category UI.
    const existingBudgetCats = new Set(budgets.map((b) => b.category));
    const newBudgets = [...budgets, ...sample.budgets.filter((b) => !existingBudgetCats.has(b.category))];
    const existingSubNames = new Set(subscriptions.map((s) => s.name.toLowerCase()));
    const newSubs = [...subscriptions, ...sample.subscriptions.filter((s) => !existingSubNames.has(s.name.toLowerCase()))];

    await Promise.all([
      storage.saveLenders(newLenders),
      storage.saveIncomes(newIncomes),
      storage.saveCommitments(newCommitments),
      storage.saveCommitmentPayments(newPayments),
      storage.saveExpenses(newExpenses),
      storage.saveGoals(newGoals),
      storage.saveGoalContributions(newContribs),
      storage.saveBudgets(newBudgets),
      storage.saveSubscriptions(newSubs),
    ]);
    setLenders(newLenders);
    setIncomes(newIncomes);
    setCommitments(newCommitments);
    setCommitmentPayments(newPayments);
    setExpenses(newExpenses);
    setGoals(newGoals);
    setGoalContributions(newContribs);
    setBudgets(newBudgets);
    setSubscriptions(newSubs);
  }, [incomes, commitments, commitmentPayments, expenses, lenders, goals, goalContributions, budgets, subscriptions]);

  const getMonthlyTotals = useCallback((month: number, year: number): MonthlyTotals => {
    return calculateMonthlyTotals(
      incomes, commitments, commitmentPayments, expenses, month, year,
      userProfile?.monthlySavingGoal ?? 0,
      'ar',
      subscriptions,
    );
  }, [incomes, commitments, commitmentPayments, expenses, userProfile, subscriptions]);

  const exportData = useCallback(() => storage.exportAll(), []);

  const importData = useCallback(async (json: string) => {
    await storage.importAll(json);
    const [p, i, c, pay, e, ct, l, gls, gcs, bgs, subs] = await Promise.all([
      storage.getUserProfile(),
      storage.getIncomes(),
      storage.getCommitments(),
      storage.getCommitmentPayments(),
      storage.getExpenses(),
      storage.getCustomTypes(),
      storage.getLenders(),
      storage.getGoals(),
      storage.getGoalContributions(),
      storage.getBudgets(),
      storage.getSubscriptions(),
    ]);
    setUserProfile(p);
    setIncomes(i);
    setCommitments(c);
    setCommitmentPayments(pay);
    setExpenses(e);
    setCustomTypes(ct);
    setLenders(l);
    setGoals(gls);
    setGoalContributions(gcs);
    setBudgets(bgs);
    setSubscriptions(subs);
  }, []);

  return (
    <AppContext.Provider value={{
      userProfile, incomes, commitments, commitmentPayments, expenses, lenders,
      goals, goalContributions, budgets, subscriptions,
      customTypes, isLoading,
      saveUserProfile, updateUserProfile,
      addIncome, updateIncome, deleteIncome,
      addCommitment, updateCommitment, deleteCommitment, markCommitmentPaid, markCommitmentUnpaid,
      addExpense, updateExpense, deleteExpense,
      addLender, updateLender, deleteLender,
      addGoal, updateGoal, deleteGoal, addGoalContribution, deleteGoalContribution,
      upsertBudget, deleteBudget,
      addSubscription, updateSubscription, deleteSubscription,
      addCustomType, removeCustomType,
      clearAllData, loadSampleData, getMonthlyTotals, exportData, importData,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
