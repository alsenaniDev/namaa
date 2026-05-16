import { Income, Commitment, CommitmentPayment, Expense } from '../types';
import { generateId } from './format';

export function generateSampleData(): {
  incomes: Income[];
  commitments: Commitment[];
  commitmentPayments: CommitmentPayment[];
  expenses: Expense[];
} {
  const now = new Date().toISOString();
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const incomes: Income[] = [
    {
      id: generateId(),
      title: 'الراتب الشهري',
      amount: 12000,
      type: 'راتب',
      isRecurring: true,
      receivedDay: 1,
      notes: 'الراتب الأساسي',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'عمل حر',
      amount: 2500,
      type: 'عمل إضافي',
      isRecurring: false,
      receivedDay: 15,
      receivedDate: `${year}-${String(month).padStart(2, '0')}-15`,
      notes: 'مشروع تصميم',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const commitments: Commitment[] = [
    {
      id: generateId(),
      title: 'إيجار الشقة',
      category: 'إيجار',
      amount: 3000,
      dueDay: 1,
      isRecurring: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'قرض السيارة',
      category: 'قرض سيارة',
      amount: 1500,
      dueDay: 10,
      isRecurring: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'فاتورة الكهرباء',
      category: 'كهرباء',
      amount: 300,
      dueDay: 20,
      isRecurring: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'اشتراك الإنترنت',
      category: 'إنترنت',
      amount: 200,
      dueDay: 5,
      isRecurring: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: generateId(),
      title: 'تأمين صحي',
      category: 'تأمين',
      amount: 400,
      dueDay: 15,
      isRecurring: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const paidCommitmentId = commitments[0].id;
  const commitmentPayments: CommitmentPayment[] = [
    {
      id: generateId(),
      commitmentId: paidCommitmentId,
      month,
      year,
      amount: 3000,
      paidDate: `${year}-${String(month).padStart(2, '0')}-01`,
      status: 'paid',
    },
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
    expenseDate: `${year}-${String(month).padStart(2, '0')}-${String(dates[i] ?? today.getDate()).padStart(2, '0')}`,
    createdAt: now,
    updatedAt: now,
  }));

  return { incomes, commitments, commitmentPayments, expenses };
}
