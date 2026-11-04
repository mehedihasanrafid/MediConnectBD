import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { EarningsHeader } from "../EarningsHeader";
import { EarningsKpiGrid } from "../EarningsKpiGrid";
import { RevenueBreakdownCard } from "../RevenueBreakdownCard";
import { ConsultationMixCard } from "../ConsultationMixCard";
import { SettlementNoticeCard } from "../SettlementNoticeCard";
import type { DoctorEarningsSummary } from "../../../shared/types";
import type { ConsultationMixStats } from "../types";

describe("Doctor Earnings Subcomponents", () => {
  const dummyTotals: DoctorEarningsSummary["totals"] = {
    succeededPayments: 10,
    completedConsultations: 12,
    grossAmount: "15000.00",
    commissionAmount: "1500.00",
    netAmount: "13500.00",
  };

  const dummyEarnings: DoctorEarningsSummary = {
    totals: dummyTotals,
    byDay: [
      {
        period: "2026-11-01",
        appointmentsCount: 4,
        grossAmount: "5000.00",
        commissionAmount: "500.00",
        netAmount: "4500.00",
      },
    ],
    byMonth: [
      {
        period: "2026-11",
        appointmentsCount: 12,
        grossAmount: "15000.00",
        commissionAmount: "1500.00",
        netAmount: "13500.00",
      },
    ],
  };

  const dummyMixStats: ConsultationMixStats = {
    totalCount: 12,
    videoCount: 8,
    videoPct: 67,
    chamberCount: 4,
    chamberPct: 33,
  };

  it("renders EarningsHeader with refresh button and title", () => {
    const onRefresh = vi.fn();
    const html = renderToString(
      <MemoryRouter>
        <EarningsHeader isLoading={false} onRefresh={onRefresh} />
      </MemoryRouter>
    );

    expect(html).toContain("Doctor Earnings &amp; Financial Performance");
    expect(html).toContain("Refresh Records");
  });

  it("renders EarningsKpiGrid with accurate net and gross billing", () => {
    const html = renderToString(<EarningsKpiGrid totals={dummyTotals} />);

    expect(html).toContain("৳13500.00");
    expect(html).toContain("৳15000.00");
    expect(html).toContain("৳1500.00");
    expect(html).toContain("12");
    expect(html).toContain("10");
  });

  it("renders RevenueBreakdownCard with period bars and ledger table", () => {
    const rawHtml = renderToString(
      <RevenueBreakdownCard byDay={dummyEarnings.byDay} byMonth={dummyEarnings.byMonth} />
    );
    const html = rawHtml.replace(/<!-- -->/g, "");

    expect(html).toContain("Revenue Over Time");
    expect(html).toContain("Daily (1)");
    expect(html).toContain("Monthly (1)");
    expect(html).toContain("2026-11-01");
    expect(html).toContain("৳4500.00");
  });

  it("renders ConsultationMixCard with video and chamber statistics", () => {
    const rawHtml = renderToString(<ConsultationMixCard mixStats={dummyMixStats} />);
    const html = rawHtml.replace(/<!-- -->/g, "");

    expect(html).toContain("Completed Consultations by Mode");
    expect(html).toContain("Total: 12 visits");
    expect(html).toContain("8 visits");
    expect(html).toContain("67% of total");
    expect(html).toContain("4 visits");
    expect(html).toContain("33% of total");
  });

  it("renders SettlementNoticeCard with standard policy disclaimer", () => {
    const html = renderToString(<SettlementNoticeCard />);

    expect(html).toContain("Settlement &amp; Payout Policy");
    expect(html).toContain("Payout scheduling and settlement information are not available in this dashboard.");
  });
});
