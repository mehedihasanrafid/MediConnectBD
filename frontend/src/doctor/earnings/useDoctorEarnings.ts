import { useCallback, useEffect, useMemo, useState } from "react";
import { doctorsApi } from "../../api/doctors";
import type { DoctorAppointment, DoctorEarningsSummary } from "../../shared/types";
import type { ConsultationMixStats, DoctorEarningsPageProps } from "./types";

export function useDoctorEarnings({
  initialEarnings,
  initialAppointments,
}: DoctorEarningsPageProps = {}) {
  const [earnings, setEarnings] = useState<DoctorEarningsSummary | null>(initialEarnings ?? null);
  const [appointments, setAppointments] = useState<DoctorAppointment[]>(initialAppointments ?? []);
  const [isLoading, setIsLoading] = useState<boolean>(initialEarnings === undefined);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setError(null);
    try {
      const [earningsRes, appointmentsRes] = await Promise.all([
        doctorsApi.getMyEarnings(),
        doctorsApi.listMyAppointments(),
      ]);
      setEarnings(earningsRes);
      setAppointments(appointmentsRes.items || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load financial records";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setIsLoading(true);
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (initialEarnings === undefined) {
      void loadData();
    }
  }, [loadData, initialEarnings]);

  const mixStats = useMemo<ConsultationMixStats>(() => {
    const completed = appointments.filter((a) => a.status === "COMPLETED");
    const videoList = completed.filter((a) => a.mode === "VIDEO");
    const chamberList = completed.filter((a) => a.mode === "CHAMBER");

    const totalCount = completed.length;
    const videoPct = totalCount > 0 ? Math.round((videoList.length / totalCount) * 100) : 50;
    const chamberPct = totalCount > 0 ? 100 - videoPct : 50;

    return {
      totalCount,
      videoCount: videoList.length,
      videoPct,
      chamberCount: chamberList.length,
      chamberPct,
    };
  }, [appointments]);

  return {
    earnings,
    appointments,
    isLoading,
    error,
    handleRefresh,
    mixStats,
  };
}
