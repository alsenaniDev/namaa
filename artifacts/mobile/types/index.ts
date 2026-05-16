export interface UserProfile {
  id: string;
  name: string;
  preferredCurrency: string;
  monthlySalary: number;
  monthlySavingGoal: number;
  financialMonthStartDay: number;
  isDarkMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export type IncomeType = 'راتب' | 'عمل إضافي' | 'مكافأة' | 'تجارة' | 'استثمار' | 'أخرى';

export const INCOME_TYPES: IncomeType[] = [
  'راتب', 'عمل إضافي', 'مكافأة', 'تجارة', 'استثمار', 'أخرى',
];

export interface Income {
  id: string;
  title: string;
  amount: number;
  type: IncomeType;
  isRecurring: boolean;
  receivedDay: number;
  receivedDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CommitmentCategory =
  | 'قرض شخصي'
  | 'قرض سيارة'
  | 'إيجار'
  | 'تمويل عقاري'
  | 'كهرباء'
  | 'ماء'
  | 'إنترنت'
  | 'اشتراك'
  | 'تأمين'
  | 'أقساط دراسية'
  | 'مصروف عائلي'
  | 'أخرى';

export const COMMITMENT_CATEGORIES: CommitmentCategory[] = [
  'قرض شخصي', 'قرض سيارة', 'إيجار', 'تمويل عقاري', 'كهرباء', 'ماء',
  'إنترنت', 'اشتراك', 'تأمين', 'أقساط دراسية', 'مصروف عائلي', 'أخرى',
];

export interface Commitment {
  id: string;
  title: string;
  category: CommitmentCategory;
  amount: number;
  startDate?: string;
  endDate?: string;
  dueDay: number;
  isRecurring: boolean;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentStatus = 'paid' | 'unpaid' | 'late';

export interface CommitmentPayment {
  id: string;
  commitmentId: string;
  month: number;
  year: number;
  amount: number;
  paidDate?: string;
  status: PaymentStatus;
  notes?: string;
}

export type ExpenseCategory =
  | 'مطاعم'
  | 'قهوة'
  | 'تسوق'
  | 'بنزين'
  | 'سفر'
  | 'ترفيه'
  | 'صحة'
  | 'تعليم'
  | 'أخرى';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'مطاعم', 'قهوة', 'تسوق', 'بنزين', 'سفر', 'ترفيه', 'صحة', 'تعليم', 'أخرى',
];

export type HealthStatus = 'ممتاز' | 'متوسط' | 'خطر' | 'حرج جدًا';

export interface MonthlyTotals {
  totalIncome: number;
  totalCommitments: number;
  totalExpenses: number;
  netRemaining: number;
  commitmentPercent: number;
  expensePercent: number;
  suggestedSaving: number;
  healthStatus: HealthStatus;
  healthColor: string;
  remainingAfterCommitments: number;
}

export const CURRENCIES = [
  { label: 'ريال سعودي (SAR)', value: 'SAR' },
  { label: 'درهم إماراتي (AED)', value: 'AED' },
  { label: 'دينار كويتي (KWD)', value: 'KWD' },
  { label: 'دينار بحريني (BHD)', value: 'BHD' },
  { label: 'ريال عماني (OMR)', value: 'OMR' },
  { label: 'ريال قطري (QAR)', value: 'QAR' },
  { label: 'جنيه مصري (EGP)', value: 'EGP' },
  { label: 'دولار أمريكي (USD)', value: 'USD' },
];
