/**
 * Patient and Doctor account registration page.
 * Enforces backend password rules (min 12 chars with uppercase, lowercase, and digit).
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Stethoscope } from "lucide-react";
import { Alert, Button, Field } from "../../shared/ui";
import { getErrorMessage } from "../../shared/utils/apiError";
import { defaultHomePathFor } from "../../shared/utils/roles";
import { useAuth } from "./AuthContext";
import styles from "./AuthLayout.module.css";

const BENEFITS = [
  "Fast onboarding for patients and licensed practitioners",
  "Manage all your family health profiles in one place",
  "Automated slot management, digital queue & earnings analytics",
];

const CURRENT_YEAR = new Date().getFullYear();

export function RegisterPage() {
  const { registerPatient, registerDoctor } = useAuth();
  const navigate = useNavigate();

  const [roleTab, setRoleTab] = useState<"PATIENT" | "DOCTOR">("PATIENT");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [bmdcNumber, setBmdcNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user =
        roleTab === "PATIENT"
          ? await registerPatient({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              password,
              ...(phone.trim() ? { phone: phone.trim() } : {}),
            })
          : await registerDoctor({
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              password,
              bmdcNumber: bmdcNumber.trim(),
            });
      navigate(defaultHomePathFor(user));
    } catch (caught) {
      setError(getErrorMessage(caught, "Registration failed. Please check your details."));
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
            <h2 className={styles.brandHeadline}>Join Bangladesh's Premier Health Network</h2>
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

          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>Join MediConnect BD as a patient or a healthcare provider.</p>

          <div className={styles.roleSelector}>
            <Button
              variant={roleTab === "PATIENT" ? "primary" : "secondary"}
              onClick={() => {
                setRoleTab("PATIENT");
                setError(null);
              }}
            >
              I am a Patient
            </Button>
            <Button
              variant={roleTab === "DOCTOR" ? "primary" : "secondary"}
              onClick={() => {
                setRoleTab("DOCTOR");
                setError(null);
              }}
            >
              I am a Doctor
            </Button>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.nameRow}>
              <Field label="First name" value={firstName} onChange={setFirstName} required />
              <Field label="Last name" value={lastName} onChange={setLastName} required />
            </div>
            <Field label="Email" value={email} onChange={setEmail} type="email" required />
            {roleTab === "PATIENT" ? (
              <Field
                label="Phone (optional)"
                value={phone}
                onChange={setPhone}
                placeholder="+8801700000000"
              />
            ) : (
              <Field
                label="BMDC registration number"
                value={bmdcNumber}
                onChange={setBmdcNumber}
                placeholder="BMDC-A-12345"
                required
              />
            )}
            <Field
              label="Password (12+ chars, upper, lower & number)"
              value={password}
              onChange={setPassword}
              type="password"
              placeholder="At least 12 characters"
              required
            />
            {error && <Alert kind="error">{error}</Alert>}
            <Button type="submit" fullWidth size="lg" loading={busy} disabled={busy}>
              {busy
                ? "Creating account…"
                : roleTab === "PATIENT"
                  ? "Register as Patient"
                  : "Register as Doctor"}
            </Button>
          </form>

          <p className={styles.bottomLink}>
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
