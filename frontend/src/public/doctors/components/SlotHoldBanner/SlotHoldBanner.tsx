import { Alert, Button, Card } from "../../../../components/ui";
import type { FamilyMember, PublicUser, SlotHold } from "../../../../shared/types";
import { formatDhakaTime } from "../../../../shared/utils/format";
import styles from "./SlotHoldBanner.module.css";

interface SlotHoldBannerProps {
  hold: SlotHold;
  user: PublicUser | null;
  familyMembers: FamilyMember[];
  selectedFamilyMemberId: string;
  onSelectFamilyMember: (id: string) => void;
  onConfirmBook: () => Promise<void>;
  onReleaseHold: () => Promise<void>;
}

/**
 * Displays the active 10-minute Redis slot hold countdown banner and family-member selector.
 */
export function SlotHoldBanner({
  hold,
  user,
  familyMembers,
  selectedFamilyMemberId,
  onSelectFamilyMember,
  onConfirmBook,
  onReleaseHold,
}: SlotHoldBannerProps) {
  return (
    <Card className={`hold-banner ${styles.banner}`}>
      <Alert kind="info">
        Slot held until {formatDhakaTime(hold.expiresAt)} (Bangladesh time). Confirm before it
        expires.
      </Alert>
      {familyMembers.length > 0 && (
        <label className={`field ${styles.selector}`}>
          <span>Who is this appointment for?</span>
          <select
            value={selectedFamilyMemberId}
            onChange={(e) => onSelectFamilyMember(e.target.value)}
          >
            <option value="">
              Myself ({user?.firstName} {user?.lastName})
            </option>
            {familyMembers.map((fm) => (
              <option key={fm.id} value={fm.id}>
                {fm.name} ({fm.relationship})
              </option>
            ))}
          </select>
        </label>
      )}
      <div className={`row ${styles.actions}`}>
        <Button onClick={() => void onConfirmBook()}>Confirm booking</Button>
        <Button variant="secondary" onClick={() => void onReleaseHold()}>
          Release hold
        </Button>
      </div>
    </Card>
  );
}
