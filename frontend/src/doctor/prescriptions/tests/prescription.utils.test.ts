import { describe, expect, it } from "vitest";

import {
  createEmptyMedicine,
  formatTestsInput,
  parseTestsInput,
} from "../utils/prescription.utils";

describe("prescription.utils", () => {
  it("creates empty medicine template", () => {
    const med = createEmptyMedicine();
    expect(med.name).toBe("");
    expect(med.dosage).toBe("500mg");
    expect(med.frequency).toBe("Twice daily");
  });

  it("parses comma-separated tests string", () => {
    expect(parseTestsInput("CBC, Serum Creatinine, Lipid Profile")).toEqual([
      "CBC",
      "Serum Creatinine",
      "Lipid Profile",
    ]);
    expect(parseTestsInput("  ,   ")).toEqual([]);
  });

  it("formats tests array to string", () => {
    expect(formatTestsInput(["X-Ray", "MRI"])).toBe("X-Ray, MRI");
  });
});
