import { Expense, MonthlyTotals } from '@/types';
import { parseDateLocal } from './format';

export interface SalaryCountdown {
  daysRemaining: number;
  nextSalaryDate: Date;
  isSalaryDay: boolean;
  currentBalance: number;
  dailyLimit: number;
  todayExpenses: number;
  dailyDelta: number;
  isOverDailyLimit: boolean;
}

function dayForMonth(preferredDay: number, year: number, monthIndex: number): number {
  return Math.min(preferredDay, new Date(year, monthIndex + 1, 0).getDate());
}

function getNextSalaryDateInfo(financialMonthStartDay: number, from: Date): { date: Date; isToday: boolean } {
  const preferredDay = Math.max(1, Math.min(31, Math.floor(financialMonthStartDay || 1)));
  const todayStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const currentMonthDay = dayForMonth(preferredDay, from.getFullYear(), from.getMonth());
  const currentMonthDate = new Date(from.getFullYear(), from.getMonth(), currentMonthDay);

  if (todayStart.getTime() === currentMonthDate.getTime()) {
    return { date: currentMonthDate, isToday: true };
  }

  if (todayStart.getTime() < currentMonthDate.getTime()) {
    return { date: currentMonthDate, isToday: false };
  }

  const nextMonthSeed = new Date(from.getFullYear(), from.getMonth() + 1, 1);
  const nextMonthDay = dayForMonth(preferredDay, nextMonthSeed.getFullYear(), nextMonthSeed.getMonth());
  return {
    date: new Date(nextMonthSeed.getFullYear(), nextMonthSeed.getMonth(), nextMonthDay),
    isToday: false,
  };
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSalaryCountdown(
  totals: MonthlyTotals,
  expenses: Expense[],
  financialMonthStartDay: number,
  from: Date = new Date(),
): SalaryCountdown {
  const todayStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const next = getNextSalaryDateInfo(financialMonthStartDay, from);
  const rawDays = Math.ceil((next.date.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = next.isToday ? 0 : Math.max(0, rawDays);
  const currentBalance = totals.netRemaining;
  const divisor = Math.max(1, daysRemaining);
  const dailyLimit = Math.max(0, currentBalance) / divisor;
  const todayKey = toLocalDateKey(todayStart);
  const todayExpenses = expenses
    .filter((expense) => {
      const d = parseDateLocal(expense.expenseDate);
      return d ? toLocalDateKey(d) === todayKey : false;
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
  const dailyDelta = todayExpenses - dailyLimit;

  return {
    daysRemaining,
    nextSalaryDate: next.date,
    isSalaryDay: next.isToday,
    currentBalance,
    dailyLimit,
    todayExpenses,
    dailyDelta,
    isOverDailyLimit: dailyDelta > 0,
  };
}
