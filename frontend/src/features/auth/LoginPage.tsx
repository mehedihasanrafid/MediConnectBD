/**
 * Login page with demo account shortcuts. The demo credentials are synthetic seed accounts and
 * are safe to display for local demonstration only.
 */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { Alert, Button, Card, Field } from "../../components/ui";
import { ApiRequestError } from "../../shared/api";
import { defaultHomePathFor } from "../../shared/utils/roles";

const DEMO_ACCOUNTS = [
  { label: "Patient", email: "patient.demo@mediconnect.example" },
  { label: "Doctor", email: "doctor.demo@mediconnect.example" },
  { label: "Admin", email: "admin.demo@mediconnect.example" },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("patient.demo@mediconnect.example");
  const [password, setPassword] = useState("#king123");
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
    <div className="auth-shell">
      <Card className="auth-card">
        <h1>MediConnect BD</h1>
        <p className="muted">Sign in to book appointments and consult doctors.</p>

        <form onSubmit={handleSubmit}>
          <Field label="Email" value={email} onChange={setEmail} type="email" required />
          <Field label="Password" value={password} onChange={setPassword} type="password" required />
          {error && <Alert kind="error">{error}</Alert>}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <div className="demo-accounts">
          <p className="muted small" style={{ marginBottom: "0.75rem" }}>
            New to MediConnect BD? <Link to="/register">Create a patient or doctor account</Link>
          </p>
          <p className="muted">Demo accounts (password: #king123)</p>
          <div className="demo-buttons">
            {DEMO_ACCOUNTS.map((account) => (
              <Button
                key={account.email}
                variant="secondary"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("#king123");
                }}
              >
                {account.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
