import { ChevronRight, Home, Menu } from "lucide-react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { NotificationBell } from "../../../notifications";
import { ThemeToggle } from "../../theme";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../ui";
import { DhakaClock } from "./DhakaClock";
import { PortalAccountMenu } from "./PortalAccountMenu";
import { headerPageTitle } from "./pageTitles";
import { portalConfigs, publicLinks, type PortalRole } from "./portalHeader.config";
import styles from "./PortalHeader.module.css";

export interface PortalHeaderProps {
  role: PortalRole;
  onToggleMobile?: () => void;
  isMobileOpen?: boolean;
  publicPage?: boolean;
}

export function PortalHeader({ role, onToggleMobile, isMobileOpen = false, publicPage = false }: PortalHeaderProps) {
  const { pathname, search } = useLocation();
  const config = portalConfigs[role];
  const Icon = config.icon;
  return <header className={styles.header} aria-label={`${config.label} Utility Header`}>
    <div className={styles.identity}>
      {onToggleMobile && <button type="button" className={styles.mobileToggle} onClick={onToggleMobile}
        aria-expanded={isMobileOpen} aria-label={isMobileOpen ? "Close navigation menu" : "Open navigation menu"}>
        <Menu size={20} aria-hidden="true" />
      </button>}
      {publicPage && <DropdownMenu>
        <DropdownMenuTrigger asChild><button type="button" className={styles.mobileToggle} aria-label="Open website navigation">
          <Menu size={20} aria-hidden="true" />
        </button></DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {[...publicLinks, { to: config.home, label: config.portal }].map(({ to, label }) =>
            <DropdownMenuItem key={to} asChild><Link to={to}>{label}</Link></DropdownMenuItem>)}
        </DropdownMenuContent>
      </DropdownMenu>}
      <Link className={styles.brand} to={config.home} aria-label={`MediConnect BD ${config.portal}`}>
        <span className={styles.brandIcon}><Icon size={18} aria-hidden="true" /></span>
        <span className={styles.brandName}>MediConnect BD</span><span className={styles.badge}>{config.label}</span>
      </Link>
      <nav className={styles.breadcrumbs} aria-label="Breadcrumb navigation">
        <Link to={config.home}>{config.portal}</Link><ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{headerPageTitle(pathname, search)}</span>
      </nav>
    </div>
    <div className={styles.actions}>
      {publicPage ? <nav className={styles.websiteLinks} aria-label="Website navigation">
        {publicLinks.map(({ to, label }) => <NavLink key={to} to={to} end>{label}</NavLink>)}
        <Link className={styles.portalLink} to={config.home}>{config.portal}</Link>
      </nav> : <Link className={styles.websiteHome} to="/" aria-label="Website home"><Home size={17} aria-hidden="true" /></Link>}
      <DhakaClock />
      <NotificationBell />
      {!publicPage && <ThemeToggle />}
      <PortalAccountMenu role={role} />
    </div>
  </header>;
}
