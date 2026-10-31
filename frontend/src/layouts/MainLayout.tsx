/**
 * Main layout shell for public visitors, patients, and doctors.
 */

import { Outlet } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { PublicHeader } from "../public/shell/PublicHeader";
import { SiteFooter } from "../public/shell/SiteFooter";
import { Container } from "../shared/ui";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const { user, loading } = useAuth();

  return (
    <div className={styles.root}>
      <PublicHeader />
      <main className={styles.main}>
        <Container size="lg">
          <Outlet />
        </Container>
      </main>
      {!user && !loading && <SiteFooter />}
    </div>
  );
}
