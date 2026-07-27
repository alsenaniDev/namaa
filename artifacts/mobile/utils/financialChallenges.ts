import {
  Commitment,
  CommitmentPayment,
  Expense,
  FinancialChallenge,
  FinancialChallengeId,
  FinancialChallengeStatus,
  GoalContribution,
  Income,
} from '@/types';
import { calculateMonthlyTotals } from './calculations';
import { parseDateLocal } from './format';
import { toLocalDateKey } from './salaryCountdown';

export interface ChallengeDefinition {
  id: FinancialChallengeId;
  icon: string;
  color: string;
  durationDays: number;
  title: string;
  description: string;
  shortDescription: string;
}

export interface ChallengeProgress {
  id: FinancialChallengeId;
  definition: ChallengeDefinition;
  status: FinancialChallengeStatus;
  progressPercent: number;
  daysRemaining: number;
  startedAt?: string;
  completedAt?: string;
  metricLabel: string;
}

export const CHALLENGE_IDS: FinancialChallengeId[] = [
  'noRestaurants7',
  'save1000Month',
  'budget30',
  'reduceLuxuries20',
  'extraDebt500',
];

export function getChallengeDefinition(id: FinancialChallengeId, lang: string = 'ar'): ChallengeDefinition {
  const en = lang === 'en';
  const defs: Record<FinancialChallengeId, ChallengeDefinition> = {
    noRestaurants7: {
      id,
      icon: 'coffee',
      color: '#F97316',
      durationDays: 7,
      title: en ? 'No Restaurants for 7 Days' : 'عدم الشراء من مطاعم لمدة 7 أيام',
      description: en ? 'A successful day has no expense in the restaurant category.' : 'يعتبر اليوم ناجحاً إذا لم يتم تسجيل أي مصروف من تصنيف المطاعم.',
      shortDescription: en ? 'Avoid restaurant spending.' : 'تجنب مصاريف المطاعم.',
    },
    save1000Month: {
      id,
      icon: 'target',
      color: '#10B981',
      durationDays: 30,
      title: en ? 'Save 1,000 This Month' : 'ادخار 1000 ريال خلال هذا الشهر',
      description: en ? 'Progress uses savings goal contributions recorded this month.' : 'يعتمد التقدم على مساهمات أهداف الادخار المسجلة هذا الشهر.',
      shortDescription: en ? 'Build savings steadily.' : 'ارفع ادخارك تدريجياً.',
    },
    budget30: {
      id,
      icon: 'calendar',
      color: '#3B82F6',
      durationDays: 30,
      title: en ? 'Stay on Budget for 30 Days' : 'الالتزام بالميزانية لمدة 30 يوماً',
      description: en ? 'Progress grows on days where daily spending stays within the calculated limit.' : 'يزيد التقدم في الأيام التي لا يتجاوز فيها الصرف الحد اليومي المحسوب.',
      shortDescription: en ? 'Keep daily spending controlled.' : 'حافظ على حدك اليومي.',
    },
    reduceLuxuries20: {
      id,
      icon: 'scissors',
      color: '#8B5CF6',
      durationDays: 30,
      title: en ? 'Reduce Luxuries by 20%' : 'تقليل مصاريف الكماليات بنسبة 20%',
      description: en ? 'Compares this month’s luxuries with the previous month.' : 'يقارن مصاريف الكماليات لهذا الشهر مع الشهر السابق.',
      shortDescription: en ? 'Spend less on luxuries.' : 'خفف مصاريف الكماليات.',
    },
    extraDebt500: {
      id,
      icon: 'zap',
      color: '#EC4899',
      durationDays: 30,
      title: en ? 'Pay 500 Extra to a Commitment' : 'دفع مبلغ إضافي 500 ريال لأحد الالتزامات',
      description: en ? 'Counts paid installments whose amount exceeds the original installment.' : 'يُحتسب من عمليات السداد المسجلة بمبلغ أعلى من القسط الأصلي.',
      shortDescription: en ? 'Accelerate debt payoff.' : 'سرّع سداد التزاماتك.',
    },
  };
  return defs[id];
}

function daysBetween(start: Date, end: Date): number {
  const a = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const b = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return Math.max(0, Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1);
}

function currentMonthRange(from: Date = new Date()): { month: number; year: number; daysInMonth: number; day: number } {
  return {
    month: from.getMonth() + 1,
    year: from.getFullYear(),
    daysInMonth: new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate(),
    day: from.getDate(),
  };
}

function timestampFromDateFields(dateValue?: string, createdAt?: string): number {
  const created = createdAt ? new Date(createdAt).getTime() : NaN;
  if (Number.isFinite(created)) return created;
  const d = parseDateLocal(dateValue);
  return d ? d.getTime() : 0;
}

