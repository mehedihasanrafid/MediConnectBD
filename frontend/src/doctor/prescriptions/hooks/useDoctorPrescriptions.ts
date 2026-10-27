import { useCallback, useEffect, useState } from "react";

import { prescriptionsApi } from "../../../api/prescriptions";
import type { Prescription } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";

/**
 * Custom hook managing the doctor's issued prescriptions list, updates, and 24h deletions.
 */
export function useDoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPrescriptions = useCallback(async () => {
    try {
      const result = await prescriptionsApi.listDoctorPrescriptions();
      setPrescriptions(result.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load your issued prescriptions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void prescriptionsApi
      .listDoctorPrescriptions()
      .then((result) => {
        if (!cancelled) setPrescriptions(result.items);
      })
      .catch((caught) => {
        if (!cancelled) {
          setError(getErrorMessage(caught, "Could not load your issued prescriptions."));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = useCallback(
    async (prescriptionId: string) => {
      setError(null);
      setNotice(null);
      try {
        await prescriptionsApi.remove(prescriptionId);
        setNotice("Prescription deleted.");
        await loadPrescriptions();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not delete prescription."));
      }
    },
    [loadPrescriptions],
  );

  return {
    prescriptions,
    loading,
    error,
    setError,
    notice,
    setNotice,
    loadPrescriptions,
    handleDelete,
  };
}
