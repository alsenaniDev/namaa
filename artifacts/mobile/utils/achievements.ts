import {
  AchievementId,
  Commitment,
  CommitmentPayment,
  Expense,
  FinancialChallenge,
  GoalContribution,
  Income,
  SavingsGoal,
  UserAchievement,
} from '@/types';
import { getCommitmentProgress } from './calculations';
import { parseDateLocal } from './format';
import { getBudgetConsistencyDays } from './financialChallenges';

export interface AchievementMeta {
  id: AchievementId;
  icon: string;
  color: string;
  title: string;
  description: string;
}

export const ACHIEVEMENT_IDS: AchievementId[] = [
  'firstIncome',
  'firstExpense',
  'firstCommitment',
  'beginnerSaver',
  'proSaver',
  'firstCommitmentPaid',
  'debtWarrior',
  'consistentBudget30',
  'budgetExpert90',
  'firstChallenge',
  'challengeHero',
];

function isReal<T extends { isSample?: boolean }>(item: T): boolean {
  return !item.isSample;
}

export function getAchievementMeta(id: AchievementId, lang: string = 'ar'): AchievementMeta {
  const en = lang === 'en';
  const items: Record<AchievementId, AchievementMeta> = {
    firstIncome: {
      id,
      icon: 'trending-up',
      color: '#10B981',
      title: en ? 'First Income' : 'أول دخل',
      description: en ? 'Unlocked after recording your first income.' : 'يفتح عند تسجيل أول دخل.',
    },
    firstExpense: {
      id,
      icon: 'shopping-bag',
      color: '#F59E0B',
      title: en ? 'First Expense' : 'أول مصروف',
      description: en ? 'Unlocked after recording your first expense.' : 'يفتح عند تسجيل أول مصروف.',
    },
    firstCommitment: {
      id,
      icon: 'credit-card',
      color: '#3B82F6',
      title: en ? 'First Commitment' : 'أول التزام',
      description: en ? 'Unlocked after adding your first commitment.' : 'يفتح عند إضافة أول التزام.',
    },
    beginnerSaver: {
      id,
      icon: 'award',
      color: '#14B8A6',
      title: en ? 'Beginner Saver' : 'مدخر مبتدئ',
      description: en ? 'Reach 1,000 in recorded savings.' : 'عند الوصول إلى 1000 ريال ادخار.',
    },
    proSaver: {
      id,
      icon: 'star',
      color: '#8B5CF6',
      title: en ? 'Pro Saver' : 'مدخر محترف',
      description: en ? 'Reach 10,000 in recorded savings.' : 'عند الوصول إلى 10000 ريال ادخار.',
    },
    firstCommitmentPaid: {
      id,
      icon: 'check-circle',
      color: '#059669',
      title: en ? 'First Paid Off Commitment' : 'سداد أول التزام',
      description: en ? 'Fully finish your first finite commitment.' : 'عند إنهاء أول التزام بالكامل.',
    },
    debtWarrior: {
      id,
      icon: 'shield',
      color: '#2563EB',
      title: en ? 'Debt Warrior' : 'محارب الديون',
      description: en ? 'Fully finish 5 commitments.' : 'عند إنهاء 5 التزامات.',
    },
    consistentBudget30: {
      id,
      icon: 'calendar',
      color: '#0EA5E9',
      title: en ? 'Consistent' : 'ملتزم',
      description: en ? 'Stay within budget for 30 days.' : 'عدم تجاوز الميزانية لمدة 30 يوماً.',
    },
    budgetExpert90: {
      id,
      icon: 'pie-chart',
      color: '#6366F1',
      title: en ? 'Budget Expert' : 'خبير الميزانية',
      description: en ? 'Stay within budget for 90 days.' : 'الالتزام بالميزانية لمدة 90 يوماً.',
    },
    firstChallenge: {
      id,
      icon: 'flag',
      color: '#EC4899',
      title: en ? 'First Challenge' : 'أول تحدي',
      description: en ? 'Complete your first financial challenge.' : 'عند إنهاء أول تحدٍ مالي.',
    },
    challengeHero: {
      id,
      icon: 'zap',
      color: '#F97316',
      title: en ? 'Challenge Hero' : 'بطل التحديات',
      description: en ? 'Complete 10 financial challenges.' : 'عند إنهاء 10 تحديات.',
    },
  };
  return items[id];
}

