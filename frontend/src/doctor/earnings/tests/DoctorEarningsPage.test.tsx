import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { DoctorEarningsPage } from "../DoctorEarningsPage";
import type { DoctorEarningsSummary, DoctorAppointment } from "../../../shared/types";

// Mock doctors API
vi.mock("../../../api/doctors", () => ({
  doctorsApi: {
    getMyEarnings: vi.fn().mockResolvedValue({
      totals: {
        succeededPayments: 5,
        completedConsultations: 5,
        grossAmount: "6500.00",
        commissionAmount: "650.00",
        netAmount: "5850.00",
      },
      byDay: [
        {
          period: "2026-11-01",
          appointmentsCount: 3,
          grossAmount: "3900.00",
          commissionAmount: "390.00",
          netAmount: "3510.00",
        },
        {
          period: "2026-11-02",
          appointmentsCount: 2,
          grossAmount: "2600.00",
          commissionAmount: "260.00",
          netAmount: "2340.00",
        },
      ],
      byMonth: [
        {
          period: "2026-11",
          appointmentsCount: 5,
          grossAmount: "6500.00",
          commissionAmount: "650.00",
          netAmount: "5850.00",
        },
      ],
    }),
    listMyAppointments: vi.fn().mockResolvedValue({
      items: [],
    }),
  },
}));

