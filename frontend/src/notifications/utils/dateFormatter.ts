/**
 * Precise Bangladesh local date and time formatting utilities.
 * All clinical, billing, and operational notices in MediConnect BD
 * are displayed in Asia/Dhaka time.
 */

const DHAKA_TIME_ZONE = "Asia/Dhaka";

/**
 * Formats an ISO timestamp into exact Bangladesh standard date and time.
 * Example output: "31 Oct 2026 · 01:20 PM"
 */
export function formatDhakaNotificationTime(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;

    const dateFormatter = new Intl.DateTimeFormat("en-GB", {
      timeZone: DHAKA_TIME_ZONE,
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const timeFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: DHAKA_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const formattedDate = dateFormatter.format(date);
    const formattedTime = timeFormatter.format(date);

    return `${formattedDate} · ${formattedTime}`;
  } catch {
    return iso;
  }
}

/**
 * Returns a human-friendly relative label (e.g., "Just now", "15m ago", "2h ago", "Yesterday").
 */
export function getRelativeNotificationTime(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0 || diffMs < 60_000) return "Just now";
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return formatDhakaNotificationTime(iso);
  } catch {
    return "";
  }
}
