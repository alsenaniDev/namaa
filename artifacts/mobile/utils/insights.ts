import {
  Commitment, CommitmentPayment, Expense, MonthlyTotals,
  SavingsGoal, GoalContribution, CategoryBudget, Subscription,
} from '../types';
import {
  calculateMonthlyTotals, getCommitmentProgress, getExpensesByCategory,
  getLateCommitments, getBudgetUsages, getGoalProgress, daysUntil,
  isCommitmentInMonthlyBudget, getCommitmentMonthlyShare,
} from './calculations';
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
  goals?: SavingsGoal[];
  goalContributions?: GoalContribution[];
  budgets?: CategoryBudget[];
  subscriptions?: Subscription[];
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

function dueInLabel(days: number, day: number, isEn: boolean): string {
  if (isEn) {
    if (days === 0) return `today, day ${day}`;
    if (days === 1) return `tomorrow, day ${day}`;
    return `in ${days} days, day ${day}`;
  }
  if (days === 0) return `اليوم، يوم ${day}`;
  if (days === 1) return `غداً، يوم ${day}`;
  if (days === 2) return `بعد يومين، يوم ${day}`;
  return `بعد ${days} أيام، يوم ${day}`;
}

export function getInsights(args: InsightArgs): Insight[] {
  const {
    totals, commitments, payments, expenses, month, year, currency, lang, savingGoal,
    goals = [], goalContributions = [], budgets = [], subscriptions = [],
  } = args;
  const isEn = lang === 'en';
  const out: Insight[] = [];

  // 1) Late commitments — highest priority
  const late = getLateCommitments(commitments, payments);
  if (late.length > 0) {
    const lateAmt = late.reduce((s, c) => s + getCommitmentMonthlyShare(c), 0);
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
    if (!isCommitmentInMonthlyBudget(c, payments)) return false;
    const paid = payments.find(
      (p) => p.commitmentId === c.id && p.month === month && p.year === year && p.status === 'paid',
    );
    if (paid) return false;
    return c.dueDay >= currentDay && c.dueDay <= currentDay + 7;
  });
  if (dueSoon.length > 0) {
    const dueAmt = dueSoon.reduce((s, c) => s + getCommitmentMonthlyShare(c), 0);
    const nearestDueDay = dueSoon.reduce((nearest, c) => Math.min(nearest, c.dueDay), Infinity);
    const nearestDueIn = nearestDueDay - currentDay;
    const nearestLabel = dueInLabel(nearestDueIn, nearestDueDay, isEn);
    out.push({
      id: 'upcoming_week',
      severity: 'warning',
      icon: 'clock',
      priority: 80,
      title: isEn ? 'Due this week' : 'مستحقات هذا الأسبوع',
      message: isEn
        ? `${dueSoon.length} commitment${dueSoon.length > 1 ? 's' : ''} totaling ${formatCurrency(dueAmt, currency)} due in the next 7 days. Nearest: ${nearestLabel}.`
        : `${dueSoon.length} ${dueSoon.length > 1 ? 'التزامات' : 'التزام'} بقيمة ${formatCurrency(dueAmt, currency)} تستحق خلال الأيام السبعة القادمة. أقربها ${nearestLabel}.`,
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

  // 7) Budget overruns — surface up to TWO worst offenders (one card each).
  const usages = getBudgetUsages(budgets, expenses, month, year)
    .filter((u) => u.limit > 0 && u.percent >= 80)
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 2);
  for (const u of usages) {
    const over = u.percent >= 100;
    out.push({
      id: `budget_${u.category}`,
      severity: over ? 'danger' : 'warning',
      icon: over ? 'alert-octagon' : 'alert-circle',
      // Over-budget is actionable now → close to late. Warning sits below upcoming.
      priority: over ? 95 : 75,
      title: over
        ? (isEn ? 'Budget exceeded' : 'تجاوزت ميزانية الفئة')
        : (isEn ? 'Budget almost spent' : 'اقتربت من حد الميزانية'),
      message: isEn
        ? `${u.category}: ${formatCurrency(u.spent, currency)} of ${formatCurrency(u.limit, currency)} (${Math.round(u.percent)}%).`
        : `${u.category}: ${formatCurrency(u.spent, currency)} من ${formatCurrency(u.limit, currency)} (${Math.round(u.percent)}٪).`,
      cta: { label: isEn ? 'Manage budgets' : 'إدارة الميزانيات', route: '/budgets' },
    });
  }

  // 8) Subscriptions renewing soon (within 5 days, active only). One combined card.
  const dueSoonSubs = subscriptions
    .filter((s) => s.isActive)
    .map((s) => ({ s, days: daysUntil(s.nextRenewalDate) }))
    .filter(({ days }) => days >= 0 && days <= 5)
    .sort((a, b) => a.days - b.days);
  if (dueSoonSubs.length > 0) {
    const first = dueSoonSubs[0];
    const more = dueSoonSubs.length - 1;
    out.push({
      id: 'subs_renewing',
      severity: 'info',
      icon: 'repeat',
      priority: 55,
      title: isEn ? 'Subscription renewing soon' : 'اشتراك يتجدد قريباً',
      message: isEn
        ? `"${first.s.name}" renews in ${first.days} day${first.days === 1 ? '' : 's'} (${formatCurrency(first.s.amount, currency)})${more > 0 ? ` and ${more} other${more > 1 ? 's' : ''}.` : '.'}`
        : `"${first.s.name}" يتجدد خلال ${first.days} ${first.days === 1 ? 'يوم' : 'أيام'} (${formatCurrency(first.s.amount, currency)})${more > 0 ? ` و${more} اشتراك${more > 1 ? 'ات' : ''} آخر.` : '.'}`,
      cta: { label: isEn ? 'View subscriptions' : 'عرض الاشتراكات', route: '/subscriptions' },
    });
  }

  // 9) Goal milestone — pick the goal closest to completion (≥50%, not yet done).
  if (goals.length > 0) {
    const goalScored = goals
      .filter((g) => !g.isCompleted)
      .map((g) => ({ g, prog: getGoalProgress(g, goalContributions) }))
      .filter(({ prog }) => prog.percent >= 50 && !prog.isCompleted)
      .sort((a, b) => b.prog.percent - a.prog.percent);
    if (goalScored.length > 0) {
      const { g, prog } = goalScored[0];
      out.push({
        id: `goal_${g.id}`,
        severity: 'success',
        icon: 'flag',
        priority: 25,
        title: isEn ? 'Goal milestone' : 'إنجاز في هدفك',
        message: isEn
          ? `"${g.name}" is ${Math.round(prog.percent)}% funded — only ${formatCurrency(prog.remaining, currency)} to go.`
          : `"${g.name}" أنجزت ${Math.round(prog.percent)}٪ — تبقى ${formatCurrency(prog.remaining, currency)} فقط.`,
        cta: { label: isEn ? 'Goal details' : 'تفاصيل الهدف', route: `/goals/${g.id}` },
      });
    }
    // Celebrate any newly-completed (still flagged) goal
    const completedNotFlagged = goals
      .map((g) => ({ g, prog: getGoalProgress(g, goalContributions) }))
      .find(({ g, prog }) => prog.isCompleted && !g.isCompleted);
    if (completedNotFlagged) {
      const { g } = completedNotFlagged;
      out.push({
        id: `goal_done_${g.id}`,
        severity: 'success',
        icon: 'award',
        priority: 85,
        title: isEn ? 'Goal reached!' : 'حققت هدفك!',
        message: isEn
          ? `Congrats — "${g.name}" is fully funded.`
          : `مبروك — تم تمويل "${g.name}" بالكامل.`,
        cta: { label: isEn ? 'View goal' : 'عرض الهدف', route: `/goals/${g.id}` },
      });
    }
  }

  // 10) Fallback: healthy + nothing to flag
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
