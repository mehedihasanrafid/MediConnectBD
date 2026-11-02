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
      setTestedSound((curr: SoundKind | null) => (curr === kind ? null : curr));
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
            Manage interface appearance, auditory alerts preview, provider credentials, and authenticated session preferences.
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

      {/* Section 2: Account & Verification Overview (Truthful labels) */}
      <section className={styles.settingsCard} aria-labelledby="identity-settings-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="identity-settings-heading" className={styles.cardTitle}>
              <User size={18} />
              Provider Identity & Recorded Credentials
            </h2>
            <p className={styles.cardSubtitle}>
              Recorded professional identifier and platform application status.
            </p>
          </div>
        </div>

        <div className={styles.identityGrid}>
          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Practicing Name</span>
            <span className={styles.identityValue}>{doctorName}</span>
          </div>

          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>BMDC Registration Identifier</span>
            <span className={styles.identityValue}>{bmdcNumber}</span>
          </div>

          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Authenticated Email</span>
            <span className={styles.identityValue}>{user?.email || "—"}</span>
          </div>

          <div className={styles.identityItem}>
            <span className={styles.identityLabel}>Application Review Status</span>
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

      {/* Section 3: Auditory Chimes Preview & Time Synchronization */}
      <section className={styles.settingsCard} aria-labelledby="alerts-settings-heading">
        <div className={styles.cardHeader}>
          <div>
            <h2 id="alerts-settings-heading" className={styles.cardTitle}>
              <Volume2 size={18} />
              Auditory Chime Preview & Time Synchronization
            </h2>
            <p className={styles.cardSubtitle}>
              Preview synthesized Web Audio chime tones used during active clinic hours. Volume and output depend on local device sound settings.
            </p>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "var(--text-xs)", fontWeight: 700, marginBottom: "8px" }}>
            Preview Audio Chimes
          </label>
          <div className={styles.chimeGrid}>
            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("call")}
              aria-label="Preview incoming video call sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "call" ? "Playing Call Chime..." : "Preview Video Call Chime"}</span>
            </button>

            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("notification")}
              aria-label="Preview patient queue arrival sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "notification" ? "Playing Arrival Chime..." : "Preview Arrival Chime"}</span>
            </button>

            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("complete")}
              aria-label="Preview consultation completion sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "complete" ? "Playing Complete Chime..." : "Preview Session Complete"}</span>
            </button>

            <button
              type="button"
              className={styles.chimeButton}
              onClick={() => handleTestSound("success")}
              aria-label="Preview prescription issuance sound chime"
            >
              <Volume2 size={14} />
              <span>{testedSound === "success" ? "Playing Rx Chime..." : "Preview Rx Issuance Chime"}</span>
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
              Credential & Session Policy
            </strong>
            Doctor account credentials and profile records are managed by system administrators. To update your login email
            or reset credentials, please contact support@mediconnectbd.com.
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
