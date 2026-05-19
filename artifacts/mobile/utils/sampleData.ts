import {
  Income, Commitment, CommitmentPayment, Expense, Lender, LENDER_COLOR_PALETTE,
  SavingsGoal, GoalContribution, CategoryBudget, Subscription, GOAL_COLOR_PALETTE,
} from '../types';
import { generateId } from './format';

export function generateSampleData(): {
  incomes: Income[];
  commitments: Commitment[];
  commitmentPayments: CommitmentPayment[];
  expenses: Expense[];
  lenders: Lender[];
  goals: SavingsGoal[];
  goalContributions: GoalContribution[];
  budgets: CategoryBudget[];
  subscriptions: Subscription[];
} {
  const now = new Date().toISOString();
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const ym = `${year}-${String(month).padStart(2, '0')}`;

  const lenders: Lender[] = [
    {
      id: generateId(),
      name: 'البنك الأهلي السعودي',
      type: 'bank',
      color: LENDER_COLOR_PALETTE[0],
      paymentMethod: 'auto_debit',
      bankName: 'البنك الأهلي',
      iban: 'SA00 8000 0000 0000 0000 0000',
      notes: 'قرض السيارة',
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'شركة الاتصالات السعودية',
      type: 'telecom',
      color: LENDER_COLOR_PALETTE[2],
      paymentMethod: 'auto_debit',
      website: 'stc.com.sa',
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'الشركة السعودية للكهرباء',
      type: 'utility',
      color: LENDER_COLOR_PALETTE[3],
      paymentMethod: 'bank_transfer',
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'أبو سامي - مالك العقار',
      type: 'landlord',
      color: LENDER_COLOR_PALETTE[4],
      paymentMethod: 'bank_transfer',
      phone: '05XXXXXXXX',
      createdAt: now, updatedAt: now,
    },
  ];

  const [bankLender, telecomLender, electricLender, landlordLender] = lenders;

  const incomes: Income[] = [
    {
      id: generateId(),
      title: 'الراتب الشهري',
      amount: 12000,
      type: 'راتب',
      isRecurring: true,
      receivedDay: 1,
      notes: 'الراتب الأساسي',
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      title: 'عمل حر',
      amount: 2500,
      type: 'عمل إضافي',
      isRecurring: false,
      receivedDay: 15,
      receivedDate: `${ym}-15`,
      notes: 'مشروع تصميم',
      createdAt: now, updatedAt: now,
    },
  ];

  const commitments: Commitment[] = [
    {
      id: generateId(),
      title: 'إيجار الشقة',
      category: 'إيجار',
      kind: 'recurring_bill',
      lenderId: landlordLender.id,
      amount: 3000,
      dueDay: 1,
      isRecurring: true,
      isActive: true,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      title: 'قرض السيارة',
      category: 'قرض سيارة',
      kind: 'finite_loan',
      lenderId: bankLender.id,
      amount: 1500,
      totalAmount: 72000,
      installmentCount: 48,
      dueDay: 10,
      isRecurring: true,
      isActive: true,
      startDate: `${year - 1}-01-10`,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      title: 'فاتورة الكهرباء',
      category: 'كهرباء',
      kind: 'recurring_bill',
      lenderId: electricLender.id,
      amount: 300,
      dueDay: 20,
      isRecurring: true,
      isActive: true,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      title: 'اشتراك الإنترنت',
      category: 'إنترنت',
      kind: 'recurring_bill',
      lenderId: telecomLender.id,
      amount: 200,
      dueDay: 5,
      isRecurring: true,
      isActive: true,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      title: 'تأمين صحي',
      category: 'تأمين',
      kind: 'recurring_bill',
      amount: 400,
      dueDay: 15,
      isRecurring: true,
      isActive: true,
      createdAt: now, updatedAt: now,
    },
  ];

  const carLoan = commitments[1];
  const carHistory: CommitmentPayment[] = [];
  for (let i = 0; i < 16; i++) {
    const d = new Date(year, month - 1 - i - 1, 10);
    carHistory.push({
      id: generateId(),
      commitmentId: carLoan.id,
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      amount: 1500,
      paidDate: d.toISOString(),
      status: 'paid',
    });
  }

  const paidCommitmentId = commitments[0].id;
  const commitmentPayments: CommitmentPayment[] = [
    {
      id: generateId(),
      commitmentId: paidCommitmentId,
      month, year,
      amount: 3000,
      paidDate: `${ym}-01`,
      status: 'paid',
    },
    ...carHistory,
  ];

  const dates = [3, 5, 7, 10, 12, 14, 16, 18];
  const expenseData = [
    { title: 'غداء في المطعم', category: 'مطاعم' as const, amount: 120 },
    { title: 'قهوة يومية', category: 'قهوة' as const, amount: 45 },
    { title: 'تسوق ملابس', category: 'تسوق' as const, amount: 380 },
    { title: 'بنزين السيارة', category: 'بنزين' as const, amount: 200 },
    { title: 'اشتراك نتفليكس', category: 'ترفيه' as const, amount: 50 },
    { title: 'صيدلية', category: 'صحة' as const, amount: 75 },
    { title: 'كتب دراسية', category: 'تعليم' as const, amount: 150 },
    { title: 'عشاء عائلي', category: 'مطاعم' as const, amount: 220 },
  ];

  const expenses: Expense[] = expenseData.map((e, i) => ({
    id: generateId(),
    title: e.title,
    category: e.category,
    amount: e.amount,
    expenseDate: `${ym}-${String(dates[i] ?? today.getDate()).padStart(2, '0')}`,
    createdAt: now, updatedAt: now,
  }));

  // ─── Phase 3 sample data ───────────────────────────────────────────────────
  const goals: SavingsGoal[] = [
    {
      id: generateId(),
      name: 'صندوق الطوارئ',
      targetAmount: 30000,
      currentAmount: 12500,
      targetDate: `${year + 1}-06-30`,
      color: GOAL_COLOR_PALETTE[0],
      icon: 'shield',
      isCompleted: false,
      notes: 'يكفي 6 أشهر من المصاريف الأساسية',
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'سفرة العائلة',
      targetAmount: 15000,
      currentAmount: 3500,
      targetDate: `${year + 1}-08-15`,
      color: GOAL_COLOR_PALETTE[2],
      icon: 'map',
      isCompleted: false,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'تحديث الجوال',
      targetAmount: 4500,
      currentAmount: 1200,
      color: GOAL_COLOR_PALETTE[3],
      icon: 'gift',
      isCompleted: false,
      createdAt: now, updatedAt: now,
    },
  ];

  const goalContributions: GoalContribution[] = [
    {
      id: generateId(), goalId: goals[0].id, amount: 1000,
      date: `${ym}-05`, notes: 'تحويل تلقائي', createdAt: now,
    },
    {
      id: generateId(), goalId: goals[1].id, amount: 500,
      date: `${ym}-08`, createdAt: now,
    },
  ];

  const budgets: CategoryBudget[] = [
    { id: generateId(), category: 'مطاعم', monthlyLimit: 400, createdAt: now, updatedAt: now },
    { id: generateId(), category: 'قهوة', monthlyLimit: 200, createdAt: now, updatedAt: now },
    { id: generateId(), category: 'تسوق', monthlyLimit: 500, createdAt: now, updatedAt: now },
    { id: generateId(), category: 'بنزين', monthlyLimit: 400, createdAt: now, updatedAt: now },
    { id: generateId(), category: 'ترفيه', monthlyLimit: 250, createdAt: now, updatedAt: now },
  ];

  // Pick a renewal date a few days out from today to make "renews soon"
  // insights/sample look meaningful.
  const soonDay = Math.min(28, today.getDate() + 4);
  const soonYm = `${ym}-${String(soonDay).padStart(2, '0')}`;
  const subscriptions: Subscription[] = [
    {
      id: generateId(),
      name: 'Netflix',
      amount: 56,
      cycle: 'monthly',
      nextRenewalDate: soonYm,
      icon: 'film',
      color: '#EF4444',
      isActive: true,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Shahid VIP',
      amount: 350,
      cycle: 'yearly',
      nextRenewalDate: `${year + 1}-${String(month).padStart(2, '0')}-10`,
      icon: 'tv',
      color: '#8B5CF6',
      isActive: true,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'Spotify عائلي',
      amount: 29,
      cycle: 'monthly',
      nextRenewalDate: `${ym}-22`,
      icon: 'music',
      color: '#10B981',
      isActive: true,
      createdAt: now, updatedAt: now,
    },
    {
      id: generateId(),
      name: 'iCloud 200GB',
      amount: 11,
      cycle: 'monthly',
      nextRenewalDate: `${ym}-18`,
      icon: 'cloud',
      color: '#3B82F6',
      isActive: true,
      createdAt: now, updatedAt: now,
    },
  ];

  return { incomes, commitments, commitmentPayments, expenses, lenders, goals, goalContributions, budgets, subscriptions };
}
