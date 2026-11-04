import { Link } from "react-router-dom";
import styles from "../CommunicationPage.module.css";

export function CommunicationFeatures({ doctor }: { doctor: boolean }) {
  return <details className={styles.features}>
    <summary>Messaging, calls and file sharing — what is available?</summary>
    <ul>
      <li>Messages: open an authorized conversation and send text. Replies update automatically.</li>
      <li>Video: open the existing Daily consultation room when the server permits access.</li>
      <li>Voice and video calls: the other person must have the app open and accept before entering the call.</li>
      <li>Chat attachments: unavailable; files cannot be attached to messages.</li>
      <li>{doctor ? <Link to="/doctor/appointments">Open assigned appointments for patient records</Link> :
        <Link to="/reports">Upload or manage your medical reports</Link>}. Medical reports are separate from chat attachments.</li>
    </ul>
  </details>;
}