function sumExpensesByCategory(
  expenses: Expense[],
  categories: string[],
  month: number,
  year: number,
  startedAt?: string,
): number {
  const startMs = startedAt ? new Date(startedAt).getTime() : 0;
  return expenses.reduce((sum, expense) => {
    const d = parseDateLocal(expense.expenseDate);
    if (!d || d.getMonth() + 1 !== month || d.getFullYear() !== year) return sum;
    if (startMs > 0 && timestampFromDateFields(expense.expenseDate, expense.createdAt) < startMs) return sum;
    return categories.includes(expense.category) ? sum + expense.amount : sum;
  }, 0);
}

function monthlySavingContributions(
  contributions: GoalContribution[],
  month: number,
  year: number,
  startedAt?: string,
): number {
  const startMs = startedAt ? new Date(startedAt).getTime() : 0;
  return contributions.reduce((sum, contribution) => {
    const d = parseDateLocal(contribution.date);
    if (!d || d.getMonth() + 1 !== month || d.getFullYear() !== year) return sum;
    if (startMs > 0 && timestampFromDateFields(contribution.date, contribution.createdAt) < startMs) return sum;
    return sum + contribution.amount;
  }, 0);
}

function extraDebtPaid(challenge: FinancialChallenge, commitments: Commitment[], payments: CommitmentPayment[]): number {
  const started = challenge.startedAt ? new Date(challenge.startedAt).getTime() : 0;
  return payments.reduce((sum, payment) => {
    if (payment.status !== 'paid') return sum;
    const paidAt = payment.paidDate ? new Date(payment.paidDate).getTime() : 0;
    if (paidAt < started) return sum;
    const commitment = commitments.find((item) => item.id === payment.commitmentId);
    const baseAmount = commitment?.amount ?? payment.amount;
    return sum + Math.max(0, payment.amount - baseAmount);
  }, 0);
}

function noRestaurantProgress(challenge: FinancialChallenge, expenses: Expense[], from: Date): { percent: number; label: string } {
  if (!challenge.startedAt) return { percent: 0, label: '0 / 7 أيام' };
  const start = parseDateLocal(challenge.startedAt) ?? new Date(challenge.startedAt);
  const elapsed = Math.min(7, daysBetween(start, from));
  let successful = 0;
  for (let i = 0; i < elapsed; i += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const key = toLocalDateKey(day);
    const hasRestaurant = expenses.some((expense) => {
      const d = parseDateLocal(expense.expenseDate);
      return expense.category === 'مطاعم' && d && toLocalDateKey(d) === key;
    });
    if (!hasRestaurant) successful += 1;
  }
  return { percent: Math.min(100, (successful / 7) * 100), label: `${successful} / 7 أيام` };
}

