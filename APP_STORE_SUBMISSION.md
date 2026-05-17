# نماء — App Store Submission Package

Complete metadata and instructions for submitting **نماء (Namaa)** to the Apple App Store.

Bundle ID is whatever you set in Apple Developer / EAS — make sure `app.json` `ios.bundleIdentifier` matches.

---

## 1. App Information (App Store Connect → App Information)

| Field | Value |
|---|---|
| **Name** (30 char max) | `نماء` |
| **Subtitle** (30 char max) | `إدارة الميزانية الشخصية` |
| **Primary Category** | Finance |
| **Secondary Category** | Productivity |
| **Content Rights** | Does not contain third-party content |
| **Age Rating** | 4+ (no objectionable content) |

---

## 2. Pricing & Availability

| Field | Value |
|---|---|
| **Price** | Free |
| **Availability** | All countries (or restrict to MENA if preferred: SA, AE, KW, QA, BH, OM, JO, EG, MA, IQ, LB) |

---

## 3. App Privacy (App Store Connect → App Privacy)

Because the app is **100% offline** with zero analytics, network calls, or third-party SDKs, fill the questionnaire as follows:

| Question | Answer |
|---|---|
| Do you or your third-party partners collect data from this app? | **No** |
| Data Types Collected | None |
| Tracking | No |

> If Apple's review system asks for justification: *"This is a fully offline personal finance app. All user data (income, expenses, commitments, profile) is stored exclusively in the device's local storage (AsyncStorage). The app makes no network requests, contains no analytics SDKs, no advertising SDKs, and does not transmit any data off the device."*

---

## 4. App Store Listing — Arabic (Primary Localization: ar)

### Name
```
نماء
```

### Subtitle
```
إدارة الميزانية الشخصية
```

### Promotional Text (170 char max — editable without resubmission)
```
تطبيق نماء يساعدك على تتبع دخلك ومصاريفك والتزاماتك الشهرية بكل خصوصية. بياناتك محفوظة على جهازك فقط، بدون إنترنت وبدون حسابات.
```

### Description (4000 char max)
```
نماء — رفيقك الذكي لإدارة ميزانيتك الشخصية باللغة العربية بشكل كامل.

تطبيق نماء يساعدك على فهم وضعك المالي والتحكم به من خلال تتبع دخلك، التزاماتك الشهرية، ومصاريفك اليومية، مع تقارير واضحة ومؤشر صحة مالية يخبرك بحالتك في كل وقت.

ما يميز نماء:

• خصوصية كاملة: جميع بياناتك محفوظة على جهازك فقط، بدون إنترنت، بدون حسابات، بدون مشاركة.
• واجهة عربية أصيلة من اليمين إلى اليسار مصممة بعناية.
• لوحة تحكم ذكية تعرض إجمالي الدخل، الالتزامات، المصاريف، والمتبقي للشهر الحالي.
• مؤشر الصحة المالية: ممتاز / متوسط / خطر / حرج، بناءً على نسبة التزاماتك من دخلك.
• إدارة كاملة للدخل (راتب، عمل حر، مكافآت، استثمار، أعمال).
• إدارة الالتزامات الشهرية (قروض، إيجار، فواتير، اشتراكات) مع تحديد المدفوع وغير المدفوع.
• تسجيل المصاريف اليومية بفئات مرنة وقابلة للتخصيص.
• تقارير شهرية مع رسوم بيانية وتقسيم حسب الفئات.
• شهر مالي قابل للتخصيص (مثلاً يبدأ يوم 15 إذا كان راتبك في منتصف الشهر).
• هدف ادخار شهري قابل للتعديل.
• نسخ احتياطي واستيراد البيانات من ملف.
• دعم العملات الخليجية والعربية (ريال سعودي، إماراتي، كويتي، قطري، بحريني، عماني، درهم مغربي، دينار أردني، جنيه مصري، وغيرها).

نماء مصمم لمن يقدّر البساطة، الخصوصية، والتحكم الحقيقي في ماله.

ابدأ رحلتك نحو وعي مالي أفضل اليوم — تطبيق نماء، بياناتك على جهازك، تحت سيطرتك بالكامل.
```

### Keywords (100 char max — comma separated, no spaces after commas)
```
ميزانية,مصاريف,مالية,ادخار,راتب,محفظة,قروض,التزامات,تتبع,حسابات,محاسبة,تخطيط,مال,تقارير
```

