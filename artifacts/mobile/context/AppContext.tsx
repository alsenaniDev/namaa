import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import {
  UserProfile, Income, Commitment, CommitmentPayment, Expense, Lender,
  SavingsGoal, GoalContribution, CategoryBudget, Subscription,
  FinancialChallenge, FinancialChallengeId, UserAchievement,
} from '../types';
import { storage, CustomTypes, runStorageMigrations } from '../utils/storage';
import { generateId } from '../utils/format';
import { generateSampleData } from '../utils/sampleData';
import { MonthlyTotals } from '../types';
import { calculateMonthlyTotals } from '../utils/calculations';
import { evaluateAchievementUnlocks } from '../utils/achievements';
import { getAllChallengeProgress } from '../utils/financialChallenges';
import { normalizeLenderImageUris } from '../utils/lenderImages';
import { initNotifications, syncReminders, cancelAllScheduled } from '../utils/notifications';
import { unmarkByExpenseId } from '../features/smartExpenseDetection/storage/processedStore';

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
  challenges: FinancialChallenge[];
  achievements: UserAchievement[];
  recentAchievement: UserAchievement | null;
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
  /** Bulk-seed N past paid installments for a finite loan (most recent first). */
  seedPastInstallments: (commitmentId: string, count: number, amount: number, dueDay: number) => Promise<void>;
  /**
   * Bulk update several (month, year) periods of a commitment:
   *  - 'paid':    upsert with status='paid' + the given amount.
   *  - 'unpaid':  delete the records (treat as never-paid, fall back to the
   *               commitment's default monthly amount when displayed).
   *  - 'amount':  upsert with status='unpaid' + the given amount. Used when
   *               the user wants to override the displayed amount of a
   *               specific installment without marking it as paid.
   * Single storage write per call.
   */
  bulkUpdateCommitmentPayments: (
    commitmentId: string,
    periods: { month: number; year: number }[],
    action: 'paid' | 'unpaid' | 'amount',
    amount?: number,
  ) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /** One-shot month the Expenses screen should open on, if any. */
  expenseFocus: { month: number; year: number } | null;
  /** Requests the Expenses screen to open on the given month. */
  setExpenseFocus: (month: number, year: number) => void;
  /** Clears the pending expense-month focus after it has been applied. */
  clearExpenseFocus: () => void;
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
  startChallenge: (id: FinancialChallengeId) => Promise<void>;
  dismissRecentAchievement: () => void;
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
  const [challenges, setChallenges] = useState<FinancialChallenge[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [recentAchievement, setRecentAchievement] = useState<UserAchievement | null>(null);
  // One-shot signal asking the Expenses screen to open on a specific month
  // (e.g. after adding an expense whose date is in a past month). Consumed and
  // cleared by the Expenses screen when it next gains focus.
  const [expenseFocus, setExpenseFocusState] = useState<{ month: number; year: number } | null>(null);
  const [customTypes, setCustomTypes] = useState<CustomTypes>(DEFAULT_CUSTOM_TYPES);
  const [isLoading, setIsLoading] = useState(true);
  const suppressAchievementsUntilRef = useRef(0);
  const achievementPopupsReadyRef = useRef(false);

  useEffect(() => {
    async function loadAll() {
      try {
        await runStorageMigrations();
        const [profile, inc, com, payments, exp, ct, lend, gls, gcs, bgs, subs, chs, achs] = await Promise.all([
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
          storage.getChallenges(),
          storage.getAchievements(),
        ]);
        setUserProfile(profile);
        setIncomes(inc);
        setCommitments(com);
        setCommitmentPayments(payments);
        setExpenses(exp);
        setCustomTypes(ct);
        const normalizedLenders = await normalizeLenderImageUris(lend);
        if (normalizedLenders.changed) await storage.saveLenders(normalizedLenders.lenders);
        setLenders(normalizedLenders.lenders);
        setGoals(gls);
        setGoalContributions(gcs);
        setBudgets(bgs);
        setSubscriptions(subs);
        setChallenges(chs);
        setAchievements(achs);
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

  useEffect(() => {
    if (isLoading) return;
    const activeCompleted = getAllChallengeProgress({
      challenges,
      incomes,
      commitments,
      payments: commitmentPayments,
      expenses,
      goalContributions,
    }).filter((progress) => progress.status === 'active' && progress.progressPercent >= 100);

    if (activeCompleted.length === 0) return;

    const completedIds = new Set(activeCompleted.map((progress) => progress.id));
    const now = new Date().toISOString();
    const updated = challenges.map((challenge) => {
      if (!completedIds.has(challenge.id) || challenge.completedAt) return challenge;
      return {
        ...challenge,
        completedAt: now,
        completionCount: (challenge.completionCount ?? 0) + 1,
        updatedAt: now,
      };
    });
    storage.saveChallenges(updated);
    setChallenges(updated);
  }, [isLoading, challenges, incomes, commitments, commitmentPayments, expenses, goalContributions]);

  useEffect(() => {
    if (isLoading) return;
    if (!userProfile) {
      achievementPopupsReadyRef.current = false;
      if (recentAchievement) setRecentAchievement(null);
      return;
    }
    const silent = !achievementPopupsReadyRef.current || Date.now() < suppressAchievementsUntilRef.current;
    const newlyUnlocked = evaluateAchievementUnlocks({
      existing: achievements,
      incomes,
      expenses,
      commitments,
      payments: commitmentPayments,
      goals,
      goalContributions,
      challenges,
    });
    achievementPopupsReadyRef.current = true;
    if (newlyUnlocked.length === 0) return;
    const updated = [...achievements, ...newlyUnlocked];
    storage.saveAchievements(updated);
    setAchievements(updated);
    if (silent) setRecentAchievement(null);
    else setRecentAchievement(newlyUnlocked[0]);
  }, [isLoading, userProfile, achievements, incomes, expenses, commitments, commitmentPayments, goals, goalContributions, challenges, recentAchievement]);

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

  /**
   * Seed N historical "paid" installments for a finite loan, ending with the
   * most recent past due-month before today. Skips months that already have a
   * recorded payment so re-runs don't duplicate. Used when adding a loan that
   * was opened in the past and already has some installments paid.
   */
  const seedPastInstallments = useCallback(async (
    commitmentId: string,
    count: number,
    amount: number,
    dueDay: number,
  ) => {
    if (count <= 0) return;
    const now = new Date();
    const dd = Math.max(1, Math.min(28, dueDay || 1));
    // Most recent fully-elapsed due month = current month if today >= dueDay,
    // otherwise previous month.
    let m = now.getMonth() + 1; // 1..12
    let y = now.getFullYear();
    if (now.getDate() < dd) {
      m -= 1;
      if (m === 0) { m = 12; y -= 1; }
    }
    const additions: CommitmentPayment[] = [];
    let remaining = count;
    while (remaining > 0) {
      const already = commitmentPayments.some(
        (p) => p.commitmentId === commitmentId && p.month === m && p.year === y,
      ) || additions.some((p) => p.month === m && p.year === y);
      if (!already) {
        const paidDate = new Date(y, m - 1, dd, 12, 0, 0, 0).toISOString();
        additions.push({
          id: generateId(), commitmentId, month: m, year: y, amount,
          paidDate, status: 'paid',
        });
        remaining -= 1;
      }
      m -= 1;
      if (m === 0) { m = 12; y -= 1; }
    }
    const updated = [...commitmentPayments, ...additions];
    await storage.saveCommitmentPayments(updated);
    setCommitmentPayments(updated);
  }, [commitmentPayments]);

  const bulkUpdateCommitmentPayments = useCallback(async (
    commitmentId: string,
    periods: { month: number; year: number }[],
    action: 'paid' | 'unpaid' | 'amount',
    amount?: number,
  ) => {
    if (periods.length === 0) return;
    const key = (m: number, y: number) => `${y}-${m}`;
    const set = new Set(periods.map((p) => key(p.month, p.year)));
    let next: CommitmentPayment[];
    if (action === 'unpaid') {
      next = commitmentPayments.filter(
        (p) => !(p.commitmentId === commitmentId && set.has(key(p.month, p.year))),
      );
    } else {
      const markPaid = action === 'paid';
      const paidDate = markPaid ? new Date().toISOString() : undefined;
      const amt = amount ?? 0;
      // Update existing matching, then add records for periods that had none.
      const seen = new Set<string>();
      next = commitmentPayments.map((p) => {
        if (p.commitmentId === commitmentId && set.has(key(p.month, p.year))) {
          seen.add(key(p.month, p.year));
          if (markPaid) {
            return { ...p, status: 'paid' as const, paidDate, amount: amt };
          }
          // amount-only: preserve any existing paidDate but flip status to
          // unpaid and update the amount.
          return { ...p, status: 'unpaid' as const, amount: amt };
        }
        return p;
      });
      for (const period of periods) {
        if (!seen.has(key(period.month, period.year))) {
          next.push({
            id: generateId(), commitmentId,
            month: period.month, year: period.year,
            amount: amt,
            paidDate,
            status: markPaid ? 'paid' : 'unpaid',
          });
        }
      }
    }
    await storage.saveCommitmentPayments(next);
    setCommitmentPayments(next);
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
    return item.id;
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
    // Allow a bank message that was added then deleted to be detected again.
    await unmarkByExpenseId(id);
  }, [expenses]);

  const setExpenseFocus = useCallback((month: number, year: number) => {
    setExpenseFocusState({ month, year });
  }, []);

  const clearExpenseFocus = useCallback(() => setExpenseFocusState(null), []);

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

  const startChallenge = useCallback(async (id: FinancialChallengeId) => {
    const now = new Date().toISOString();
    const existing = challenges.find((challenge) => challenge.id === id);
    let updated: FinancialChallenge[];
    if (existing) {
      updated = challenges.map((challenge) =>
        challenge.id === id
          ? { ...challenge, startedAt: now, completedAt: undefined, updatedAt: now }
          : challenge,
      );
    } else {
      updated = [...challenges, { id, startedAt: now, createdAt: now, updatedAt: now }];
    }
    await storage.saveChallenges(updated);
    setChallenges(updated);
  }, [challenges]);

  const dismissRecentAchievement = useCallback(() => {
    setRecentAchievement(null);
  }, []);

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
    suppressAchievementsUntilRef.current = Date.now() + 2000;
    achievementPopupsReadyRef.current = false;
    setRecentAchievement(null);
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
    setChallenges([]);
    setAchievements([]);
    setRecentAchievement(null);
    setCustomTypes(DEFAULT_CUSTOM_TYPES);
  }, []);

  const loadSampleData = useCallback(async () => {
    suppressAchievementsUntilRef.current = Date.now() + 2000;
    setRecentAchievement(null);
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
    suppressAchievementsUntilRef.current = Date.now() + 2000;
    setRecentAchievement(null);
    await storage.importAll(json);
    const [p, i, c, pay, e, ct, l, gls, gcs, bgs, subs, chs, achs] = await Promise.all([
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
      storage.getChallenges(),
      storage.getAchievements(),
    ]);
    setUserProfile(p);
    setIncomes(i);
    setCommitments(c);
    setCommitmentPayments(pay);
    setExpenses(e);
    setCustomTypes(ct);
    const normalizedLenders = await normalizeLenderImageUris(l);
    if (normalizedLenders.changed) await storage.saveLenders(normalizedLenders.lenders);
    setLenders(normalizedLenders.lenders);
    setGoals(gls);
    setGoalContributions(gcs);
    setBudgets(bgs);
    setSubscriptions(subs);
    setChallenges(chs);
    setAchievements(achs);
    setRecentAchievement(null);
  }, []);

  return (
    <AppContext.Provider value={{
      userProfile, incomes, commitments, commitmentPayments, expenses, lenders,
      goals, goalContributions, budgets, subscriptions, challenges, achievements, recentAchievement,
      customTypes, isLoading,
      saveUserProfile, updateUserProfile,
      addIncome, updateIncome, deleteIncome,
      addCommitment, updateCommitment, deleteCommitment, markCommitmentPaid, markCommitmentUnpaid, seedPastInstallments, bulkUpdateCommitmentPayments,
      addExpense, updateExpense, deleteExpense,
      expenseFocus, setExpenseFocus, clearExpenseFocus,
      addLender, updateLender, deleteLender,
      addGoal, updateGoal, deleteGoal, addGoalContribution, deleteGoalContribution,
      upsertBudget, deleteBudget,
      addSubscription, updateSubscription, deleteSubscription,
      startChallenge, dismissRecentAchievement,
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
