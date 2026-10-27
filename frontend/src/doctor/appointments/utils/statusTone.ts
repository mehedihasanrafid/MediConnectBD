export function appointmentStatusTone(status: string): string {
  if (status === "CONFIRMED" || status === "COMPLETED") return "success";
  if (status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED" || status === "PAYMENT_EXPIRED" || status === "NO_SHOW") {
    return "danger";
  }
  return "neutral";
}