describe("DoctorEarningsPage (Phase 6)", () => {
  const dummyEarnings: DoctorEarningsSummary = {
    totals: {
      succeededPayments: 8,
      completedConsultations: 8,
      grossAmount: "10000.00",
      commissionAmount: "1000.00",
      netAmount: "9000.00",
    },
    byDay: [
      {
        period: "2026-11-01",
        appointmentsCount: 5,
        grossAmount: "6000.00",
        commissionAmount: "600.00",
        netAmount: "5400.00",
      },
      {
        period: "2026-11-02",
        appointmentsCount: 3,
        grossAmount: "4000.00",
        commissionAmount: "400.00",
        netAmount: "3600.00",
      },
    ],
    byMonth: [
      {
        period: "2026-11",
        appointmentsCount: 8,
        grossAmount: "10000.00",
        commissionAmount: "1000.00",
        netAmount: "9000.00",
      },
    ],
  };

  const dummyAppointments: DoctorAppointment[] = [
    {
      id: "appt-1",
      patientProfileId: "patient-1",
      doctorId: "doc-1",
      holdId: "hold-1",
      scheduledStartAt: "2026-11-01T10:00:00Z",
      scheduledEndAt: "2026-11-01T10:20:00Z",
      mode: "VIDEO",
      status: "COMPLETED",
      feeAmount: 1200,
      paymentRequired: true,
      paymentReference: "PAY-1",
      cancellationReason: null,
      createdAt: "2026-10-30T10:00:00Z",
      updatedAt: "2026-11-01T10:20:00Z",
      slot: {
        id: "slot-1",
        doctorId: "doc-1",
        startAt: "2026-11-01T10:00:00Z",
        endAt: "2026-11-01T10:20:00Z",
        mode: "VIDEO",
      },
      patient: {
        id: "p-1",
        userId: "u-1",
        firstName: "Karim",
        lastName: "Uddin",
        phone: "+8801700000000",
        email: "karim@example.com",
        gender: "MALE",
        dateOfBirth: "1985-05-10",
      },
    },
    {
      id: "appt-2",
      patientProfileId: "patient-2",
      doctorId: "doc-1",
      holdId: "hold-2",
      scheduledStartAt: "2026-11-01T11:00:00Z",
      scheduledEndAt: "2026-11-01T11:20:00Z",
      mode: "CHAMBER",
      status: "COMPLETED",
      feeAmount: 1500,
      paymentRequired: true,
      paymentReference: "PAY-2",
      cancellationReason: null,
      createdAt: "2026-10-30T11:00:00Z",
      updatedAt: "2026-11-01T11:20:00Z",
      slot: {
        id: "slot-2",
        doctorId: "doc-1",
        startAt: "2026-11-01T11:00:00Z",
        endAt: "2026-11-01T11:20:00Z",
        mode: "CHAMBER",
      },
      patient: {
        id: "p-2",
        userId: "u-2",
        firstName: "Fatima",
        lastName: "Begum",
        phone: "+8801800000000",
        email: "fatima@example.com",
        gender: "FEMALE",
        dateOfBirth: "1990-08-15",
      },
    },
  ];

  it("renders loading state when initial data is not provided", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorEarningsPage />
      </MemoryRouter>
    );

    expect(html).toContain("Doctor Earnings &amp; Financial Performance");
    expect(html).toContain("Loading real-time financial ledger...");
  });

  it("renders 5 KPI cards with real formatted amounts", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorEarningsPage initialEarnings={dummyEarnings} initialAppointments={dummyAppointments} />
      </MemoryRouter>
    );

    // Net earnings (90%)
    expect(html).toContain("Net Doctor Earnings (90%)");
    expect(html).toContain("৳9000.00");

    // Gross revenue
    expect(html).toContain("Gross Patient Billing");
    expect(html).toContain("৳10000.00");

    // Platform Fee (10%)
    expect(html).toContain("Platform Service Fee (10%)");
    expect(html).toContain("৳1000.00");

    // Counters
    expect(html).toContain("Completed Consultations");
    expect(html).toContain("8");
    expect(html).toContain("Settled Transactions");
  });

  it("renders the revenue over time period tabs and data table", () => {
    const rawHtml = renderToString(
      <MemoryRouter>
        <DoctorEarningsPage initialEarnings={dummyEarnings} initialAppointments={dummyAppointments} />
      </MemoryRouter>
    );
    const html = rawHtml.replace(/<!-- -->/g, "");

    expect(html).toContain("Revenue Over Time");
    expect(html).toContain("Daily (2)");
    expect(html).toContain("Monthly (1)");

    // Table headers
    expect(html).toContain("Period");
    expect(html).toContain("Visits");
    expect(html).toContain("Gross Billing");
    expect(html).toContain("Platform (10%)");
    expect(html).toContain("Net Payout");

    // Table rows for daily
    expect(html).toContain("2026-11-01");
    expect(html).toContain("৳5400.00");
    expect(html).toContain("2026-11-02");
    expect(html).toContain("৳3600.00");
  });

  it("renders consultation mode mix derived from real appointments", () => {
    const rawHtml = renderToString(
      <MemoryRouter>
        <DoctorEarningsPage initialEarnings={dummyEarnings} initialAppointments={dummyAppointments} />
      </MemoryRouter>
    );
    const html = rawHtml.replace(/<!-- -->/g, "");

    expect(html).toContain("Consultation Mix");
    expect(html).toContain("Completed: 2");
    expect(html).toContain("Video Sessions");
    expect(html).toContain("1 visits");
    expect(html).toContain("৳1200.00");
    expect(html).toContain("Physical Chamber");
    expect(html).toContain("৳1500.00");
  });

  it("renders institutional settlement notice explaining out-of-band disbursement", () => {
    const html = renderToString(
      <MemoryRouter>
        <DoctorEarningsPage initialEarnings={dummyEarnings} initialAppointments={dummyAppointments} />
      </MemoryRouter>
    );

    expect(html).toContain("Institutional Settlement Policy");
    expect(html).toContain("MediConnectBD disburses verified doctor balances monthly");
    expect(html).not.toContain("Request Payout"); // Zero fake buttons
  });

  it("renders clean zero-state when periods list is empty", () => {
    const emptyEarnings: DoctorEarningsSummary = {
      totals: {
        succeededPayments: 0,
        completedConsultations: 0,
        grossAmount: "0.00",
        commissionAmount: "0.00",
        netAmount: "0.00",
      },
      byDay: [],
      byMonth: [],
    };

    const html = renderToString(
      <MemoryRouter>
        <DoctorEarningsPage initialEarnings={emptyEarnings} initialAppointments={[]} />
      </MemoryRouter>
    );

    expect(html).toContain("৳0.00");
    expect(html).toContain("No settled revenue records found for this period filter.");
  });
});
