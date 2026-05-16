import { Income, Commitment, CommitmentPayment, Expense, MonthlyTotals, HealthStatus } from '../types';

export function getHealthStatus(commitmentPercent: number): { status: HealthStatus; color: string; message: string } {
  if (commitmentPercent < 30) {
    return { status: 'ممتاز', color: '#10B981', message: 'وضعك المالي ممتاز. الالتزامات في نطاق صحي جداً.' };
  } else if (commitmentPercent < 50) {
    return { status: 'متوسط', color: '#F59E0B', message: 'وضعك المالي متوسط. حاول تقليل الالتزامات تدريجياً.' };
  } else if (commitmentPercent < 70) {
    return { status: 'خطر', color: '#EF4444', message: 'الالتزامات مرتفعة. ننصح بمراجعة وتقليل المصاريف الثابتة.' };
  } else {
    return { status: 'حرج جدًا', color: '#DC2626', message: 'وضع حرج جداً! الالتزامات تتجاوز 70% من الدخل. راجع ميزانيتك فوراً.' };
  }
}

export function getFinancialTip(totals: MonthlyTotals): string {
  const { commitmentPercent, netRemaining, suggestedSaving, totalExpenses, totalIncome } = totals;
  if (commitmentPercent > 70) {
    return 'يُنصح بمراجعة الالتزامات الشهرية وتقليلها إن أمكن. حاول إعادة التفاوض على القروض أو تقليل الاشتراكات غير الضرورية.';
  }
  if (netRemaining < 0) {
    return 'المصاريف تتجاوز الدخل هذا الشهر. راجع بنود الإنفاق وحدد العناصر التي يمكن تخفيضها.';
  }
  if (suggestedSaving > 0 && netRemaining > suggestedSaving * 2) {
    return `لديك فرصة ممتازة للادخار. حاول توفير ${Math.round(suggestedSaving)} من دخلك شهرياً وضعه في حساب ادخار منفصل.`;
  }
  if (totalExpenses > totalIncome * 0.4) {
    return 'المصاريف المتغيرة مرتفعة نسبياً. حاول تحديد أبواب الإنفاق غير الضروري وتقليصها.';
  }
  return 'تتبع إنفاقك اليومي يساعدك على اتخاذ قرارات مالية أفضل. حاول تسجيل كل مصروف فور حدوثه.';
}

export function calculateMonthlyTotals(
  incomes: Income[],
  commitments: Commitment[],
  commitmentPayments: CommitmentPayment[],
  expenses: Expense[],
  month: number,
  year: number,
  savingGoal: number = 0,
): MonthlyTotals {
  const totalIncome = incomes.reduce((sum, i) => {
    if (!i.isRecurring && i.receivedDate) {
      const d = new Date(i.receivedDate);
      if (d.getMonth() + 1 === month && d.getFullYear() === year) {
        return sum + i.amount;
      }
      return sum;
    }
    return sum + i.amount;
  }, 0);

  const activeCommitments = commitments.filter((c) => c.isActive);
  const totalCommitments = activeCommitments.reduce((sum, c) => sum + c.amount, 0);

  const monthExpenses = expenses.filter((e) => {
    const d = new Date(e.expenseDate);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const netRemaining = totalIncome - totalCommitments - totalExpenses;
  const commitmentPercent = totalIncome > 0 ? (totalCommitments / totalIncome) * 100 : 0;
  const expensePercent = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;
  const remainingAfterCommitments = totalIncome - totalCommitments;

  const { color: healthColor, status: healthStatus } = getHealthStatus(commitmentPercent);

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
      const d = new Date(e.expenseDate);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
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
