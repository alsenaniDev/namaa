# مالي - إدارة الميزانية الشخصية

A fully offline Arabic RTL personal finance app built with Expo (React Native). No backend, no external APIs — all data stored locally on the device using AsyncStorage.

## Run & Operate

- Expo app runs via workflow `artifacts/mobile: expo`
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Framework: Expo SDK 54, expo-router v6
- Storage: AsyncStorage (fully offline, no backend)
- State: React Context (AppContext)
- UI: React Native + Feather icons, Inter font (Arabic-compatible)
- RTL: I18nManager.forceRTL(true), CSS direction for web

## Where things live

- `artifacts/mobile/` — the Expo app
- `artifacts/mobile/app/` — expo-router screens
  - `_layout.tsx` — root layout, RTL setup, AppProvider
  - `setup.tsx` — 4-step onboarding wizard
  - `(tabs)/` — 6 tabs: Dashboard, Income, Commitments, Expenses, Reports, Settings
  - `income/add.tsx`, `commitments/add.tsx`, `expenses/add.tsx` — modal add/edit forms
- `artifacts/mobile/context/AppContext.tsx` — all CRUD state + AsyncStorage persistence
- `artifacts/mobile/types/index.ts` — all TypeScript types and constants
- `artifacts/mobile/utils/` — calculations, format, storage, sampleData
- `artifacts/mobile/components/` — SummaryCard, HealthStatusCard, ProgressBar, TransactionItem + ui/ folder
- `artifacts/mobile/constants/colors.ts` — light/dark theme tokens

## Architecture decisions

- Fully offline: zero network calls, all data lives in AsyncStorage
- Contract-first types: all data types defined in `types/index.ts`, all CRUD in AppContext
- RTL-first layout: all `flexDirection` uses `row-reverse`, all text uses `textAlign: right`
- Financial month: configurable start day (e.g. salary on day 15 → month runs 15th to 14th)
- Health status: 4-tier system (ممتاز/متوسط/خطر/حرج) based on commitment % of income

## Product

- Dashboard with monthly income/commitments/expenses summary + health status indicator
- Income management (CRUD): salary, freelance, bonus, investment, business
- Commitment management (CRUD): loans, rent, utilities, subscriptions with paid/unpaid toggle
- Expense tracking (CRUD): categorized daily spending with date
- Reports: monthly bar chart + category breakdown (expenses + commitments)
- Settings: profile, currency, saving goal, data export, sample data, clear all
- 4-step onboarding wizard with optional sample data preload

## User preferences

- Arabic UI only, RTL layout throughout
- Emerald green primary color (#10B981)
- Offline-first, no backend required

## Gotchas

- I18nManager.forceRTL only affects native (iOS/Android). Web uses CSS `direction: rtl`
- FABs positioned on LEFT (which appears RIGHT in RTL)
- `pnpm run dev` at workspace root is not supported; use workflow restart
- Verify with `pnpm --filter @workspace/mobile run typecheck`, not `build`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo-specific patterns
