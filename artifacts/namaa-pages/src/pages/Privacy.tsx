const EMAIL = "alsenanimohammed1@gmail.com";

export default function Privacy() {
  return (
    <div className="card">
      <section className="lang-section" lang="ar" dir="rtl">
        <span className="pill">سياسة الخصوصية</span>
        <h1>سياسة الخصوصية</h1>
        <p className="updated">آخر تحديث: مايو 2026</p>

        <p>
          تطبيق <strong>نماء</strong> صُمم ليعمل بشكل كامل دون الاتصال بالإنترنت. خصوصيتك أولوية،
          ولا نجمع أي بيانات منك على الإطلاق.
        </p>

        <h2>١. البيانات التي نجمعها</h2>
        <p>
          لا نجمع أي بيانات شخصية. لا نطلب حساباً، ولا بريداً إلكترونياً، ولا رقم هاتف، ولا أي معلومات تعريفية.
          جميع بياناتك (الدخل، المصاريف، الالتزامات، الإعدادات) محفوظة فقط في الذاكرة المحلية لجهازك (AsyncStorage)،
          ولا تغادر جهازك أبداً.
        </p>

        <h2>٢. خدمات الطرف الثالث</h2>
        <p>
          لا يحتوي التطبيق على أي مكتبات تتبع، إعلانات، تحليلات، أو أي خدمات خارجية.
          لا توجد أي اتصالات شبكة من التطبيق.
        </p>

        <h2>٣. مشاركة البيانات</h2>
        <p>لا نشارك أي شيء، ببساطة لأننا لا نجمع أي شيء.</p>

        <h2>٤. التحكم في بياناتك</h2>
        <ul>
          <li><strong>تصدير:</strong> يمكنك تصدير نسخة احتياطية من جميع بياناتك من شاشة الإعدادات في أي وقت.</li>
          <li><strong>استيراد:</strong> يمكنك استرجاع بياناتك من ملف نسخة احتياطية.</li>
          <li><strong>حذف:</strong> يمكنك حذف جميع بياناتك من شاشة الإعدادات &gt; مسح جميع البيانات. حذف التطبيق من جهازك يحذف جميع البيانات نهائياً.</li>
        </ul>

        <h2>٥. الأطفال</h2>
        <p>التطبيق مناسب لجميع الأعمار ولا يجمع أي معلومات عن المستخدمين بمن فيهم الأطفال دون سن ١٣ عاماً.</p>

        <h2>٦. التغييرات على هذه السياسة</h2>
        <p>قد نقوم بتحديث سياسة الخصوصية من حين لآخر. سيتم نشر أي تغييرات على هذه الصفحة مع تحديث تاريخ "آخر تحديث" أعلاه.</p>

        <h2>٧. التواصل</h2>
        <p>
          لأي استفسار أو ملاحظة حول الخصوصية:
          <br />
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </p>
      </section>

      <div className="divider"></div>

      <section className="lang-section" lang="en" dir="ltr">
        <span className="pill">Privacy Policy</span>
        <h1>Privacy Policy</h1>
        <p className="updated">Last updated: May 2026</p>

        <p>
          <strong>Namaa</strong> is designed to operate entirely offline. Your privacy is the foundation of the app —
          we collect absolutely no data from you.
        </p>

        <h2>1. Data We Collect</h2>
        <p>
          We collect no personal data. We do not require an account, email, phone number, or any identifying
          information. All your data (income, expenses, commitments, settings) is stored only in your device's local
          storage (AsyncStorage) and never leaves your device.
        </p>

        <h2>2. Third-Party Services</h2>
        <p>
          The app contains no tracking, advertising, analytics, or any external services.
          The app makes no network requests of any kind.
        </p>

        <h2>3. Data Sharing</h2>
        <p>We share nothing because we collect nothing.</p>

        <h2>4. Your Control Over Your Data</h2>
        <ul>
          <li><strong>Export:</strong> You can export a backup of all your data from the Settings screen at any time.</li>
          <li><strong>Import:</strong> You can restore your data from a backup file.</li>
          <li><strong>Delete:</strong> You can delete all your data from Settings &gt; Clear All Data. Uninstalling the app permanently deletes all data.</li>
        </ul>

        <h2>5. Children</h2>
        <p>The app is suitable for all ages and does not collect any information about users, including children under 13.</p>

        <h2>6. Changes to This Policy</h2>
        <p>We may update this privacy policy from time to time. Any changes will be posted on this page with the "Last updated" date above revised accordingly.</p>

        <h2>7. Contact</h2>
        <p>
          For any privacy-related questions or feedback:
          <br />
          <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
        </p>
      </section>
    </div>
  );
}
