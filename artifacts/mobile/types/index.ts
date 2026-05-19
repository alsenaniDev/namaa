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
  'راتب', 'عمل إضافي', 'مكافأة' , 'تجارة', 'استثمار', 'أخرى',
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

// ─── Lenders / Providers ─────────────────────────────────────────────────────

export type LenderType =
  | 'bank'
  | 'finance_company'
  | 'telecom'
  | 'utility'
  | 'government'
  | 'landlord'
  | 'store'
  | 'individual'
  | 'family'
  | 'employer'
  | 'other';

export const LENDER_TYPES: LenderType[] = [
  'bank', 'finance_company', 'telecom', 'utility', 'government',
  'landlord', 'store', 'individual', 'family', 'employer', 'other',
];

export type PaymentMethodKind =
  | 'auto_debit'
  | 'bank_transfer'
  | 'cash'
  | 'card'
  | 'cheque'
  | 'wallet'
  | 'other';

export const PAYMENT_METHODS: PaymentMethodKind[] = [
  'auto_debit', 'bank_transfer', 'cash', 'card', 'cheque', 'wallet', 'other',
];

export const LENDER_COLOR_PALETTE = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
];

export interface Lender {
  id: string;
  name: string;
  type: LenderType;
  color: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  paymentMethod?: PaymentMethodKind;
  iban?: string;
  bankAccount?: string;
  bankName?: string;
  beneficiaryName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Commitments (rich) ──────────────────────────────────────────────────────

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

/**
 * `kind` distinguishes how the commitment behaves financially.
 * - `finite_loan` → has totalAmount + installmentCount, can show progress / remaining
 * - `recurring_bill` → open-ended monthly bill (rent, utility, subscription)
 * - `one_time` → a single planned payment
 */
export type CommitmentKind = 'finite_loan' | 'recurring_bill' | 'one_time';

export interface Commitment {
  id: string;
  title: string;
  category: CommitmentCategory;
  /** Monthly installment amount — used by all existing aggregations. */
  amount: number;

  // ─── Optional richer fields (added in v2). Older records may not have them. ──
  kind?: CommitmentKind;
  lenderId?: string;
  /** For finite loans: the total contract value (sum of all installments). */
  totalAmount?: number;
  /** For finite loans: total number of installments planned. */
  installmentCount?: number;

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

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  expenseDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

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

// ─── Savings Goals ───────────────────────────────────────────────────────────

export const GOAL_COLOR_PALETTE = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
];

export const GOAL_ICONS = [
  'target', 'home', 'gift', 'umbrella', 'briefcase',
  'heart', 'star', 'map', 'shield', 'shopping-bag',
  'truck', 'book',
];

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
  color: string;
  icon: string;
  isCompleted: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amount: number;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
}

// ─── Category Budgets ────────────────────────────────────────────────────────

export interface CategoryBudget {
  id: string;
  category: ExpenseCategory | string;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type BillingCycle = 'monthly' | 'yearly' | 'quarterly' | 'weekly';

export const BILLING_CYCLES: BillingCycle[] = ['monthly', 'yearly', 'quarterly', 'weekly'];

export interface Subscription {
  id: string;
  name: string;
  amount: number;
  cycle: BillingCycle;
  nextRenewalDate: string; // YYYY-MM-DD
  category?: string;
  icon: string;
  color: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const CURRENCIES = [
  { label: 'ريال سعودي (ر.س)', value: 'SAR' },
  { label: 'درهم إماراتي (AED)', value: 'AED' },
  { label: 'دينار كويتي (KWD)', value: 'KWD' },
  { label: 'دينار بحريني (BHD)', value: 'BHD' },
  { label: 'ريال عماني (OMR)', value: 'OMR' },
  { label: 'ريال قطري (QAR)', value: 'QAR' },
  { label: 'جنيه مصري (EGP)', value: 'EGP' },
  { label: 'دولار أمريكي (USD)', value: 'USD' },
];
