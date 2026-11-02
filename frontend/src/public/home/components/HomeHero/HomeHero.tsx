import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CalendarCheck,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Video,
} from "lucide-react";
import { Container } from "../../../../shared/ui";
import { HomeSearchForm } from "../HomeSearchForm";
import styles from "./HomeHero.module.css";

const HERO_IMAGE_SRC = "/images/home/hero-doctor-patient.webp";

export function HomeHero() {
  const [imageError, setImageError] = useState(false);

  return (
    <section className={styles.heroSection} aria-label="Hero search and healthcare overview">
      <Container size="lg">
        <div className={styles.heroGrid}>
          {/* Left: Text & Search Form */}
          <div className={styles.textContent}>
            <span className={styles.eyebrow}>
              <Sparkles size={14} aria-hidden="true" />
              <span>Healthcare made simpler in Bangladesh</span>
            </span>

            <h1 className={styles.title}>The right doctor, right when you need one.</h1>

            <p className={styles.description}>
              Find trusted doctors, compare transparent fees, and book chamber or video appointments
              in minutes.
            </p>

            <div className={styles.searchWrapper}>
              <HomeSearchForm />
            </div>

            <div>
              <Link to="/doctors" className={styles.secondaryAction}>
                <span>Browse all doctors</span>
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Right: Visual Illustration / Photo */}
          <div className={styles.visualColumn}>
            <div className={styles.imageCard}>
              {!imageError ? (
                <img
                  src={HERO_IMAGE_SRC}
                  alt="Doctor consulting with a patient in a modern healthcare clinic"
                  className={styles.heroImg}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className={styles.fallbackVisual} aria-hidden="true">
                  <div className={styles.fallbackIconCircle}>
                    <Stethoscope size={36} />
                  </div>
                  <div className={styles.fallbackText}>
                    Trusted chamber &amp; telehealth care across Bangladesh
                  </div>
                </div>
              )}

              {/* Floating capability badge */}
              <div className={styles.floatingBadge}>
                <div className={styles.floatingBadgeIcon} aria-hidden="true">
                  <Video size={16} />
                </div>
                <div className={styles.floatingBadgeText}>
                  <span className={styles.floatingBadgeTitle}>Chamber &amp; Video</span>
                  <span className={styles.floatingBadgeSubtitle}>Appointments</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust & Benefit Strip */}
        <div className={styles.trustBar}>
          <div className={styles.trustItem}>
            <div className={styles.trustIconCircle} aria-hidden="true">
              <ShieldCheck size={18} />
            </div>
            <span className={styles.trustLabel}>Verified doctor profiles</span>
          </div>

          <div className={styles.trustDivider} aria-hidden="true" />

          <div className={styles.trustItem}>
            <div className={styles.trustIconCircle} aria-hidden="true">
              <CalendarCheck size={18} />
            </div>
            <span className={styles.trustLabel}>Chamber &amp; video appointments</span>
          </div>

          <div className={styles.trustDivider} aria-hidden="true" />

          <div className={styles.trustItem}>
            <div className={styles.trustIconCircle} aria-hidden="true">
              <CreditCard size={18} />
            </div>
            <span className={styles.trustLabel}>Transparent fees</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
