import { Commitment, CommitmentPayment, Expense, MonthlyTotals } from '../types';
import { calculateMonthlyTotals, getCommitmentProgress, getExpensesByCategory, getLateCommitments } from './calculations';
import { formatCurrency, formatMonthYear } from './format';

export type InsightSeverity = 'info' | 'success' | 'warning' | 'danger';

export interface Insight {
  id: string;
  severity: InsightSeverity;
  icon: string;
  title: string;
  message: string;
  cta?: { label: string; route: string };
  // Higher = more important. Used for sort + truncation.
  priority: number;
}

interface InsightArgs {
  totals: MonthlyTotals;
  commitments: Commitment[];
  payments: CommitmentPayment[];
  expenses: Expense[];
  month: number;
  year: number;
  currency: string;
  lang: 'ar' | 'en';
  savingGoal: number;
}

const MILESTONES = [25, 50, 75, 100];

function pickMilestone(pct: number): number | null {
  // Returns the highest milestone reached, else null.
  const reached = MILESTONES.filter((m) => pct >= m);
  return reached.length ? reached[reached.length - 1] : null;
}

function getPreviousMonth(month: number, year: number): { month: number; year: number } {
  if (month === 1) return { month: 12, year: year - 1 };
  return { month: month - 1, year };
}

export function getInsights(args: InsightArgs): Insight[] {
  const { totals, commitments, payments, expenses, month, year, currency, lang, savingGoal } = args;
  const isEn = lang === 'en';
  const out: Insight[] = [];

  // 1) Late commitments — highest priority
  const late = getLateCommitments(commitments, payments);
  if (late.length > 0) {
    const lateAmt = late.reduce((s, c) => s + c.amount, 0);
    out.push({
      id: 'late',
      severity: 'danger',
      icon: 'alert-triangle',
      priority: 100,
      title: isEn ? 'You have overdue commitments' : 'لديك التزامات متأخرة',
      message: isEn
        ? `${late.length} overdue commitment${late.length > 1 ? 's' : ''} totaling ${formatCurrency(lateAmt, currency)} — review now.`
        : `${late.length} ${late.length > 1 ? 'التزامات متأخرة' : 'التزام متأخر'} بقيمة ${formatCurrency(lateAmt, currency)} — راجعها فوراً.`,
      cta: { label: isEn ? 'View commitments' : 'عرض الالتزامات', route: '/commitments' },
    });
  }

  // 2) Upcoming within 7 days (this calendar month only)
  const today = new Date();
  const currentDay = today.getDate();
  const dueSoon = commitments.filter((c) => {
    if (!c.isActive) return false;
    const paid = payments.find(
      (p) => p.commitmentId === c.id && p.month === month && p.year === year && p.status === 'paid',
    );
    if (paid) return false;
    return c.dueDay >= currentDay && c.dueDay <= currentDay + 7;
  });
  if (dueSoon.length > 0) {
    const dueAmt = dueSoon.reduce((s, c) => s + c.amount, 0);
    out.push({
      id: 'upcoming_week',
      severity: 'warning',
      icon: 'clock',
      priority: 80,
      title: isEn ? 'Due this week' : 'مستحقات هذا الأسبوع',
      message: isEn
        ? `${dueSoon.length} commitment${dueSoon.length > 1 ? 's' : ''} totaling ${formatCurrency(dueAmt, currency)} due in the next 7 days.`
        : `${dueSoon.length} ${dueSoon.length > 1 ? 'التزامات' : 'التزام'} بقيمة ${formatCurrency(dueAmt, currency)} تستحق خلال 7 أيام.`,
      cta: { label: isEn ? 'View calendar' : 'عرض التقويم', route: '/calendar' },
    });
  }

  // 3) Loan progress milestones — at most ONE card to avoid crowding out late /
  // upcoming alerts when the user has many finite loans. Prefer a fully paid
  // loan (celebratory), otherwise the loan furthest along.
  const finiteLoans = commitments.filter((c) => c.isActive && c.totalAmount && c.installmentCount);
  const loanCandidates = finiteLoans
    .map((c) => ({ c, prog: getCommitmentProgress(c, payments) }))
    .filter(({ prog }) => pickMilestone(prog.progressPercent) !== null)
    .sort((a, b) => b.prog.progressPercent - a.prog.progressPercent);
  if (loanCandidates.length > 0) {
    const { c, prog } = loanCandidates[0];
    const milestone = pickMilestone(prog.progressPercent)!;
    const isPaidOff = milestone === 100;
    out.push({
      id: `loan_progress_${c.id}_${milestone}`,
      severity: 'success',
      icon: isPaidOff ? 'award' : 'trending-up',
      // Lower than late(100) and upcoming(80) so dashboard reserves slots
      // for actionable items first.
      priority: isPaidOff ? 70 : 30,
      title: isPaidOff
        ? (isEn ? 'Loan paid off!' : 'تم سداد القرض!')
        : (isEn ? 'Repayment progress' : 'تقدم في السداد'),
      message: isEn
        ? (isPaidOff
            ? `Congrats — "${c.title}" is fully paid off.`
            : `You've completed ${milestone}% of "${c.title}". Keep it up!`)
        : (isPaidOff
            ? `مبروك — تم سداد "${c.title}" بالكامل.`
            : `أنجزت ${milestone}٪ من "${c.title}". استمر!`),
      cta: { label: isEn ? 'Loan details' : 'تفاصيل القرض', route: `/commitments/${c.id}` },
    });
  }

  // 4) Top expense category this month
  const byCat = getExpensesByCategory(expenses, month, year);
  const catEntries = Object.entries(byCat);
  if (catEntries.length > 0 && totals.totalExpenses > 0) {
    catEntries.sort((a, b) => b[1] - a[1]);
    const [topCat, topAmt] = catEntries[0];
    const pct = Math.round((topAmt / totals.totalExpenses) * 100);
    // Only surface if the top category is meaningfully dominant.
    if (pct >= 25) {
      out.push({
        id: 'top_category',
        severity: pct >= 50 ? 'warning' : 'info',
        icon: 'pie-chart',
        priority: 40,
        title: isEn ? 'Top spending category' : 'أعلى فئة إنفاق',
        message: isEn
          ? `${topCat} is ${pct}% of your expenses (${formatCurrency(topAmt, currency)}).`
          : `${topCat} تشكل ${pct}٪ من مصاريفك (${formatCurrency(topAmt, currency)}).`,
      });
    }
  }

  // 5) Spending vs previous month
  const prev = getPreviousMonth(month, year);
  // We need the same inputs without the lang-aware totals (totals here is for current month).
  // Recompute prev totals using arrays we already have.
  const prevTotals = calculateMonthlyTotals(
    [], // income not relevant for spend comparison
    commitments,
    payments,
    expenses,
    prev.month,
    prev.year,
    savingGoal,
    lang,
  );
  if (prevTotals.totalExpenses > 0 && totals.totalExpenses > 0) {
    const delta = totals.totalExpenses - prevTotals.totalExpenses;
    const pct = Math.round((delta / prevTotals.totalExpenses) * 100);
    const prevLabel = formatMonthYear(prev.month, prev.year);
    if (pct >= 15) {
      out.push({
        id: 'spending_up',
        severity: 'warning',
        icon: 'trending-up',
        priority: 50,
        title: isEn ? 'Spending is climbing' : 'مصاريفك ترتفع',
        message: isEn
          ? `Expenses are up ${pct}% vs ${prevLabel}.`
          : `مصاريفك زادت ${pct}٪ مقارنة بـ ${prevLabel}.`,
      });
    } else if (pct <= -15) {
      out.push({
        id: 'spending_down',
        severity: 'success',
        icon: 'trending-down',
        priority: 45,
        title: isEn ? 'Spending is easing' : 'مصاريفك تتراجع — أحسنت!',
        message: isEn
          ? `You spent ${Math.abs(pct)}% less than ${prevLabel}. Great job!`
          : `أنفقت ${Math.abs(pct)}٪ أقل من ${prevLabel}. عمل رائع!`,
      });
    }
  }

  // 6) Savings on track (only if there's a goal AND income)
  if (savingGoal > 0 && totals.totalIncome > 0 && totals.remainingAfterCommitments > 0) {
    const possible = totals.remainingAfterCommitments - totals.totalExpenses;
    if (possible >= savingGoal) {
      out.push({
        id: 'savings_on_track',
        severity: 'success',
        icon: 'target',
        priority: 35,
        title: isEn ? 'On track to hit your saving goal' : 'في الطريق لتحقيق هدف الادخار',
        message: isEn
          ? `You're on pace to save ${formatCurrency(possible, currency)} this month — above your ${formatCurrency(savingGoal, currency)} goal.`
          : `أنت في الطريق لادخار ${formatCurrency(possible, currency)} هذا الشهر — أعلى من هدفك ${formatCurrency(savingGoal, currency)}.`,
      });
    }
  }

  // 7) Fallback: healthy + nothing to flag
  if (out.length === 0 && totals.healthStatus === 'ممتاز') {
    out.push({
      id: 'healthy',
      severity: 'success',
      icon: 'check-circle',
      priority: 10,
      title: isEn ? 'Your finances look great' : 'وضعك المالي ممتاز',
      message: isEn
        ? 'Keep tracking your daily spending to maintain this performance.'
        : 'تابع تتبع مصاريفك اليومية للحفاظ على هذا الأداء.',
    });
  }

  out.sort((a, b) => b.priority - a.priority);
  return out;
}
