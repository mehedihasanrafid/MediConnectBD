import { Dialog, DialogContent } from "../../shared/ui";
export function CommunicationHelp({ onClose }: { onClose: () => void }) {
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent title="Messaging help" description="Messages update automatically while this page is visible.">
      <ul>
        <li>Consultations follow the appointment's messaging and video access windows.</li>
        <li>Colleagues are approved doctors. Support connects you with an assigned support agent.</li>
        <li>Voice and video calls ring while the other person has the app open. They must accept before entering the room.</li>
        <li>Chat attachments are unavailable. Patient medical reports remain in their dedicated section.</li>
      </ul>
    </DialogContent>
  </Dialog>;
}
