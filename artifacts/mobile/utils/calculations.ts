import { Income, Commitment, CommitmentPayment, Expense, MonthlyTotals, HealthStatus } from '../types';
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
  const totalCommitments = activeCommitments.reduce((sum, c) => sum + c.amount, 0);

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
