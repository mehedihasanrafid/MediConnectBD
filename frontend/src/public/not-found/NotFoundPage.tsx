import { ButtonLink } from "../../shared/ui";
import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <div className={styles.root}>
      <span className={styles.code}>404</span>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.description}>
        The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
      </p>
      <div className={styles.action}>
        <ButtonLink to="/doctors" size="lg">
          Find a doctor
        </ButtonLink>
      </div>
    </div>
  );
}
