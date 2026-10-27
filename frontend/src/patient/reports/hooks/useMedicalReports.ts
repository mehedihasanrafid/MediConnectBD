import { useCallback, useEffect, useState } from "react";

import { reportsApi } from "../../../api/reports";
import type { MedicalReportSummary } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";

/**
 * Custom hook owning medical report loading, upload, download, and deletion.
 */
export function useMedicalReports() {
  const [reports, setReports] = useState<MedicalReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    try {
      const res = await reportsApi.listMyReports();
      setReports(res.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load your medical reports."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void reportsApi
      .listMyReports()
      .then((res) => {
        if (!cancelled) setReports(res.items);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load your medical reports."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = useCallback(
    async (reportId: string) => {
      setError(null);
      setNotice(null);
      try {
        await reportsApi.deleteReport(reportId);
        setNotice("Medical report deleted.");
        await loadReports();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not delete medical report."));
      }
    },
    [loadReports],
  );

  return {
    reports,
    loading,
    error,
    setError,
    notice,
    setNotice,
    loadReports,
    handleDelete,
  };
}
