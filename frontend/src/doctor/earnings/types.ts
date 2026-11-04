import type {
  DoctorAppointment,
  DoctorEarningsPeriod,
  DoctorEarningsSummary,
} from "../../shared/types";

export interface DoctorEarningsPageProps {
  initialEarnings?: DoctorEarningsSummary | null;
  initialAppointments?: DoctorAppointment[];
}

export type PeriodTab = "day" | "month";

export interface ConsultationMixStats {
  totalCount: number;
  videoCount: number;
  videoPct: number;
  chamberCount: number;
  chamberPct: number;
}

export interface EarningsHeaderProps {
  isLoading: boolean;
  onRefresh: () => void;
}

export interface EarningsErrorBannerProps {
  error: string;
  onRetry: () => void;
}

export interface EarningsKpiGridProps {
  totals: DoctorEarningsSummary["totals"];
}

export interface RevenueBreakdownCardProps {
  byDay: DoctorEarningsPeriod[];
  byMonth: DoctorEarningsPeriod[];
}

export interface ConsultationMixCardProps {
  mixStats: ConsultationMixStats;
}