### Support URL (required)
```
https://YOUR-DOMAIN-OR-GITHUB.com/namaa-support
```
> Create a simple page that lists: app description, "contact: your-email@..." and a "report a bug" email. A GitHub Pages or Notion page is acceptable.

### Marketing URL (optional)
```
(leave blank or your landing page)
```

### Privacy Policy URL (required)
```
https://YOUR-DOMAIN-OR-GITHUB.com/namaa-privacy
```
> Apple requires this even for offline apps. Template provided in section 9 below.

---

## 5. App Store Listing — English (Secondary Localization: en-US)

### Name
```
Namaa
```

### Subtitle
```
Personal Budget & Finance
```

### Promotional Text (170 char max)
```
Namaa helps you track income, monthly commitments, and daily expenses — fully private. All data stays on your device. No internet. No accounts. No tracking.
```

### Description (4000 char max)
```
Namaa — your smart Arabic-first personal finance companion.

Namaa helps you understand and control your finances by tracking your income, monthly commitments, and daily expenses, with clear reports and a financial-health indicator that tells you where you stand at a glance.

What makes Namaa different:

• Fully private: every piece of data lives on your device only. No internet calls, no accounts, no sharing.
• Beautifully crafted Arabic, right-to-left interface throughout.
• Smart dashboard showing income, commitments, expenses, and remaining balance for the current month.
• Financial health indicator: Excellent / Moderate / Risk / Critical, based on commitments as a percentage of income.
• Full income management (salary, freelance, bonus, investment, business).
• Monthly commitments (loans, rent, utilities, subscriptions) with paid / unpaid tracking.
• Daily expense logging with customizable categories.
• Monthly reports with bar charts and per-category breakdowns.
• Configurable financial month (e.g. starts on day 15 if you get paid mid-month).
• Adjustable monthly savings goal.
• Backup and import your data from a file.
• Gulf and MENA currency support (SAR, AED, KWD, QAR, BHD, OMR, MAD, JOD, EGP, and more).

Namaa is built for people who value simplicity, privacy, and real control over their money.

Start your journey toward better financial awareness today — Namaa keeps your data on your device, fully under your control.
```

### Keywords (100 char max)
```
budget,expense,finance,saving,money,wallet,tracker,personal,offline,private,arabic,salary,planner
```

### Support URL / Privacy Policy URL
Same URLs as Arabic.

---

## 6. Build Submission Notes (App Review Information)

| Field | Value |
|---|---|
| **First Name / Last Name** | Mohammed Alsenani |
| **Phone / Email** | your contact info |
| **Demo Account** | Not required — app has no login |
| **Notes for Reviewer** | See template below |

### Reviewer Notes (paste into App Review Information)
```
Namaa is a fully offline personal finance app. It does not require an account, internet connection, or any external service.

How to test:
1. Launch the app — you will see an Arabic onboarding screen.
2. Enter any name, currency, optional salary, and tap "Continue".
3. On the setup wizard's last step, tap "ابدأ مع بيانات تجريبية" (Start with sample data) to instantly populate the app with example income, commitments, and expenses.
4. Explore the 6 tabs: Dashboard, Income, Commitments, Expenses, Reports, Settings.

The app stores all data exclusively in AsyncStorage on the device. There is no network activity, no analytics, no third-party SDKs, no tracking, and no advertising.

The app interface is Arabic-only with right-to-left layout. There is no language switcher.

Contact: your-email@example.com
```

---

## 7. Screenshots (Required)

Apple requires screenshots in the following sizes:

| Display | Required Resolution | Notes |
|---|---|---|
| **6.9" iPhone** (15 Pro Max / 16 Pro Max) | **1290 × 2796 px** | **Required** since Mar 2024 |
| **6.5" iPhone** (XS Max / 11 Pro Max) | 1242 × 2688 px or 1284 × 2778 px | Recommended fallback |
| **iPad 13"** (M4 iPad Pro) | 2064 × 2752 px | Only required if you check "iPad" support — yours is iPhone-only per `app.json` (`supportsTablet: false`), so skip |

Minimum **3 screenshots**, maximum **10**.

### Recommended set of 6 screenshots (in this order)
1. **لوحة التحكم الرئيسية** — Dashboard with monthly summary + financial health
2. **إدارة الدخل** — Income screen with list of entries
3. **الالتزامات الشهرية** — Commitments screen with paid/unpaid toggle
4. **تتبع المصاريف اليومية** — Expenses screen with category chips
5. **التقارير والإحصائيات** — Reports screen with bar chart
6. **الإعدادات والخصوصية** — Settings screen showing data management

