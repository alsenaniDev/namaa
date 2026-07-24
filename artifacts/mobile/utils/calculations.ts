import {
  Income, Commitment, CommitmentPayment, Expense, MonthlyTotals, HealthStatus,
  Subscription, SavingsGoal, GoalContribution, CategoryBudget,
} from '../types';
import { parseDateLocal } from './format';

export function getHealthStatus(commitmentPercent: number, lang = 'ar'): { status: HealthStatus; color: string; message: string } {
  const isEn = lang === 'en';
  if (commitmentPercent < 30) {
    return {
      status: 'ممتاز',
      color: '#10B981',
      message: isEn
        ? 'Your finances are in excellent shape. Commitments are in a very healthy range.'
        : 'وضعك المالي ممتاز. الالتزامات في نطاق صحي جداً.',
    };
  } else if (commitmentPercent < 50) {
    return {
      status: 'متوسط',
      color: '#F59E0B',
      message: isEn
        ? 'Your finances are average. Try to gradually reduce your commitments.'
        : 'وضعك المالي متوسط. حاول تقليل الالتزامات تدريجياً.',
    };
  } else if (commitmentPercent < 70) {
    return {
      status: 'خطر',
      color: '#EF4444',
      message: isEn
        ? 'Commitments are high. We recommend reviewing and reducing fixed expenses.'
        : 'الالتزامات مرتفعة. ننصح بمراجعة وتقليل المصاريف الثابتة.',
    };
  } else {
    return {
      status: 'حرج جدًا',
      color: '#DC2626',
      message: isEn
        ? 'Critical situation! Commitments exceed 70% of income. Review your budget immediately.'
        : 'وضع حرج جداً! الالتزامات تتجاوز 70% من الدخل. راجع ميزانيتك فوراً.',
    };
  }
}

export function getFinancialTip(totals: MonthlyTotals, lang = 'ar'): string {
  const { commitmentPercent, netRemaining, suggestedSaving, totalExpenses, totalIncome } = totals;
  const isEn = lang === 'en';

  if (commitmentPercent > 70) {
    return isEn
      ? 'Consider reviewing and reducing your monthly commitments if possible. Try renegotiating loans or cancelling unnecessary subscriptions.'
      : 'يُنصح بمراجعة الالتزامات الشهرية وتقليلها إن أمكن. حاول إعادة التفاوض على القروض أو تقليل الاشتراكات غير الضرورية.';
  }
  if (netRemaining < 0) {
    return isEn
      ? 'Expenses exceed income this month. Review your spending and identify items that can be reduced.'
      : 'المصاريف تتجاوز الدخل هذا الشهر. راجع بنود الإنفاق وحدد العناصر التي يمكن تخفيضها.';
  }
  if (suggestedSaving > 0 && netRemaining > suggestedSaving * 2) {
    return isEn
      ? `You have a great opportunity to save. Try setting aside ${Math.round(suggestedSaving)} from your monthly income in a separate savings account.`
      : `لديك فرصة ممتازة للادخار. حاول توفير ${Math.round(suggestedSaving)} من دخلك شهرياً وضعه في حساب ادخار منفصل.`;
  }
  if (totalExpenses > totalIncome * 0.4) {
    return isEn
      ? 'Variable expenses are relatively high. Try to identify unnecessary spending and cut back.'
      : 'المصاريف المتغيرة مرتفعة نسبياً. حاول تحديد أبواب الإنفاق غير الضروري وتقليصها.';
  }
  return isEn
    ? 'Tracking your daily spending helps you make better financial decisions. Try to record every expense as soon as it happens.'
    : 'تتبع إنفاقك اليومي يساعدك على اتخاذ قرارات مالية أفضل. حاول تسجيل كل مصروف فور حدوثه.';
}

