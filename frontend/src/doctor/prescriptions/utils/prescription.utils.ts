import type { Medicine } from "../../../shared/types";

/**
 * Creates a blank default medicine item.
 */
export function createEmptyMedicine(): Medicine {
  return {
    name: "",
    dosage: "500mg",
    frequency: "Twice daily",
    duration: "5 days",
  };
}

/**
 * Parses comma-separated clinical test string into trimmed array.
 */
export function parseTestsInput(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * Formats tests array back to comma-separated display string.
 */
export function formatTestsInput(tests: string[]): string {
  return (tests ?? []).join(", ");
}