function totalSaved(goals: SavingsGoal[], contributions: GoalContribution[]): number {
  const realGoalBaseline = goals
    .filter(isReal)
    .reduce((sum, goal) => sum + Math.max(0, goal.currentAmount), 0);
  const realContributions = contributions
    .filter(isReal)
    .reduce((sum, contribution) => sum + contribution.amount, 0);
  return realGoalBaseline + realContributions;
}

function finishedCommitments(commitments: Commitment[], payments: CommitmentPayment[]): number {
  const realPayments = payments.filter(isReal);
  return commitments.filter(isReal).filter((commitment) => {
    const progress = getCommitmentProgress(commitment, realPayments);
    return progress.isFinite && progress.remainingAmount <= 0;
  }).length;
}

function completedChallenges(challenges: FinancialChallenge[]): number {
  return challenges.reduce((sum, challenge) => {
    if (challenge.completionCount && challenge.completionCount > 0) return sum + challenge.completionCount;
    return sum + (challenge.completedAt ? 1 : 0);
  }, 0);
}

export function evaluateAchievementUnlocks({
  existing,
  incomes,
  expenses,
  commitments,
  payments,
  goals,
  goalContributions,
  challenges,
}: {
  existing: UserAchievement[];
  incomes: Income[];
  expenses: Expense[];
  commitments: Commitment[];
  payments: CommitmentPayment[];
  goals: SavingsGoal[];
  goalContributions: GoalContribution[];
  challenges: FinancialChallenge[];
}): UserAchievement[] {
  const unlocked = new Set(existing.map((item) => item.id));
  const newlyUnlocked: UserAchievement[] = [];
  const realIncomes = incomes.filter(isReal);
  const realExpenses = expenses.filter(isReal);
  const realCommitments = commitments.filter(isReal);
  const realPayments = payments.filter(isReal);
  const saveTotal = totalSaved(goals, goalContributions);
  const paidOff = finishedCommitments(commitments, payments);
  const challengeDone = completedChallenges(challenges);
  const budgetDays = getBudgetConsistencyDays({
    incomes: realIncomes,
    commitments: realCommitments,
    payments: realPayments,
    expenses: realExpenses,
  });

  const maybeAdd = (id: AchievementId, condition: boolean) => {
    if (!condition || unlocked.has(id)) return;
    unlocked.add(id);
    newlyUnlocked.push({ id, unlockedAt: new Date().toISOString() });
  };

  maybeAdd('firstIncome', realIncomes.length > 0);
  maybeAdd('firstExpense', realExpenses.length > 0);
  maybeAdd('firstCommitment', realCommitments.length > 0);
  maybeAdd('beginnerSaver', saveTotal >= 1000);
  maybeAdd('proSaver', saveTotal >= 10000);
  maybeAdd('firstCommitmentPaid', paidOff >= 1);
  maybeAdd('debtWarrior', paidOff >= 5);
  maybeAdd('consistentBudget30', budgetDays >= 30);
  maybeAdd('budgetExpert90', budgetDays >= 90);
  maybeAdd('firstChallenge', challengeDone >= 1);
  maybeAdd('challengeHero', challengeDone >= 10);

  return newlyUnlocked;
}

export function formatAchievementDate(value?: string): string {
  const d = parseDateLocal(value);
  if (!d) return '';
  return d.toLocaleDateString('ar-SA-u-ca-gregory', { year: 'numeric', month: 'short', day: 'numeric' });
}
