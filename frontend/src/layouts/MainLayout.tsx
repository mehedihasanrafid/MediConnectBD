/**
 * Main layout shell for public visitors, patients, and doctors.
 */

import { Outlet } from "react-router-dom";
import { PublicHeader } from "../public/shell/PublicHeader";
import { SiteFooter } from "../public/shell/SiteFooter";
import { Container } from "../shared/ui";
import styles from "./MainLayout.module.css";

export function MainLayout() {
  return (
    <div className={styles.root}>
      <PublicHeader />
      <main className={styles.main}>
        <Container size="lg">
          <Outlet />
        </Container>
      </main>
      <SiteFooter />
    </div>
  );
}
