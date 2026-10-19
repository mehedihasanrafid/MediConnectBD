/**
 * Shared consultation-mode values used by schedules, slots, and appointments. Persisted enum
 * values are a database/API contract; changing them requires migration and compatibility review.
 */

export enum ConsultationMode {
  VIDEO = "VIDEO",
  CHAMBER = "CHAMBER",
}
