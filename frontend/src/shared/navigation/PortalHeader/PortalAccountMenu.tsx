import { Home, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../features/auth/AuthContext";
import {
  Avatar, DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "../../ui";
import { portalConfigs, type PortalRole } from "./portalHeader.config";
import styles from "./PortalHeader.module.css";

export function PortalAccountMenu({ role }: { role: PortalRole }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const config = portalConfigs[role];
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const displayName = role === "DOCTOR" && !/^dr\.?\s/i.test(name) ? `Dr. ${name}` : name;
  const signOut = async () => {
    try { await logout(); } finally { navigate("/login"); }
  };
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button type="button" className={styles.account} aria-label={`Account menu for ${displayName}`}>
        <Avatar name={displayName || config.label} src={role === "DOCTOR" ? user?.doctorProfile?.photoUrl : null}
          size="sm" className={styles.avatar} />
        <span className={styles.accountName}>{role === "DOCTOR" ? displayName : user?.firstName ?? config.label}</span>
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className={styles.accountMenu}>
      <div className={styles.menuIdentity}><strong>{displayName}</strong><span>{user?.email}</span></div>
      {config.links.map(({ to, label, icon: Icon }) => <DropdownMenuItem key={to} onClick={() => navigate(to)}>
        <Icon size={15} aria-hidden="true" /> {label}
      </DropdownMenuItem>)}
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => navigate("/")}><Home size={15} aria-hidden="true" /> Website home</DropdownMenuItem>
      <DropdownMenuItem className={styles.signOut} onClick={() => void signOut()}>
        <LogOut size={15} aria-hidden="true" /> Sign Out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
