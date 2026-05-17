const EMAIL = "alsenanimohammed1@gmail.com";

export default function Support() {
  return (
    <>
      <div className="contact-card">
        <div className="icon">✉</div>
        <p className="email-line"><a href={`mailto:${EMAIL}`} style={{ color: "var(--accent)", textDecoration: "none" }}>{EMAIL}</a></p>
        <p className="note">نرد على جميع الرسائل خلال ٢٤–٤٨ ساعة · We respond within 24–48 hours</p>
      </div>

      <div className="card">
        <section className="lang-section" lang="ar" dir="rtl">
          <span className="pill">الدعم</span>
          <h1>مرحباً، كيف نقدر نساعدك؟</h1>
          <p>
            تطبيق <strong>نماء</strong> صُمم ليكون بسيطاً وسريعاً وآمناً تماماً. كل بياناتك محفوظة على جهازك فقط،
            ولا نحتاج إلى أي حساب أو اتصال بالإنترنت. هذه الصفحة فيها أجوبة الأسئلة الشائعة،
            وإذا ما لقيت جوابك راسلنا مباشرة وراح نرد عليك.
          </p>

          <h2>الأسئلة الشائعة</h2>

          <details open>
            <summary>هل بياناتي محفوظة على جهازي فقط؟</summary>
            <p>نعم، ١٠٠٪. كل المعلومات (الدخل، المصاريف، الالتزامات، إعدادات الملف الشخصي) محفوظة فقط في الذاكرة المحلية لجهازك. لا نرسل أي شيء لأي خادم، ولا نملك حتى خوادم لاستقبال بياناتك.</p>
          </details>

          <details>
            <summary>هل أستطيع نقل بياناتي إلى جهاز جديد؟</summary>
            <p>نعم. من شاشة الإعدادات اضغط <strong>"تصدير البيانات"</strong> لإنشاء ملف نسخة احتياطية، ثم على الجهاز الجديد ثبّت التطبيق واضغط <strong>"استيراد البيانات"</strong> واختر نفس الملف.</p>
          </details>

          <details>
            <summary>كيف أحسب الشهر المالي عندي إذا الراتب يجي في منتصف الشهر؟</summary>
            <p>من الإعدادات &gt; "يوم بدء الشهر المالي" غيّر القيمة من ١ إلى يوم نزول راتبك (مثلاً ٢٥). كل التقارير والحسابات راح تتعامل مع الشهر من ٢٥ إلى ٢٤ من الشهر التالي.</p>
          </details>

          <details>
            <summary>كيف يعمل مؤشر الصحة المالية؟</summary>
            <p>المؤشر يحسب نسبة التزاماتك الشهرية إلى دخلك ويصنّف وضعك إلى أربع حالات:</p>
            <ul>
              <li><strong>ممتاز:</strong> التزاماتك أقل من ٣٠٪ من دخلك.</li>
              <li><strong>متوسط:</strong> بين ٣٠٪ و٥٠٪.</li>
              <li><strong>خطر:</strong> بين ٥٠٪ و٧٠٪.</li>
              <li><strong>حرج:</strong> أكثر من ٧٠٪.</li>
            </ul>
          </details>

          <details>
            <summary>هل يمكنني إضافة فئات مصاريف خاصة بي؟</summary>
            <p>نعم. اذهب إلى الإعدادات &gt; إدارة الفئات. تقدر تضيف فئات للدخل، الالتزامات، والمصاريف بأي اسم تبيه.</p>
          </details>

          <details>
            <summary>كيف أحذف جميع بياناتي؟</summary>
            <p>من الإعدادات &gt; <strong>"مسح جميع البيانات"</strong>. الحذف نهائي ولا يمكن التراجع عنه. إذا أردت نسخة احتياطية قبل الحذف، صدّر بياناتك أولاً.</p>
          </details>

          <details>
            <summary>وجدت مشكلة في التطبيق أو عندي اقتراح، كيف أوصلكم؟</summary>
            <p>راسلنا على <a href={`mailto:${EMAIL}`}>{EMAIL}</a> ووضّح إصدار iOS وموديل الجهاز إذا كانت مشكلة تقنية. نرد خلال ٢٤–٤٨ ساعة.</p>
          </details>

          <details>
            <summary>هل التطبيق مجاني؟</summary>
            <p>نعم، نماء مجاني ١٠٠٪، بدون اشتراكات وبدون إعلانات وبدون مشتريات داخل التطبيق.</p>
          </details>
        </section>

        <div className="divider"></div>

        <section className="lang-section" lang="en" dir="ltr">
          <span className="pill">Support</span>
          <h1>Hi — how can we help?</h1>
          <p>
            <strong>Namaa</strong> is built to be simple, fast, and completely private. All your data lives on your
            device only, and we never need an account or internet connection. Below are answers to the most common
            questions. If yours isn't here, just email us and we'll get back to you.
          </p>

          <h2>Frequently Asked Questions</h2>

          <details>
            <summary>Is my data really stored only on my device?</summary>
            <p>Yes, 100%. All information (income, expenses, commitments, profile settings) is stored only in your device's local storage. We send nothing to any server — we don't even operate one for user data.</p>
          </details>

          <details>
            <summary>Can I move my data to a new device?</summary>
            <p>Yes. In Settings tap <strong>"Export Data"</strong> to create a backup file, then on the new device install the app and tap <strong>"Import Data"</strong> and select the same file.</p>
          </details>

          <details>
            <summary>How do I configure the financial month if I get paid mid-month?</summary>
            <p>Go to Settings &gt; "Financial Month Start Day" and change the value from 1 to your payday (e.g. 25). All reports and calculations will treat the month as running from the 25th to the 24th of the next month.</p>
          </details>

          <details>
            <summary>How does the financial health indicator work?</summary>
            <p>It calculates your monthly commitments as a percentage of your income and classifies your status into four levels:</p>
            <ul>
              <li><strong>Excellent:</strong> commitments under 30% of income.</li>
              <li><strong>Moderate:</strong> 30% to 50%.</li>
              <li><strong>Risk:</strong> 50% to 70%.</li>
              <li><strong>Critical:</strong> over 70%.</li>
            </ul>
          </details>

          <details>
            <summary>Can I add my own categories?</summary>
            <p>Yes. Go to Settings &gt; Categories. You can add custom income types, commitment categories, and expense categories with any name you want.</p>
          </details>

          <details>
            <summary>How do I delete all my data?</summary>
            <p>Settings &gt; <strong>"Clear All Data"</strong>. Deletion is permanent and cannot be undone. If you want a backup first, export your data before clearing.</p>
          </details>

          <details>
            <summary>I found a bug or have a suggestion — how do I reach you?</summary>
            <p>Email <a href={`mailto:${EMAIL}`}>{EMAIL}</a>. For technical issues please include your iOS version and device model. We respond within 24–48 hours.</p>
          </details>

          <details>
            <summary>Is the app free?</summary>
            <p>Yes, Namaa is 100% free with no subscriptions, no ads, and no in-app purchases.</p>
          </details>
        </section>
      </div>
    </>
  );
}