export function calculateMonthlyTotals(
  incomes: Income[],
  commitments: Commitment[],
  commitmentPayments: CommitmentPayment[],
  expenses: Expense[],
  month: number,
  year: number,
  savingGoal: number = 0,
  lang = 'ar',
  subscriptions: Subscription[] = [],
): MonthlyTotals {
  const totalIncome = incomes.reduce((sum, i) => {
    if (!i.isRecurring && i.receivedDate) {
      const d = parseDateLocal(i.receivedDate);
      if (d && d.getMonth() + 1 === month && d.getFullYear() === year) {
        return sum + i.amount;
      }
      return sum;
    }
    return sum + i.amount;
  }, 0);

  const activeCommitments = commitments.filter((c) => c.isActive);
  const commitmentSum = activeCommitments.reduce((sum, c) => sum + c.amount, 0);
  // Subscriptions roll into the committed-outflow line — yearly/quarterly/weekly
  // are normalized to a monthly equivalent so the budget bar reflects reality.
  const subscriptionMonthly = getMonthlySubscriptionTotal(subscriptions);
  const totalCommitments = commitmentSum + subscriptionMonthly;

  const monthExpenses = expenses.filter((e) => {
    const d = parseDateLocal(e.expenseDate);
    return !!d && d.getMonth() + 1 === month && d.getFullYear() === year;
  });
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const netRemaining = totalIncome - totalCommitments - totalExpenses;
  const commitmentPercent = totalIncome > 0 ? (totalCommitments / totalIncome) * 100 : 0;
  const expensePercent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const remainingAfterCommitments = totalIncome - totalCommitments;

  const { color: healthColor, status: healthStatus } = getHealthStatus(commitmentPercent, lang);

  const suggestedSaving = savingGoal > 0 ? savingGoal : Math.max(0, netRemaining * 0.2);

  return {
    totalIncome,
    totalCommitments,
    totalExpenses,
    netRemaining,
    commitmentPercent,
    expensePercent,
    suggestedSaving,
    healthStatus,
    healthColor,
    remainingAfterCommitments,
  };
}

export function getExpensesByCategory(expenses: Expense[], month: number, year: number): Record<string, number> {
  const result: Record<string, number> = {};
  expenses
    .filter((e) => {
      const d = parseDateLocal(e.expenseDate);
      return !!d && d.getMonth() + 1 === month && d.getFullYear() === year;
    })
    .forEach((e) => {
      result[e.category] = (result[e.category] ?? 0) + e.amount;
    });
  return result;
}

export function getCommitmentsByCategory(commitments: Commitment[]): Record<string, number> {
  const result: Record<string, number> = {};
  commitments.filter((c) => c.isActive).forEach((c) => {
    result[c.category] = (result[c.category] ?? 0) + c.amount;
  });
  return result;
}

export function getUpcomingCommitments(commitments: Commitment[], payments: CommitmentPayment[]): Commitment[] {
  const today = new Date();
  const currentDay = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  return commitments
    .filter((c) => {
      if (!c.isActive) return false;
      const payment = payments.find(
        (p) => p.commitmentId === c.id && p.month === month && p.year === year,
      );
      if (payment?.status === 'paid') return false;
      return c.dueDay >= currentDay;
    })
    .sort((a, b) => a.dueDay - b.dueDay);
}

export function getLateCommitments(commitments: Commitment[], payments: CommitmentPayment[]): Commitment[] {
  const today = new Date();
  const currentDay = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  return commitments.filter((c) => {
    if (!c.isActive) return false;
    const payment = payments.find(
      (p) => p.commitmentId === c.id && p.month === month && p.year === year,
    );
    if (payment?.status === 'paid') return false;
    return c.dueDay < currentDay;
  });
}

// ─── Commitment progress (finite loans) ──────────────────────────────────────

export interface CommitmentProgress {
  isFinite: boolean;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentCount: number;
  paidInstallmentCount: number;
  remainingInstallments: number;
  progressPercent: number; // 0..100
}

export function getCommitmentProgress(
  commitment: Commitment,
  payments: CommitmentPayment[],
): CommitmentProgress {
  const myPaid = payments.filter((p) => p.commitmentId === commitment.id && p.status === 'paid');
  const paidInstallmentCount = myPaid.length;
  const paidAmount = myPaid.reduce((s, p) => s + p.amount, 0);

  const isFinite = !!(commitment.totalAmount && commitment.installmentCount);
  const totalAmount = commitment.totalAmount ?? 0;
  const installmentCount = commitment.installmentCount ?? 0;
  const remainingAmount = isFinite ? Math.max(0, totalAmount - paidAmount) : 0;
  const remainingInstallments = isFinite ? Math.max(0, installmentCount - paidInstallmentCount) : 0;
  const progressPercent = isFinite && totalAmount > 0
    ? Math.min(100, (paidAmount / totalAmount) * 100)
    : 0;

  return {
    isFinite,
    totalAmount,
    paidAmount,
    remainingAmount,
    installmentCount,
    paidInstallmentCount,
    remainingInstallments,
    progressPercent,
  };
}

