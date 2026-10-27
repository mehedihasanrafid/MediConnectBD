import { useCallback, useEffect, useState } from "react";

import { adminApi } from "../../../api/admin";
import type { AdminOverview } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";

/**
 * Custom hook owning async loading and refresh state for the Admin Overview dashboard.
 */
export function useAdminOverview() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getOverview();
      setOverview(res);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load platform overview."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void adminApi
      .getOverview()
      .then((res) => {
        if (!cancelled) setOverview(res);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load platform overview."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { overview, loading, error, refresh };
}
