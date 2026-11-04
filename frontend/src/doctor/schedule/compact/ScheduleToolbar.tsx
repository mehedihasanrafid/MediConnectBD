import { MoreHorizontal, Plus } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../shared/ui";
import styles from "./ScheduleView.module.css";

export function ScheduleToolbar({ approved, leaveCount, busy, generating, onHours, onLeave, onEmergency, onGenerate }: {
  approved: boolean; leaveCount: number; busy: boolean; generating: boolean;
  onHours: () => void; onLeave: () => void; onEmergency: () => void; onGenerate: () => void;
}) {
  return <div className={styles.toolbar}>
    <div className={styles.title}><h1 id="schedule-page-title" tabIndex={-1}>Schedule &amp; Leave</h1>
      <span className={styles.muted}>Dhaka · UTC+6</span></div>
    {approved && <div className={styles.actions}>
      <Button size="sm" onClick={onHours} disabled={busy} leftIcon={<Plus size={14} aria-hidden="true" />}>Hours</Button>
      <Button size="sm" variant="secondary" onClick={onLeave} disabled={busy}>Leave{leaveCount > 0 ? ` (${leaveCount})` : ""}</Button>
      <DropdownMenu><DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" aria-label="More schedule actions" disabled={busy || generating}>
          <MoreHorizontal size={18} aria-hidden="true" /></Button>
      </DropdownMenuTrigger><DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onGenerate} disabled={generating}>Generate 7-day slots</DropdownMenuItem>
        <DropdownMenuItem onClick={onEmergency}>Emergency leave</DropdownMenuItem>
      </DropdownMenuContent></DropdownMenu>
      {generating && <span className={styles.muted} role="status">Generating slots…</span>}
    </div>}
  </div>;
}
