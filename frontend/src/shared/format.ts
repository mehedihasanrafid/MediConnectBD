/**
 * Formats backend UTC instants for display in Bangladesh time. The backend stores UTC and the
 * product requires all times shown in Asia/Dhaka.
 */

const DHAKA_TIME_ZONE = "Asia/Dhaka";

export function formatDhakaDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatDhakaDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIME_ZONE,
    dateStyle: "medium",
  }).format(new Date(iso));
}

export function formatDhakaTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: DHAKA_TIME_ZONE,
    timeStyle: "short",
  }).format(new Date(iso));
}

export function formatMoney(amount: number | string | null): string {
  if (amount === null) return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  return `৳${value.toFixed(2)}`;
}

export function formatStatus(status: string): string {
  return status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
