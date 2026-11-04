/**
 * Main layout shell for public visitors, patients, and doctors.
 */

import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { WebsiteHeader } from "./WebsiteHeader";
import { SiteFooter } from "../public/shell/SiteFooter";
import { Container } from "../shared/ui";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className={styles.root}>
      <WebsiteHeader />
      <main className={styles.main}>
        {isHome ? (
          <Outlet />
        ) : (
          <Container size={user ? "2xl" : "lg"}>
            <Outlet />
          </Container>
        )}
      </main>
      {!user && !loading && <SiteFooter />}
    </div>
  );
}