export interface CommitmentsOverviewItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  kind: 'finite_loan' | 'one_time' | 'recurring_bill';
  paidAmount?: number;
  totalAmount?: number;
  remainingInstallments?: number;
}

export interface CommitmentsOverview {
  totalOwed: number;
  finiteRemaining: number;
  oneTimeTotal: number;
  monthlyTotal: number;
  remainingInstallments: number;
  progressPercent: number;
  activeCount: number;
  finiteItems: CommitmentsOverviewItem[];
  oneTimeItems: CommitmentsOverviewItem[];
  monthlyItems: CommitmentsOverviewItem[];
}

export function getCommitmentsOverview(
  commitments: Commitment[],
  payments: CommitmentPayment[],
): CommitmentsOverview {
  const active = commitments.filter((c) => c.isActive);
  const finiteItems: CommitmentsOverviewItem[] = [];
  const oneTimeItems: CommitmentsOverviewItem[] = [];
  const monthlyItems: CommitmentsOverviewItem[] = [];

  let finiteTotal = 0;
  let finitePaid = 0;
  let finiteRemaining = 0;
  let oneTimeTotal = 0;
  let monthlyTotal = 0;
  let remainingInstallments = 0;

  for (const commitment of active) {
    const progress = getCommitmentProgress(commitment, payments);
    if (progress.isFinite) {
      finiteTotal += progress.totalAmount;
      finitePaid += progress.paidAmount;
      finiteRemaining += progress.remainingAmount;
      remainingInstallments += progress.remainingInstallments;
      finiteItems.push({
        id: commitment.id,
        title: commitment.title,
        amount: progress.remainingAmount,
        category: commitment.category,
        kind: 'finite_loan',
        paidAmount: progress.paidAmount,
        totalAmount: progress.totalAmount,
        remainingInstallments: progress.remainingInstallments,
      });
    } else if (commitment.kind === 'one_time') {
      oneTimeTotal += commitment.amount;
      oneTimeItems.push({
        id: commitment.id,
        title: commitment.title,
        amount: commitment.amount,
        category: commitment.category,
        kind: 'one_time',
      });
    } else {
      monthlyTotal += commitment.amount;
      monthlyItems.push({
        id: commitment.id,
        title: commitment.title,
        amount: commitment.amount,
        category: commitment.category,
        kind: 'recurring_bill',
      });
    }
  }

  return {
    totalOwed: finiteRemaining + oneTimeTotal,
    finiteRemaining,
    oneTimeTotal,
    monthlyTotal,
    remainingInstallments,
    progressPercent: finiteTotal > 0 ? Math.min(100, (finitePaid / finiteTotal) * 100) : 0,
    activeCount: active.length,
    finiteItems: finiteItems.sort((a, b) => b.amount - a.amount),
    oneTimeItems: oneTimeItems.sort((a, b) => b.amount - a.amount),
    monthlyItems: monthlyItems.sort((a, b) => b.amount - a.amount),
  };
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

/** Normalize a single subscription's cost to a monthly equivalent. */
export function getSubscriptionMonthlyEquivalent(s: Subscription): number {
  switch (s.cycle) {
    case 'monthly': return s.amount;
    case 'yearly': return s.amount / 12;
    case 'quarterly': return s.amount / 3;
    // 52 weeks / 12 months ≈ 4.333 — gives a stable monthly view of a weekly charge.
    case 'weekly': return (s.amount * 52) / 12;
    default: return s.amount;
  }
}

export function getSubscriptionYearlyEquivalent(s: Subscription): number {
  switch (s.cycle) {
    case 'monthly': return s.amount * 12;
    case 'yearly': return s.amount;
    case 'quarterly': return s.amount * 4;
    case 'weekly': return s.amount * 52;
    default: return s.amount * 12;
  }
}

export function getMonthlySubscriptionTotal(subs: Subscription[]): number {
  return subs
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + getSubscriptionMonthlyEquivalent(s), 0);
}

export function getYearlySubscriptionTotal(subs: Subscription[]): number {
  return subs
    .filter((s) => s.isActive)
    .reduce((sum, s) => sum + getSubscriptionYearlyEquivalent(s), 0);
}

/**
 * Roll a subscription's nextRenewalDate forward until it is strictly greater
 * than `from`. Stops eventually because each cycle adds time.
 */
