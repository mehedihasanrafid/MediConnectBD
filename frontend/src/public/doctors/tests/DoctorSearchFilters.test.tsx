import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Hospital, Specialty } from "../../../shared/types";
import { DoctorSearchFilters } from "../components/DoctorSearchFilters";

describe("DoctorSearchFilters component", () => {
  const dummySpecialties: Specialty[] = [
    { id: "spec-1", name: "Cardiology", slug: "cardiology" },
    { id: "spec-2", name: "Dermatology", slug: "dermatology" },
  ];

  const dummyHospitals: Hospital[] = [
    {
      id: "hosp-1",
      name: "Square Hospital",
      slug: "square-hospital",
      area: "Panthapath",
      address: "18F Bir Uttam Qazi Nuruzzaman Sarak",
    },
    {
      id: "hosp-2",
      name: "Evercare Hospital",
      slug: "evercare-hospital",
      area: "Bashundhara",
      address: "Plot 81, Block E, Bashundhara R/A",
    },
  ];

  it("renders all four filter inputs (hospital, area, min fee, max fee) alongside name and specialty", () => {
    const html = renderToString(
      <DoctorSearchFilters
        search="Rahman"
        onSearchChange={vi.fn()}
        specialty="cardiology"
        onSpecialtyChange={vi.fn()}
        specialties={dummySpecialties}
        hospital="square-hospital"
        onHospitalChange={vi.fn()}
        hospitals={dummyHospitals}
        area="Panthapath"
        onAreaChange={vi.fn()}
        minFee="500"
        onMinFeeChange={vi.fn()}
        maxFee="1500"
        onMaxFeeChange={vi.fn()}
        onClearFilters={vi.fn()}
        hasActiveFilters={true}
      />,
    );

    // Filter labels and fields
    expect(html).toContain("Search by name");
    expect(html).toContain("Specialty");
    expect(html).toContain("Hospital");
    expect(html).toContain("Area / Location");
    expect(html).toContain("Min fee (BDT)");
    expect(html).toContain("Max fee (BDT)");

    // Option values from props
    expect(html).toContain("Cardiology");
    expect(html).toContain("Square Hospital (Panthapath)");
    expect(html).toContain("Evercare Hospital (Bashundhara)");
    expect(html).toContain("Bashundhara");
    expect(html).toContain("Panthapath");

    // Action button
    expect(html).toContain("Clear filters");
  });

  it("disables Clear filters button when no active filters are set", () => {
    const html = renderToString(
      <DoctorSearchFilters
        search=""
        onSearchChange={vi.fn()}
        specialty=""
        onSpecialtyChange={vi.fn()}
        specialties={dummySpecialties}
        hospital=""
        onHospitalChange={vi.fn()}
        hospitals={dummyHospitals}
        area=""
        onAreaChange={vi.fn()}
        minFee=""
        onMinFeeChange={vi.fn()}
        maxFee=""
        onMaxFeeChange={vi.fn()}
        onClearFilters={vi.fn()}
        hasActiveFilters={false}
      />,
    );

    expect(html).toContain("disabled");
  });
});
