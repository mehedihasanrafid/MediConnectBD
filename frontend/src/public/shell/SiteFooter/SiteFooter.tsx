import { Stethoscope } from "lucide-react";
import { Link } from "react-router-dom";
import { Container } from "../../../shared/ui";
import styles from "./SiteFooter.module.css";

const CURRENT_YEAR = new Date().getFullYear();

export function SiteFooter() {
  const year = CURRENT_YEAR;

  return (
    <footer className={styles.root}>
      <Container size="lg">
        <div className={styles.grid}>
          <div className={styles.brandCol}>
            <Link to="/" className={styles.brand}>
              <span className={styles.brandIcon} aria-hidden>
                <Stethoscope size={18} />
              </span>
              <span className={styles.brandName}>
                MediConnect <strong>BD</strong>
              </span>
            </Link>
            <p className={styles.tagline}>
              Find trusted doctors across Bangladesh, book appointments, and consult online.
            </p>
          </div>

          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Platform</h4>
            <ul className={styles.linkList} role="list">
              <li>
                <Link to="/doctors">Find doctors</Link>
              </li>
              <li>
                <Link to="/verify-prescription">Verify prescription</Link>
              </li>
              <li>
                <Link to="/login">Sign in</Link>
              </li>
              <li>
                <Link to="/register">Create account</Link>
              </li>
            </ul>
          </div>

          <div className={styles.linksCol}>
            <h4 className={styles.colTitle}>Specialties</h4>
            <ul className={styles.linkList} role="list">
              <li>
                <Link to="/doctors?specialty=cardiology">Cardiology</Link>
              </li>
              <li>
                <Link to="/doctors?specialty=medicine">General Medicine</Link>
              </li>
              <li>
                <Link to="/doctors?specialty=pediatrics">Pediatrics</Link>
              </li>
              <li>
                <Link to="/doctors?specialty=dermatology">Dermatology</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className={styles.bottomBar}>
          <p className={styles.copyright}>
            © {year} MediConnect BD. All rights reserved.
          </p>
          <p className={styles.disclaimer}>
            In case of emergency, please visit the nearest hospital or call 999.
          </p>
        </div>
      </Container>
    </footer>
  );
}
