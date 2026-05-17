import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import Support from "@/pages/Support";
import Privacy from "@/pages/Privacy";

const EMAIL = "alsenanimohammed1@gmail.com";

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const isPrivacy = location.startsWith("/privacy");
  return (
    <div className="wrap">
      <header className="site">
        <h1 className="brand">نماء</h1>
        <p className="tag">إدارة الميزانية الشخصية · Personal Budget</p>
        <nav className="tabs" aria-label="Sections">
          <Link href="/" className={`tab ${!isPrivacy ? "active" : ""}`}>الدعم · Support</Link>
          <Link href="/privacy" className={`tab ${isPrivacy ? "active" : ""}`}>الخصوصية · Privacy</Link>
        </nav>
      </header>
      {children}
      <footer>
        © 2026 Namaa · Mohammed Alsenani · <a href={`mailto:${EMAIL}`}>{EMAIL}</a>
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="card">
      <h1>404</h1>
      <p>الصفحة غير موجودة. <Link href="/">العودة للدعم</Link></p>
    </div>
  );
}

function App() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <WouterRouter base={base}>
      <Layout>
        <Switch>
          <Route path="/" component={Support} />
          <Route path="/support" component={Support} />
          <Route path="/privacy" component={Privacy} />
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </WouterRouter>
  );
}

export default App;