export function getBudgetConsistencyDays({
  incomes,
  commitments,
  payments,
  expenses,
  maxDays = 90,
  from = new Date(),
}: {
  incomes: Income[];
  commitments: Commitment[];
  payments: CommitmentPayment[];
  expenses: Expense[];
  maxDays?: number;
  from?: Date;
}): number {
  let streak = 0;
  for (let i = 0; i < maxDays; i += 1) {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() - i);
    const totals = calculateMonthlyTotals(incomes, commitments, payments, expenses, day.getMonth() + 1, day.getFullYear());
    const dailyLimit = Math.max(0, totals.remainingAfterCommitments) / Math.max(1, new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate());
    const key = toLocalDateKey(day);
    const spent = expenses
      .filter((expense) => {
        const d = parseDateLocal(expense.expenseDate);
        return d ? toLocalDateKey(d) === key : false;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    if (spent > dailyLimit && spent > 0) break;
    streak += 1;
  }
  return streak;
}

function getBudgetConsistencyDaysFromStart({
  incomes,
  commitments,
  payments,
  expenses,
  start,
  durationDays,
  from = new Date(),
}: {
  incomes: Income[];
  commitments: Commitment[];
  payments: CommitmentPayment[];
  expenses: Expense[];
  start: Date;
  durationDays: number;
  from?: Date;
}): number {
  const elapsed = Math.min(durationDays, daysBetween(start, from));
  let successful = 0;
  for (let i = 0; i < elapsed; i += 1) {
    const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const totals = calculateMonthlyTotals(incomes, commitments, payments, expenses, day.getMonth() + 1, day.getFullYear());
    const dailyLimit = Math.max(0, totals.remainingAfterCommitments) / Math.max(1, new Date(day.getFullYear(), day.getMonth() + 1, 0).getDate());
    const key = toLocalDateKey(day);
    const spent = expenses
      .filter((expense) => {
        const d = parseDateLocal(expense.expenseDate);
        return d ? toLocalDateKey(d) === key : false;
      })
      .reduce((sum, expense) => sum + expense.amount, 0);
    if (spent > dailyLimit && spent > 0) break;
    successful += 1;
  }
  return successful;
}

export function getChallengeProgress({
  challenge,
  incomes,
  commitments,
  payments,
  expenses,
  goalContributions,
  lang = 'ar',
  from = new Date(),
}: {
  challenge?: FinancialChallenge;
  id?: FinancialChallengeId;
  incomes: Income[];
  commitments: Commitment[];
  payments: CommitmentPayment[];
  expenses: Expense[];
  goalContributions: GoalContribution[];
  lang?: string;
  from?: Date;
}): ChallengeProgress {
  const id = challenge?.id ?? 'noRestaurants7';
  const definition = getChallengeDefinition(id, lang);
  const startedAt = challenge?.startedAt;
  const completedAt = challenge?.completedAt;
  const status: FinancialChallengeStatus = completedAt ? 'completed' : startedAt ? 'active' : 'not_started';
  const startDate = startedAt ? (parseDateLocal(startedAt) ?? new Date(startedAt)) : from;
  const elapsedDays = startedAt ? daysBetween(startDate, from) : 0;
  const activeElapsedDays = status === 'active' ? Math.min(definition.durationDays, elapsedDays) : elapsedDays;
  const daysRemaining = status === 'completed'
    ? 0
    : Math.max(0, definition.durationDays - elapsedDays);

  let percent = 0;
  let metricLabel = '0٪';
  const range = currentMonthRange(from);

  if (id === 'noRestaurants7') {
    const result = noRestaurantProgress(challenge ?? { id, createdAt: '', updatedAt: '' }, expenses, from);
    percent = result.percent;
    metricLabel = result.label;
  } else if (id === 'save1000Month') {
    const saved = monthlySavingContributions(goalContributions, range.month, range.year, startedAt);
    percent = Math.min(100, (saved / 1000) * 100);
    metricLabel = `${Math.round(saved)} / 1000`;
  } else if (id === 'budget30') {
    const days = startedAt
      ? getBudgetConsistencyDaysFromStart({ incomes, commitments, payments, expenses, start: startDate, durationDays: 30, from })
      : 0;
    percent = Math.min(100, (days / 30) * 100);
    metricLabel = `${days} / 30 أيام`;
  } else if (id === 'reduceLuxuries20') {
    const luxuryCategories = ['تسوق', 'ترفيه', 'سفر', 'قهوة'];
    const prev = new Date(from.getFullYear(), from.getMonth() - 1, 1);
    const previous = sumExpensesByCategory(expenses, luxuryCategories, prev.getMonth() + 1, prev.getFullYear());
    const current = sumExpensesByCategory(expenses, luxuryCategories, range.month, range.year, startedAt);
    const previousDaily = previous / Math.max(1, new Date(prev.getFullYear(), prev.getMonth() + 1, 0).getDate());
    const targetDaily = previousDaily * 0.8;
    const target = targetDaily * Math.max(1, activeElapsedDays);
    if (previous <= 0) {
      percent = current <= 0 ? (activeElapsedDays / definition.durationDays) * 100 : 0;
    } else {
      const timeProgress = (activeElapsedDays / definition.durationDays) * 100;
      const spendingFactor = current <= target ? 1 : Math.max(0, target / Math.max(1, current));
      percent = Math.min(100, timeProgress * spendingFactor);
    }
    metricLabel = `${Math.round(current)} / ${Math.round(target)}`;
  } else if (id === 'extraDebt500') {
    const extra = extraDebtPaid(challenge ?? { id, createdAt: '', updatedAt: '' }, commitments, payments);
    percent = Math.min(100, (extra / 500) * 100);
    metricLabel = `${Math.round(extra)} / 500`;
  }

  return {
    id,
    definition,
    status,
    progressPercent: status === 'completed' ? 100 : Math.round(percent),
    daysRemaining,
    startedAt,
    completedAt,
    metricLabel,
  };
}

export function getAllChallengeProgress(args: Omit<Parameters<typeof getChallengeProgress>[0], 'challenge'> & { challenges: FinancialChallenge[] }): ChallengeProgress[] {
  return CHALLENGE_IDS.map((id) => {
    const existing = args.challenges.find((item) => item.id === id);
    return getChallengeProgress({ ...args, challenge: existing ?? { id, createdAt: '', updatedAt: '' } });
  });
}
