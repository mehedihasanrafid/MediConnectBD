import { MessageSquare } from "lucide-react";
import { useLocation } from "react-router-dom";

export function CommunicationNavItem(props: {
  onNavigate: () => void;
  itemClassName: string;
  activeClassName: string;
  iconClassName: string;
  labelClassName: string;
}) {
  const { pathname } = useLocation();
  const active = ["/communication", "/messages", "/doctor/communication"].includes(pathname);
  return <button type="button" onClick={props.onNavigate} title="Consultation Messages"
    aria-current={active ? "page" : undefined}
    className={`${props.itemClassName} ${active ? props.activeClassName : ""}`}>
    <span className={props.iconClassName}><MessageSquare size={18} aria-hidden="true" /></span>
    <span className={props.labelClassName}>Consultation Messages</span>
  </button>;
}