export function advanceRenewalDate(currentDate: string, cycle: Subscription['cycle'], from: Date = new Date()): string {
  const d = parseDateLocal(currentDate);
  if (!d) return currentDate;
  while (d <= from) {
    if (cycle === 'monthly') d.setMonth(d.getMonth() + 1);
    else if (cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
    else if (cycle === 'quarterly') d.setMonth(d.getMonth() + 3);
    else if (cycle === 'weekly') d.setDate(d.getDate() + 7);
    else break;
  }
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysUntil(dateStr: string, from: Date = new Date()): number {
  const d = parseDateLocal(dateStr);
  if (!d) return Infinity;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Savings Goals ───────────────────────────────────────────────────────────

export interface GoalProgress {
  saved: number;
  remaining: number;
  percent: number; // 0..100
  isCompleted: boolean;
  /** Months until target date (rounded up), or null if no target date. */
  monthsUntilTarget: number | null;
  /** Suggested monthly contribution to hit target on time. */
  suggestedMonthly: number | null;
}

export function getGoalProgress(goal: SavingsGoal, contributions: GoalContribution[]): GoalProgress {
  const contribSum = contributions
    .filter((c) => c.goalId === goal.id)
    .reduce((s, c) => s + c.amount, 0);
  // currentAmount (manual baseline) + contributions
  const saved = Math.max(0, goal.currentAmount + contribSum);
  const target = Math.max(1, goal.targetAmount);
  const percent = Math.min(100, (saved / target) * 100);
  const remaining = Math.max(0, goal.targetAmount - saved);
  const isCompleted = goal.isCompleted || saved >= goal.targetAmount;

  let monthsUntilTarget: number | null = null;
  let suggestedMonthly: number | null = null;
  const td = parseDateLocal(goal.targetDate);
  if (td) {
    const now = new Date();
    const months = (td.getFullYear() - now.getFullYear()) * 12 + (td.getMonth() - now.getMonth());
    monthsUntilTarget = Math.max(0, months);
    if (monthsUntilTarget > 0 && remaining > 0) {
      suggestedMonthly = remaining / monthsUntilTarget;
    }
  }

  return { saved, remaining, percent, isCompleted, monthsUntilTarget, suggestedMonthly };
}

// ─── Category Budgets ────────────────────────────────────────────────────────

export interface BudgetUsage {
  category: string;
  limit: number;
  spent: number;
  percent: number; // 0..∞ (can exceed 100)
  remaining: number; // may be negative when over budget
  status: 'safe' | 'warning' | 'over';
}

export function getBudgetUsages(
  budgets: CategoryBudget[],
  expenses: Expense[],
  month: number,
  year: number,
): BudgetUsage[] {
  const byCat = getExpensesByCategory(expenses, month, year);
  return budgets.map((b) => {
    const spent = byCat[b.category] ?? 0;
    const limit = Math.max(0, b.monthlyLimit);
    const percent = limit > 0 ? (spent / limit) * 100 : 0;
    const remaining = limit - spent;
    let status: BudgetUsage['status'] = 'safe';
    if (percent >= 100) status = 'over';
    else if (percent >= 80) status = 'warning';
    return { category: b.category, limit, spent, percent, remaining, status };
  });
}

// ─── Lender stats ────────────────────────────────────────────────────────────

export interface LenderStats {
  activeCommitmentCount: number;
  monthlyTotal: number;
  totalContracted: number; // sum of totalAmount for finite loans
  totalPaid: number;       // sum of paid payments across linked commitments
  totalRemaining: number;  // totalContracted - totalPaid (only for finite loans)
}

export function getLenderStats(
  lenderId: string,
  commitments: Commitment[],
  payments: CommitmentPayment[],
): LenderStats {
  const linked = commitments.filter((c) => c.lenderId === lenderId);
  const active = linked.filter((c) => c.isActive);
  const monthlyTotal = active.reduce((s, c) => s + c.amount, 0);

  // Only finite loans contribute to contracted/paid/remaining totals — mixing
  // open-ended recurring bills would inflate "paid" and break the math.
  let totalContracted = 0;
  let totalPaid = 0;
  for (const c of linked) {
    if (!c.totalAmount || !c.installmentCount) continue;
    totalContracted += c.totalAmount;
    const paid = payments
      .filter((p) => p.commitmentId === c.id && p.status === 'paid')
      .reduce((s, p) => s + p.amount, 0);
    totalPaid += paid;
  }
  const totalRemaining = Math.max(0, totalContracted - totalPaid);
  return {
    activeCommitmentCount: active.length,
    monthlyTotal,
    totalContracted,
    totalPaid,
    totalRemaining,
  };
}
