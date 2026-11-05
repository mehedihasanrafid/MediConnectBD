/**
 * Login page with demo account shortcuts. The demo credentials are synthetic seed accounts and
 * are safe to display for local demonstration only.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Stethoscope } from "lucide-react";
import { useAuth } from "./AuthContext";
import { Alert, Button, Cluster, Field } from "../../shared/ui";
import { ApiRequestError } from "../../shared/api";
import { defaultHomePathFor } from "../../shared/utils/roles";
import styles from "./AuthLayout.module.css";

const DEMO_ACCOUNTS = [
  { label: "Patient", email: "patient.demo@mediconnect.example" },
  { label: "Doctor", email: "doctor.demo@mediconnect.example" },
  { label: "Admin", email: "admin.demo@mediconnect.example" },
];

const BENEFITS = [
  "Verified BMDC licensed doctors across Bangladesh",
  "Real-time appointments, instant slot holds & digital queue",
  "Secure video consultations & digital verified prescriptions",
];

const CURRENT_YEAR = new Date().getFullYear();
const PUBLIC_DEMO = import.meta.env.VITE_PUBLIC_DEMO === "true";
const SHOW_DEMO_ACCOUNTS = import.meta.env.DEV || PUBLIC_DEMO;
const LOCAL_DEMO_PASSWORD = import.meta.env.DEV && !PUBLIC_DEMO ? "#king123" : "";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(SHOW_DEMO_ACCOUNTS ? DEMO_ACCOUNTS[0].email : "");
  const [password, setPassword] = useState(LOCAL_DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(email, password);
      navigate(defaultHomePathFor(user));
    } catch (caught) {
      setError(
        caught instanceof ApiRequestError ? caught.message : "Login failed. Is the API running?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.shell}>
      <div className={styles.container}>
        <aside className={styles.brandPanel}>
          <div>
            <div className={styles.brandLogo}>
              <span className={styles.brandIcon} aria-hidden>
                <Stethoscope size={22} />
              </span>
              <span>MediConnect BD</span>
            </div>
            <h2 className={styles.brandHeadline}>Healthcare, one tap away</h2>
            <ul className={styles.brandBenefits} role="list">
              {BENEFITS.map((benefit, i) => (
                <li key={i} className={styles.benefitItem}>
                  <CheckCircle2 size={18} aria-hidden className={styles.benefitIcon} />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className={styles.brandFooter}>
            © {CURRENT_YEAR} MediConnect BD · Bangladesh Healthcare Network
          </p>
        </aside>

        <section className={styles.formCard}>
          <div className={styles.mobileLogo} aria-hidden>
            <Stethoscope size={20} />
            <span>MediConnect BD</span>
          </div>

          <h1 className={styles.title}>MediConnect BD</h1>
          <p className={styles.subtitle}>Sign in to book appointments and consult doctors.</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <Field label="Email" value={email} onChange={setEmail} type="email" required />
            <Field label="Password" value={password} onChange={setPassword} type="password" required />
            {error && <Alert kind="error">{error}</Alert>}
            <Button type="submit" fullWidth size="lg" loading={busy} disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className={styles.bottomLink}>
            New to MediConnect BD? <Link to="/register">Create a patient or doctor account</Link>
          </p>

          {SHOW_DEMO_ACCOUNTS && <div className={styles.demoBox}>
            <p className={styles.demoTitle}>{PUBLIC_DEMO
              ? "Demo accounts — enter the access password provided by the demo host"
              : "Demo accounts (password: #king123)"}</p>
            <Cluster gap={2}>
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(LOCAL_DEMO_PASSWORD);
                  }}
                >
                  {account.label}
                </Button>
              ))}
            </Cluster>
          </div>}
        </section>
      </div>
    </div>
  );
}
