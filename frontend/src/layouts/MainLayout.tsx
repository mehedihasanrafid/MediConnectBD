/**
 * Main layout shell for public visitors, patients, and doctors.
 */

import { Outlet } from "react-router-dom";
import { PublicHeader } from "../public/shell/PublicHeader";

export function MainLayout() {
  return (
    <div className="app">
      <PublicHeader />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
