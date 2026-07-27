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

  const activeCommitments = commitments.filter((c) => isCommitmentInMonthlyBudget(c, commitmentPayments));
  const commitmentSum = activeCommitments.reduce((sum, c) => sum + getCommitmentMonthlyShare(c), 0);
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

export function getCommitmentsByCategory(commitments: Commitment[], payments: CommitmentPayment[] = []): Record<string, number> {
  const result: Record<string, number> = {};
  commitments.filter((c) => isCommitmentInMonthlyBudget(c, payments)).forEach((c) => {
    result[c.category] = (result[c.category] ?? 0) + getCommitmentMonthlyShare(c);
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
      if (!isCommitmentInMonthlyBudget(c, payments)) return false;
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
    if (!isCommitmentInMonthlyBudget(c, payments)) return false;
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

export function getCommitmentMonthlyShare(commitment: Commitment): number {
  const personal = commitment.personalShareAmount;
  if (Number.isFinite(personal) && personal !== undefined && personal > 0) return personal;
  const count = Math.max(1, Math.floor(commitment.sharedWithCount ?? 1));
  if (count > 1) return Math.max(0, commitment.amount) / count;
  return Math.max(0, commitment.amount);
}

function getCommitmentTotalShare(commitment: Commitment): number {
  const total = commitment.totalAmount ?? 0;
  const count = Math.max(1, Math.floor(commitment.sharedWithCount ?? 1));
  if (count > 1) return Math.max(0, total) / count;
  return Math.max(0, total);
}

export function getCommitmentProgress(
  commitment: Commitment,
  payments: CommitmentPayment[],
): CommitmentProgress {
  const myPaid = payments.filter((p) => p.commitmentId === commitment.id && p.status === 'paid');
  const paidInstallmentCount = myPaid.length;
  const paidAmount = myPaid.reduce((s, p) => s + p.amount, 0);

  const isFinite = !!(commitment.totalAmount && commitment.installmentCount);
  const totalAmount = getCommitmentTotalShare(commitment);
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

export function isFiniteCommitmentPaidOff(
  commitment: Commitment,
  payments: CommitmentPayment[],
): boolean {
  const progress = getCommitmentProgress(commitment, payments);
  return progress.isFinite && progress.remainingAmount <= 0;
}

export function isOneTimeCommitmentPaid(
  commitment: Commitment,
  payments: CommitmentPayment[],
): boolean {
  if (commitment.kind !== 'one_time') return false;
  return payments.some((p) => p.commitmentId === commitment.id && p.status === 'paid');
}

export function isCommitmentInMonthlyBudget(
  commitment: Commitment,
  payments: CommitmentPayment[],
): boolean {
  if (!commitment.isActive) return false;
  if (isOneTimeCommitmentPaid(commitment, payments)) return false;
  return !isFiniteCommitmentPaidOff(commitment, payments);
}

export function isCommitmentArchived(
  commitment: Commitment,
  payments: CommitmentPayment[],
): boolean {
  return !commitment.isActive ||
    isOneTimeCommitmentPaid(commitment, payments) ||
    isFiniteCommitmentPaidOff(commitment, payments);
}

export function willArchiveCommitmentAfterPaid(
  commitment: Commitment,
  payments: CommitmentPayment[],
  month: number,
  year: number,
  amount: number,
): boolean {
  return willArchiveCommitmentAfterPaidPeriods(commitment, payments, [{ month, year }], amount);
}

export function willArchiveCommitmentAfterPaidPeriods(
  commitment: Commitment,
  payments: CommitmentPayment[],
  periods: { month: number; year: number }[],
  amount: number,
): boolean {
  if (!commitment.isActive) return false;
  const alreadyArchived = isCommitmentArchived(commitment, payments);
  if (alreadyArchived) return false;
  const periodKeys = new Set(periods.map((p) => `${p.year}-${p.month}`));

  const seen = new Set<string>();
  const nextPayments = payments.map((p) => {
    const key = `${p.year}-${p.month}`;
    if (p.commitmentId === commitment.id && periodKeys.has(key)) {
      seen.add(key);
      return { ...p, status: 'paid' as const, amount };
    }
    return p;
  });

  for (const period of periods) {
    const key = `${period.year}-${period.month}`;
    if (!seen.has(key)) {
      nextPayments.push({
        id: `__preview_${key}`,
        commitmentId: commitment.id,
        month: period.month,
        year: period.year,
        amount,
        status: 'paid',
      });
    }
  }

  return isOneTimeCommitmentPaid(commitment, nextPayments) ||
    isFiniteCommitmentPaidOff(commitment, nextPayments);
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
  const active = commitments.filter((c) => isCommitmentInMonthlyBudget(c, payments));
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
      oneTimeTotal += getCommitmentMonthlyShare(commitment);
      oneTimeItems.push({
        id: commitment.id,
        title: commitment.title,
        amount: getCommitmentMonthlyShare(commitment),
        category: commitment.category,
        kind: 'one_time',
      });
    } else {
      monthlyTotal += getCommitmentMonthlyShare(commitment);
      monthlyItems.push({
        id: commitment.id,
        title: commitment.title,
        amount: getCommitmentMonthlyShare(commitment),
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

export type PayoffCapacity = 'tight' | 'balanced' | 'strong';
export type PayoffStrategyKind = 'snowball' | 'cashflow' | 'quickWin';

export interface PayoffDebt {
  id: string;
  title: string;
  category: string;
  monthlyPayment: number;
  remainingAmount: number;
  remainingInstallments: number;
  progressPercent: number;
}

export interface PayoffStrategy {
  kind: PayoffStrategyKind;
  order: PayoffDebt[];
  monthsToDebtFree: number;
  monthsSaved: number;
  finalMonthlyFreed: number;
}

export interface PayoffPlan {
  debts: PayoffDebt[];
  capacity: PayoffCapacity;
  suggestedExtraPayment: number;
  safeBuffer: number;
  freedPaymentFromCompleted: number;
  baselineMonths: number;
  nextFinishedDebt?: PayoffDebt;
  nextTarget?: PayoffDebt;
  strategies: PayoffStrategy[];
}

function uniqueDebts(debts: PayoffDebt[]): PayoffDebt[] {
  const seen = new Set<string>();
  return debts.filter((debt) => {
    if (seen.has(debt.id)) return false;
    seen.add(debt.id);
    return true;
  });
}

function simulatePayoff(
  orderedDebts: PayoffDebt[],
  startingExtraPayment: number,
  completedMonthlyPayment: number,
  baselineMonths: number,
  kind: PayoffStrategyKind,
): PayoffStrategy {
  const remaining = orderedDebts.map((debt) => ({ ...debt }));
  let months = 0;
  let accelerator = startingExtraPayment + completedMonthlyPayment;
  let finalMonthlyFreed = completedMonthlyPayment;

  while (remaining.length > 0 && months < 600) {
    months += 1;
    for (const debt of remaining) {
      debt.remainingAmount = Math.max(0, debt.remainingAmount - debt.monthlyPayment);
    }
    if (remaining[0]) {
      remaining[0].remainingAmount = Math.max(0, remaining[0].remainingAmount - accelerator);
    }
    while (remaining[0] && remaining[0].remainingAmount <= 0) {
      const done = remaining.shift()!;
      accelerator += done.monthlyPayment;
      finalMonthlyFreed += done.monthlyPayment;
    }
  }

  return {
    kind,
    order: orderedDebts,
    monthsToDebtFree: months,
    monthsSaved: Math.max(0, baselineMonths - months),
    finalMonthlyFreed,
  };
}

export function getPayoffPlan(
  commitments: Commitment[],
  payments: CommitmentPayment[],
  totals: MonthlyTotals,
): PayoffPlan {
  const activeFinite = commitments
    .filter((c) => c.isActive)
    .map((commitment) => ({ commitment, progress: getCommitmentProgress(commitment, payments) }))
    .filter(({ progress }) => progress.isFinite);

  const debts = activeFinite
    .filter(({ progress }) => progress.remainingAmount > 0)
    .map(({ commitment, progress }): PayoffDebt => ({
      id: commitment.id,
      title: commitment.title,
      category: commitment.category,
      monthlyPayment: getCommitmentMonthlyShare(commitment),
      remainingAmount: progress.remainingAmount,
      remainingInstallments: progress.remainingInstallments,
      progressPercent: progress.progressPercent,
    }));

  const freedPaymentFromCompleted = activeFinite
    .filter(({ progress }) => progress.remainingAmount <= 0)
    .reduce((sum, { commitment }) => sum + getCommitmentMonthlyShare(commitment), 0);

  const income = Math.max(0, totals.totalIncome);
  const net = Math.max(0, totals.netRemaining);
  const netRatio = income > 0 ? net / income : 0;
  const capacity: PayoffCapacity =
    totals.netRemaining <= 0 || netRatio < 0.08 ? 'tight' :
      netRatio >= 0.25 ? 'strong' :
        'balanced';
  const safeBuffer = income > 0 ? income * 0.05 : 0;
  const extraBase = Math.max(0, net - safeBuffer);
  const suggestedExtraPayment =
    capacity === 'strong' ? extraBase * 0.55 :
      capacity === 'balanced' ? extraBase * 0.35 :
        extraBase * 0.12;
  const baselineMonths = debts.reduce((max, debt) => Math.max(max, debt.remainingInstallments), 0);

  const snowball = [...debts].sort((a, b) => (a.remainingAmount - b.remainingAmount) || (b.monthlyPayment - a.monthlyPayment));
  const cashflow = [...debts].sort((a, b) => (b.monthlyPayment - a.monthlyPayment) || (a.remainingAmount - b.remainingAmount));
  const quickWin = [...debts].sort((a, b) => (a.remainingInstallments - b.remainingInstallments) || (a.remainingAmount - b.remainingAmount));

  return {
    debts,
    capacity,
    suggestedExtraPayment,
    safeBuffer,
    freedPaymentFromCompleted,
    baselineMonths,
    nextFinishedDebt: quickWin[0],
    nextTarget: snowball[0],
    strategies: debts.length > 0
      ? [
          simulatePayoff(uniqueDebts(snowball), suggestedExtraPayment, freedPaymentFromCompleted, baselineMonths, 'snowball'),
          simulatePayoff(uniqueDebts(cashflow), suggestedExtraPayment, freedPaymentFromCompleted, baselineMonths, 'cashflow'),
          simulatePayoff(uniqueDebts(quickWin), suggestedExtraPayment, freedPaymentFromCompleted, baselineMonths, 'quickWin'),
        ]
      : [],
  };
}

export interface SalaryAllocationPlan {
  monthlyIncome: number;
  essentialCommitments: number;
  suggestedSaving: number;
  extraDebtPayment: number;
  plannedExpenses: number;
  spentSoFar: number;
  remainingSpendable: number;
  dailyAvailable: number;
  daysUntilNextSalary: number;
  nextSalaryDate: Date;
  isOverSpendable: boolean;
}

export type WhatIfScenarioKind =
  | 'extraDebtPayment'
  | 'cancelSubscription'
  | 'incomeIncrease'
  | 'newInstallment'
  | 'incomeDecrease'
  | 'payoffCommitment'
  | 'customPlan';

export interface WhatIfSimulationResult {
  scenario: WhatIfScenarioKind;
  amount: number;
  beforeTotals: MonthlyTotals;
  afterTotals: MonthlyTotals;
  beforeAllocation: SalaryAllocationPlan;
  afterAllocation: SalaryAllocationPlan;
  beforeCommitmentPercent: number;
  afterCommitmentPercent: number;
  beforeDailyBudget: number;
  afterDailyBudget: number;
  dailyBudgetDelta: number;
  commitmentPercentDelta: number;
  extraDebtPaymentAfter: number;
}

export interface WhatIfCustomAdjustments {
  incomeIncrease?: number;
  incomeDecrease?: number;
  newInstallment?: number;
  newInstallmentShareCount?: number;
  canceledSubscriptions?: number;
  paidOffCommitments?: number;
  extraDebtPayment?: number;
}

export type CommitmentRiskLevel = 'safe' | 'review' | 'high';

export interface CommitmentImpactAssessment {
  monthlyAmount: number;
  beforeCommitmentPercent: number;
  afterCommitmentPercent: number;
  afterMonthlyRemaining: number;
  beforeDailyBudget: number;
  afterDailyBudget: number;
  dailyBudgetDrop: number;
  savingGoalAtRisk: boolean;
  riskLevel: CommitmentRiskLevel;
}

function getNextSalaryDate(financialMonthStartDay: number, from: Date): Date {
  const preferredDay = Math.max(1, Math.min(31, Math.floor(financialMonthStartDay || 1)));
  const dayForMonth = (year: number, monthIndex: number) => Math.min(preferredDay, new Date(year, monthIndex + 1, 0).getDate());
  let year = from.getFullYear();
  let monthIndex = from.getMonth();
  let targetDay = dayForMonth(year, monthIndex);

  if (from.getDate() >= targetDay) {
    monthIndex += 1;
    const nextMonth = new Date(year, monthIndex, 1);
    year = nextMonth.getFullYear();
    monthIndex = nextMonth.getMonth();
    targetDay = dayForMonth(year, monthIndex);
  }

  return new Date(year, monthIndex, targetDay);
}

export function getSalaryAllocationPlan(
  totals: MonthlyTotals,
  monthlySavingGoal = 0,
  financialMonthStartDay = 1,
  from: Date = new Date(),
): SalaryAllocationPlan {
  const monthlyIncome = Math.max(0, totals.totalIncome);
  const essentialCommitments = Math.max(0, totals.totalCommitments);
  const afterCommitments = Math.max(0, monthlyIncome - essentialCommitments);
  const commitmentRatio = monthlyIncome > 0 ? essentialCommitments / monthlyIncome : 0;

  const savingTarget = monthlySavingGoal > 0 ? monthlySavingGoal : 0;
  const suggestedSaving = Math.min(afterCommitments, Math.max(0, savingTarget));
  const afterSaving = Math.max(0, afterCommitments - suggestedSaving);

  const extraDebtRate =
    commitmentRatio >= 0.7 ? 0.05 :
      commitmentRatio >= 0.5 ? 0.1 :
        commitmentRatio > 0 ? 0.15 :
          0;
  const extraDebtPayment = essentialCommitments > 0 ? afterSaving * extraDebtRate : 0;
  const plannedExpenses = Math.max(0, afterSaving - extraDebtPayment);
  const spentSoFar = Math.max(0, totals.totalExpenses);
  const remainingSpendable = plannedExpenses - spentSoFar;

  const nextSalaryDate = getNextSalaryDate(financialMonthStartDay, from);
  const todayStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const daysUntilNextSalary = Math.max(
    1,
    Math.ceil((nextSalaryDate.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    monthlyIncome,
    essentialCommitments,
    suggestedSaving,
    extraDebtPayment,
    plannedExpenses,
    spentSoFar,
    remainingSpendable,
    dailyAvailable: Math.max(0, remainingSpendable) / daysUntilNextSalary,
    daysUntilNextSalary,
    nextSalaryDate,
    isOverSpendable: remainingSpendable < 0,
  };
}

function buildAdjustedTotals(totals: MonthlyTotals, totalIncome: number, totalCommitments: number): MonthlyTotals {
  const income = Math.max(0, totalIncome);
  const commitmentsTotal = Math.max(0, totalCommitments);
  const totalExpenses = Math.max(0, totals.totalExpenses);
  const netRemaining = income - commitmentsTotal - totalExpenses;
  const commitmentPercent = income > 0 ? (commitmentsTotal / income) * 100 : 0;
  const expensePercent = income > 0 ? (totalExpenses / income) * 100 : 0;
  const remainingAfterCommitments = income - commitmentsTotal;
  const { color: healthColor, status: healthStatus } = getHealthStatus(commitmentPercent);

  return {
    ...totals,
    totalIncome: income,
    totalCommitments: commitmentsTotal,
    totalExpenses,
    netRemaining,
    commitmentPercent,
    expensePercent,
    remainingAfterCommitments,
    suggestedSaving: Math.max(0, netRemaining * 0.2),
    healthStatus,
    healthColor,
  };
}

export function getWhatIfSimulation(
  totals: MonthlyTotals,
  scenario: WhatIfScenarioKind,
  amount: number,
  monthlySavingGoal = 0,
  financialMonthStartDay = 1,
  from: Date = new Date(),
): WhatIfSimulationResult {
  const safeAmount = Math.max(0, amount);
  const beforeAllocation = getSalaryAllocationPlan(totals, monthlySavingGoal, financialMonthStartDay, from);
  let nextIncome = totals.totalIncome;
  let nextCommitments = totals.totalCommitments;
  let additionalExtraDebtPayment = 0;

  if (scenario === 'extraDebtPayment') {
    additionalExtraDebtPayment = safeAmount;
  } else if (scenario === 'cancelSubscription' || scenario === 'payoffCommitment') {
    nextCommitments = Math.max(0, nextCommitments - safeAmount);
  } else if (scenario === 'incomeIncrease') {
    nextIncome += safeAmount;
  } else if (scenario === 'newInstallment') {
    nextCommitments += safeAmount;
  } else if (scenario === 'incomeDecrease') {
    nextIncome = Math.max(0, nextIncome - safeAmount);
  }

  const afterTotals = buildAdjustedTotals(totals, nextIncome, nextCommitments);
  const calculatedAfterAllocation = getSalaryAllocationPlan(afterTotals, monthlySavingGoal, financialMonthStartDay, from);
  const afterRemainingSpendable = calculatedAfterAllocation.remainingSpendable - additionalExtraDebtPayment;
  const afterDailyBudget = Math.max(0, afterRemainingSpendable) / calculatedAfterAllocation.daysUntilNextSalary;
  const afterAllocation: SalaryAllocationPlan = {
    ...calculatedAfterAllocation,
    extraDebtPayment: calculatedAfterAllocation.extraDebtPayment + additionalExtraDebtPayment,
    plannedExpenses: Math.max(0, calculatedAfterAllocation.plannedExpenses - additionalExtraDebtPayment),
    remainingSpendable: afterRemainingSpendable,
    dailyAvailable: afterDailyBudget,
    isOverSpendable: afterRemainingSpendable < 0,
  };

  return {
    scenario,
    amount: safeAmount,
    beforeTotals: totals,
    afterTotals,
    beforeAllocation,
    afterAllocation,
    beforeCommitmentPercent: totals.commitmentPercent,
    afterCommitmentPercent: afterTotals.commitmentPercent,
    beforeDailyBudget: beforeAllocation.dailyAvailable,
    afterDailyBudget,
    dailyBudgetDelta: afterDailyBudget - beforeAllocation.dailyAvailable,
    commitmentPercentDelta: afterTotals.commitmentPercent - totals.commitmentPercent,
    extraDebtPaymentAfter: afterAllocation.extraDebtPayment,
  };
}

export function getCustomWhatIfSimulation(
  totals: MonthlyTotals,
  adjustments: WhatIfCustomAdjustments,
  monthlySavingGoal = 0,
  financialMonthStartDay = 1,
  from: Date = new Date(),
): WhatIfSimulationResult {
  const beforeAllocation = getSalaryAllocationPlan(totals, monthlySavingGoal, financialMonthStartDay, from);
  const newInstallment = Math.max(0, adjustments.newInstallment ?? 0);
  const shareCount = Math.max(1, Math.floor(adjustments.newInstallmentShareCount ?? 1));
  const newInstallmentShare = newInstallment / shareCount;
  const nextIncome = Math.max(
    0,
    totals.totalIncome + Math.max(0, adjustments.incomeIncrease ?? 0) - Math.max(0, adjustments.incomeDecrease ?? 0),
  );
  const nextCommitments = Math.max(
    0,
    totals.totalCommitments
      + newInstallmentShare
      - Math.max(0, adjustments.canceledSubscriptions ?? 0)
      - Math.max(0, adjustments.paidOffCommitments ?? 0),
  );
  const additionalExtraDebtPayment = Math.max(0, adjustments.extraDebtPayment ?? 0);
  const afterTotals = buildAdjustedTotals(totals, nextIncome, nextCommitments);
  const calculatedAfterAllocation = getSalaryAllocationPlan(afterTotals, monthlySavingGoal, financialMonthStartDay, from);
  const afterRemainingSpendable = calculatedAfterAllocation.remainingSpendable - additionalExtraDebtPayment;
  const afterDailyBudget = Math.max(0, afterRemainingSpendable) / calculatedAfterAllocation.daysUntilNextSalary;
  const afterAllocation: SalaryAllocationPlan = {
    ...calculatedAfterAllocation,
    extraDebtPayment: calculatedAfterAllocation.extraDebtPayment + additionalExtraDebtPayment,
    plannedExpenses: Math.max(0, calculatedAfterAllocation.plannedExpenses - additionalExtraDebtPayment),
    remainingSpendable: afterRemainingSpendable,
    dailyAvailable: afterDailyBudget,
    isOverSpendable: afterRemainingSpendable < 0,
  };

  return {
    scenario: 'customPlan',
    amount: Math.abs(nextIncome - totals.totalIncome) + Math.abs(nextCommitments - totals.totalCommitments) + additionalExtraDebtPayment,
    beforeTotals: totals,
    afterTotals,
    beforeAllocation,
    afterAllocation,
    beforeCommitmentPercent: totals.commitmentPercent,
    afterCommitmentPercent: afterTotals.commitmentPercent,
    beforeDailyBudget: beforeAllocation.dailyAvailable,
    afterDailyBudget,
    dailyBudgetDelta: afterDailyBudget - beforeAllocation.dailyAvailable,
    commitmentPercentDelta: afterTotals.commitmentPercent - totals.commitmentPercent,
    extraDebtPaymentAfter: afterAllocation.extraDebtPayment,
  };
}

export function getCommitmentImpactAssessment(
  totals: MonthlyTotals,
  newMonthlyAmount: number,
  currentMonthlyAmount = 0,
  monthlySavingGoal = 0,
  financialMonthStartDay = 1,
  from: Date = new Date(),
): CommitmentImpactAssessment {
  const safeNewAmount = Math.max(0, newMonthlyAmount);
  const safeCurrentAmount = Math.max(0, currentMonthlyAmount);
  const beforeAllocation = getSalaryAllocationPlan(totals, monthlySavingGoal, financialMonthStartDay, from);
  const afterCommitments = Math.max(0, totals.totalCommitments - safeCurrentAmount + safeNewAmount);
  const afterTotals = buildAdjustedTotals(totals, totals.totalIncome, afterCommitments);
  const afterAllocation = getSalaryAllocationPlan(afterTotals, monthlySavingGoal, financialMonthStartDay, from);
  const dailyBudgetDrop = Math.max(0, beforeAllocation.dailyAvailable - afterAllocation.dailyAvailable);
  const savingGoalAtRisk = monthlySavingGoal > 0 && afterTotals.netRemaining < monthlySavingGoal;

  let riskLevel: CommitmentRiskLevel = 'safe';
  if (
    afterTotals.commitmentPercent >= 70 ||
    afterTotals.netRemaining < 0 ||
    (monthlySavingGoal > 0 && savingGoalAtRisk && afterTotals.commitmentPercent >= 55)
  ) {
    riskLevel = 'high';
  } else if (
    afterTotals.commitmentPercent >= 50 ||
    savingGoalAtRisk ||
    dailyBudgetDrop >= Math.max(25, beforeAllocation.dailyAvailable * 0.2)
  ) {
    riskLevel = 'review';
  }

  return {
    monthlyAmount: safeNewAmount,
    beforeCommitmentPercent: totals.commitmentPercent,
    afterCommitmentPercent: afterTotals.commitmentPercent,
    afterMonthlyRemaining: afterTotals.netRemaining,
    beforeDailyBudget: beforeAllocation.dailyAvailable,
    afterDailyBudget: afterAllocation.dailyAvailable,
    dailyBudgetDrop,
    savingGoalAtRisk,
    riskLevel,
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
  const monthlyTotal = active.reduce((s, c) => s + getCommitmentMonthlyShare(c), 0);

  // Only finite loans contribute to contracted/paid/remaining totals — mixing
  // open-ended recurring bills would inflate "paid" and break the math.
  let totalContracted = 0;
  let totalPaid = 0;
  for (const c of linked) {
    if (!c.totalAmount || !c.installmentCount) continue;
    totalContracted += getCommitmentTotalShare(c);
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