### How to capture them in the right resolution
**Easiest path (iOS Simulator on macOS):**
```bash
# 1. Open the simulator with iPhone 15 Pro Max
xcrun simctl boot "iPhone 15 Pro Max"
open -a Simulator

# 2. Run your dev build into it
cd artifacts/mobile
pnpm exec expo run:ios --device "iPhone 15 Pro Max"

# 3. Inside the app, load sample data (Settings → بيانات تجريبية)
# 4. Take screenshots: Cmd+S inside the simulator
#    Files land on your Desktop at exactly 1290x2796 — App Store ready.
```

**Alternative (TestFlight on real device):**
- Install the build on an iPhone 15 Pro Max
- Press Side + Volume Up to capture
- AirDrop to Mac

> Tip: in `Settings > بيانات تجريبية` tap to populate realistic Arabic sample data before capturing.

---

## 8. App Icon

App Store requires a **1024 × 1024** icon, opaque, no transparency, no rounded corners (Apple rounds automatically).

Your current icon at `artifacts/mobile/assets/images/icon.png` has a **transparent background**. Before uploading to App Store Connect, flatten it onto a solid background:

```bash
# Quick fix on macOS (creates icon-flat.png on a white background)
sips -s format png \
  --padToHeightWidth 1024 1024 \
  --padColor FFFFFF \
  artifacts/mobile/assets/images/icon.png \
  --out icon-store-1024.png
```

Or set a deep emerald background (#0F8B5C) which matches the brand.

---

## 9. Privacy Policy (template)

Save this as a public web page (GitHub Pages, Notion, Vercel, etc.) and put the URL in the Privacy Policy field. Apple **will reject** without one.

```
سياسة الخصوصية — نماء (Namaa)

آخر تحديث: <اليوم>

تطبيق نماء مصمم ليعمل بشكل كامل دون الاتصال بالإنترنت.

١. البيانات التي نجمعها
لا نجمع أي بيانات شخصية. لا نطلب حساباً، ولا بريداً إلكترونياً، ولا رقم هاتف. جميع بياناتك (الدخل، المصاريف، الالتزامات، الإعدادات) محفوظة فقط في الذاكرة المحلية لجهازك (AsyncStorage)، ولا تغادر جهازك أبداً.

٢. خدمات الطرف الثالث
لا يحتوي التطبيق على أي مكتبات تتبع، إعلانات، تحليلات، أو أي خدمات خارجية.

٣. مشاركة البيانات
لا نشارك أي شيء، لأننا لا نجمع أي شيء.

٤. حذف البيانات
يمكنك حذف جميع بياناتك في أي وقت من شاشة الإعدادات > مسح جميع البيانات. حذف التطبيق من جهازك يحذف جميع البيانات نهائياً.

٥. التواصل
لأي استفسار: your-email@example.com

— Namaa Privacy Policy (English) —

Last updated: <today>

Namaa is designed to operate entirely offline.

1. Data We Collect
We collect no personal data. We do not require an account, email, or phone number. All your data (income, expenses, commitments, settings) is stored only in your device's local storage (AsyncStorage) and never leaves your device.

2. Third-Party Services
The app contains no tracking, advertising, analytics, or any external services.

3. Data Sharing
We share nothing because we collect nothing.

4. Data Deletion
You can delete all your data anytime from Settings > Clear All Data. Uninstalling the app permanently deletes all data.

5. Contact
Questions: your-email@example.com
```

---

## 10. Pre-Submission Checklist

- [ ] In `artifacts/mobile/app.json`: bump `version` to `1.0.0` and `ios.buildNumber` to `1`
- [ ] Confirm `ios.bundleIdentifier` matches your Apple Developer App ID
- [ ] Run a fresh native build: `eas build --platform ios --profile production`
- [ ] Submit to App Store Connect: `eas submit --platform ios`
- [ ] In App Store Connect:
  - [ ] Add Arabic (ar) as primary localization
  - [ ] Add English (US) as secondary
  - [ ] Paste all metadata from sections 4 and 5
  - [ ] Upload 6 screenshots at 1290×2796
  - [ ] Upload 1024×1024 opaque icon
  - [ ] Set price = Free
  - [ ] Complete App Privacy questionnaire (all "No data collected")
  - [ ] Fill App Review Information with the reviewer notes from section 6
  - [ ] Publish your Privacy Policy URL and link it
- [ ] Click **Submit for Review**

Typical review time: **24–48 hours** for a finance app with no auth and no IAP.
