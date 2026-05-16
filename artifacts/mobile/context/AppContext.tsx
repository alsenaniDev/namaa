import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { UserProfile, Income, Commitment, CommitmentPayment, Expense } from '../types';
import { storage } from '../utils/storage';
import { generateId, getCurrentMonthYear } from '../utils/format';
import { generateSampleData } from '../utils/sampleData';
import { calculateMonthlyTotals, MonthlyTotals } from '../utils/calculations';

interface AppContextType {
  userProfile: UserProfile | null;
  incomes: Income[];
  commitments: Commitment[];
  commitmentPayments: CommitmentPayment[];
  expenses: Expense[];
  isLoading: boolean;
  saveUserProfile: (profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  addIncome: (income: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateIncome: (id: string, income: Partial<Income>) => Promise<void>;
  deleteIncome: (id: string) => Promise<void>;
  addCommitment: (commitment: Omit<Commitment, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCommitment: (id: string, commitment: Partial<Commitment>) => Promise<void>;
  deleteCommitment: (id: string) => Promise<void>;
  markCommitmentPaid: (commitmentId: string, month: number, year: number, amount: number) => Promise<void>;
  markCommitmentUnpaid: (commitmentId: string, month: number, year: number) => Promise<void>;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  clearAllData: () => Promise<void>;
  loadSampleData: () => Promise<void>;
  getMonthlyTotals: (month: number, year: number) => MonthlyTotals;
  exportData: () => Promise<string>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [commitmentPayments, setCommitmentPayments] = useState<CommitmentPayment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAll() {
      try {
        const [profile, inc, com, payments, exp] = await Promise.all([
          storage.getUserProfile(),
          storage.getIncomes(),
          storage.getCommitments(),
          storage.getCommitmentPayments(),
          storage.getExpenses(),
        ]);
        setUserProfile(profile);
        setIncomes(inc);
        setCommitments(com);
        setCommitmentPayments(payments);
        setExpenses(exp);
      } finally {
        setIsLoading(false);
      }
    }
    loadAll();
  }, []);

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

  const clearAllData = useCallback(async () => {
    await storage.clearAll();
    setUserProfile(null);
    setIncomes([]);
    setCommitments([]);
    setCommitmentPayments([]);
    setExpenses([]);
  }, []);

  const loadSampleData = useCallback(async () => {
    const { incomes: si, commitments: sc, commitmentPayments: sp, expenses: se } = generateSampleData();
    const newIncomes = [...incomes, ...si];
    const newCommitments = [...commitments, ...sc];
    const newPayments = [...commitmentPayments, ...sp];
    const newExpenses = [...expenses, ...se];
    await Promise.all([
      storage.saveIncomes(newIncomes),
      storage.saveCommitments(newCommitments),
      storage.saveCommitmentPayments(newPayments),
      storage.saveExpenses(newExpenses),
    ]);
    setIncomes(newIncomes);
    setCommitments(newCommitments);
    setCommitmentPayments(newPayments);
    setExpenses(newExpenses);
  }, [incomes, commitments, commitmentPayments, expenses]);

  const getMonthlyTotals = useCallback((month: number, year: number): MonthlyTotals => {
    return calculateMonthlyTotals(
      incomes, commitments, commitmentPayments, expenses, month, year,
      userProfile?.monthlySavingGoal ?? 0,
    );
  }, [incomes, commitments, commitmentPayments, expenses, userProfile]);

  const exportData = useCallback(() => storage.exportAll(), []);

  return (
    <AppContext.Provider value={{
      userProfile, incomes, commitments, commitmentPayments, expenses, isLoading,
      saveUserProfile, updateUserProfile,
      addIncome, updateIncome, deleteIncome,
      addCommitment, updateCommitment, deleteCommitment, markCommitmentPaid, markCommitmentUnpaid,
      addExpense, updateExpense, deleteExpense,
      clearAllData, loadSampleData, getMonthlyTotals, exportData,
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
