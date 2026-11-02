import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Sun,
  Moon,
  Monitor,
  Palette,
  User,
  Shield,
  Volume2,
  LogOut,
  ExternalLink,
  Lock,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
import { useTheme, type Theme, type ThemePreset } from "../../shared/theme/ThemeProvider";
import { doctorsApi } from "../../api/doctors";
import { playChimeSound, type SoundKind } from "../../shared/utils/sound";
import { DoctorBreadcrumbs } from "../dashboard/components/DoctorBreadcrumbs";
import type { DoctorProfileDetails } from "../dashboard/types/doctorDashboard.types";
import styles from "./DoctorSettingsPage.module.css";

export interface DoctorSettingsPageProps {
  initialProfile?: DoctorProfileDetails | null;
}

export function DoctorSettingsPage({ initialProfile }: DoctorSettingsPageProps = {}) {
  const { user, logout } = useAuth();
  const { theme, setTheme, preset, setPreset, presets } = useTheme();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<DoctorProfileDetails | null>(initialProfile ?? null);
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false);
  const [testedSound, setTestedSound] = useState<SoundKind | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const res = await doctorsApi.getMyProfile<DoctorProfileDetails>();
      setProfile(res);
    } catch {
      // Non-critical; fallback to auth context user
    }
  }, []);

  useEffect(() => {
    if (initialProfile === undefined) {
      void loadProfile();
    }
  }, [loadProfile, initialProfile]);

  const handleTestSound = (kind: SoundKind) => {
    playChimeSound(kind);
    setTestedSound(kind);
    setTimeout(() => {
      setTestedSound((curr) => (curr === kind ? null : curr));
    }, 1500);
  };

  const handleSignOut = async () => {
    if (!window.confirm("Are you sure you want to sign out of your doctor portal session?")) {
      return;
    }
    setIsSigningOut(true);
    try {
      await logout();
      navigate("/login");
    } finally {
      setIsSigningOut(false);
    }
  };

  const doctorName = user ? `Dr. ${user.firstName} ${user.lastName}` : "Doctor";
  const bmdcNumber = profile?.bmdcNumber || "Pending Registration";
  const status = profile?.applicationStatus || user?.doctorProfile?.applicationStatus || "PENDING_REVIEW";

  return (
    <div className={styles.container}>
      <DoctorBreadcrumbs activeTabLabel="Doctor Account Settings" />

      {/* Header */}
      <div className={styles.headerRow}>
        <div className={styles.headerTextGroup}>
          <span className={styles.eyebrow}>Practice Configuration & Identity</span>
          <h1 className={styles.title}>Doctor Account Settings</h1>
          <p className={styles.description}>
            Manage interface appearance, auditory alerts, clinical identity, and authenticated session preferences.
          </p>
        </div>
      </div>

      {/* Section 1: Appearance & Theme */}
      <section className={styles.settingsCard} aria-labelledby="theme-settings-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="theme-settings-heading" className={styles.cardTitle}>
              <Palette size={18} />
              Interface Theme & Appearance
            </h2>
            <p className={styles.cardSubtitle}>
              Customize color tones and dark/light modes for high contrast during clinical work.
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div>
          <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, marginBottom: "8px" }}>
            Color Mode
          </label>
          <div className={styles.modeGroup} role="group" aria-label="Color Mode">
            <button
              type="button"
              className={`${styles.modeButton} ${theme === "light" ? styles.modeButtonActive : ""}`}
              onClick={() => setTheme("light" as Theme)}
              aria-pressed={theme === "light"}
            >
              <Sun size={16} />
              <span>Light Mode</span>
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${theme === "dark" ? styles.modeButtonActive : ""}`}
              onClick={() => setTheme("dark" as Theme)}
              aria-pressed={theme === "dark"}
            >
              <Moon size={16} />
              <span>Dark Mode</span>
            </button>
            <button
              type="button"
              className={`${styles.modeButton} ${theme === "system" ? styles.modeButtonActive : ""}`}
              onClick={() => setTheme("system" as Theme)}
              aria-pressed={theme === "system"}
            >
              <Monitor size={16} />
              <span>System Default</span>
            </button>
          </div>
        </div>

        {/* Color Presets Grid */}
        <div>
          <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, marginBottom: "8px" }}>
            Brand Accent Palette
          </label>
          <div className={styles.presetGrid} role="group" aria-label="Brand Accent Palette">
            {presets.map((p) => {
              const isSelected = preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`${styles.presetCard} ${isSelected ? styles.presetCardActive : ""}`}
                  onClick={() => setPreset(p.id as ThemePreset)}
                  aria-pressed={isSelected}
                  aria-label={`Select ${p.name} theme preset`}
                >
                  <span>{p.emoji}</span>
                  <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </span>
                  {isSelected && <CheckCircle2 size={14} style={{ color: "var(--color-primary)" }} />}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 2: Account & Verification Overview */}
      <section className={styles.settingsCard} aria-labelledby="identity-settings-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="identity-settings-heading" className={styles.cardTitle}>
              <User size={18} />
              Provider Identity & Verification
            </h2>
            <p className={styles.cardSubtitle}>
              Core credentials verified against Bangladesh Medical & Dental Council (BMDC) records.
            </p>
          </div>
        </div>

        <div className={styles.identityGrid}>
          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Practicing Name</span>
            <span className={styles.identityValue}>{doctorName}</span>
          </div>

          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>BMDC Registration No.</span>
            <span className={styles.identityValue}>{bmdcNumber}</span>
          </div>

          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Authenticated Email</span>
            <span className={styles.identityValue}>{user?.email || "—"}</span>
          </div>

          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Verification Status</span>
            <span className={styles.identityValue} style={{ textTransform: "capitalize" }}>
              {status.toLowerCase().replace("_", " ")}
            </span>
          </div>
        </div>

        <div className={styles.profileDeepLinkRow}>
          <div>
            <strong style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-text)" }}>
              Need to edit specialties, chambers, or consultation fees?
            </strong>
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text-secondary)" }}>
              Clinical qualifications and hospital chambers are managed in your Doctor Profile workspace.
            </span>
          </div>
          <Link to="/doctor/profile" className={styles.deepLinkBtn}>
            <span>Manage Clinical Profile</span>
            <ExternalLink size={14} />
          </Link>
        </div>
      </section>

      {/* Section 3: Clinical Notifications & Auditory Chimes */}
      <section className={styles.settingsCard} aria-labelledby="alerts-settings-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="alerts-settings-heading" className={styles.cardTitle}>
              <Volume2 size={18} />
              Clinical Auditory Alerts & Time Synchronization
            </h2>
            <p className={styles.cardSubtitle}>
              Preview synthesized Web Audio tones used for patient call invites and completion notifications.
            </p>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, marginBottom: "8px" }}>
            Test Audio Chimes
          </label>
          <div className={styles.chimeGrid}>
            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("call")}
              aria-label="Test incoming call sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "call" ? "Playing Call Tone..." : "Test Video Call Ring"}</span>
            </button>

            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("notification")}
              aria-label="Test patient alert sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "notification" ? "Playing Alert..." : "Test Patient Arrival"}</span>
            </button>

            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("complete")}
              aria-label="Test consultation completion sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "complete" ? "Playing Chime..." : "Test Session Complete"}</span>
            </button>

            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("success")}
              aria-label="Test prescription issued sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "success" ? "Playing Chime..." : "Test Rx Issuance"}</span>
            </button>
          </div>
        </div>

        <div className={styles.securityNotice}>
          <Clock size={18} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-primary)" }} />
          <div>
            <strong style={{ display: "block", marginBottom: "2px", color: "var(--color-text)" }}>
              Dhaka Time Zone Lock (Asia/Dhaka GMT+6)
            </strong>
            All queue timings, telemedicine call slots, and scheduled leave windows are strictly locked to Bangladesh
            Standard Time to ensure complete synchronization between doctors and patients across districts.
          </div>
        </div>
      </section>

      {/* Section 4: Security & Session */}
      <section className={styles.settingsCard} aria-labelledby="security-settings-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="security-settings-heading" className={styles.cardTitle}>
              <Shield size={18} />
              Session & Account Security
            </h2>
            <p className={styles.cardSubtitle}>
              Active provider credentials and administrative security policy.
            </p>
          </div>
        </div>

        <div className={styles.securityNotice}>
          <Lock size={18} style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-primary)" }} />
          <div>
            <strong style={{ display: "block", marginBottom: "2px", color: "var(--color-text)" }}>
              Credential & Single-Sign-On Policy
            </strong>
            Doctor account credentials and BMDC verification tokens are managed centrally. To update your login email,
            reset credentials, or configure multi-factor institutional hardware keys, please submit a verified ticket to
            support@mediconnectbd.com.
          </div>
        </div>

        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={isSigningOut}
          className={styles.signOutBtn}
          aria-label="Sign out of doctor session"
        >
          <LogOut size={16} />
          <span>{isSigningOut ? "Signing Out..." : "Sign Out of Doctor Session"}</span>
        </button>
      </section>
    </div>
  );
}
