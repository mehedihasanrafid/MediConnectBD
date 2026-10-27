import { useCallback, useEffect, useState } from "react";

import { adminApi } from "../../../api/admin";
import { getErrorMessage } from "../../../shared/utils/apiError";
import { toSlug } from "../utils/slug";

export interface AdminSpecialtyItem {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface AdminHospitalItem {
  id: string;
  name: string;
  slug: string;
  area: string;
  address: string;
  isActive: boolean;
}

/**
 * Custom hook managing specialties and hospitals CRUD for the Admin Catalog page.
 */
export function useAdminCatalog() {
  const [specialties, setSpecialties] = useState<AdminSpecialtyItem[]>([]);
  const [hospitals, setHospitals] = useState<AdminHospitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadCatalog = useCallback(async () => {
    try {
      const [specRes, hospRes] = await Promise.all([
        adminApi.listSpecialties<AdminSpecialtyItem>(),
        adminApi.listHospitals<AdminHospitalItem>(),
      ]);
      setSpecialties(specRes.items);
      setHospitals(hospRes.items);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not load catalog data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      adminApi.listSpecialties<AdminSpecialtyItem>(),
      adminApi.listHospitals<AdminHospitalItem>(),
    ])
      .then(([specRes, hospRes]) => {
        if (cancelled) return;
        setSpecialties(specRes.items);
        setHospitals(hospRes.items);
      })
      .catch((caught) => {
        if (!cancelled) setError(getErrorMessage(caught, "Could not load catalog data."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const createSpecialty = useCallback(
    async (name: string) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await adminApi.createSpecialty({ name: name.trim(), slug: toSlug(name) });
        setNotice("Specialty created.");
        await loadCatalog();
        return true;
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not create specialty."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loadCatalog],
  );

  const toggleSpecialty = useCallback(
    async (item: AdminSpecialtyItem) => {
      setBusy(true);
      setError(null);
      try {
        if (item.isActive) {
          await adminApi.deleteSpecialty(item.id);
        } else {
          await adminApi.updateSpecialty(item.id, { isActive: true });
        }
        await loadCatalog();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not update specialty."));
      } finally {
        setBusy(false);
      }
    },
    [loadCatalog],
  );

  const createHospital = useCallback(
    async (input: { name: string; area: string; address: string }) => {
      setBusy(true);
      setError(null);
      setNotice(null);
      try {
        await adminApi.createHospital({
          name: input.name.trim(),
          slug: toSlug(input.name),
          area: input.area.trim(),
          address: input.address.trim(),
        });
        setNotice("Hospital created.");
        await loadCatalog();
        return true;
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not create hospital."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [loadCatalog],
  );

  const toggleHospital = useCallback(
    async (item: AdminHospitalItem) => {
      setBusy(true);
      setError(null);
      try {
        if (item.isActive) {
          await adminApi.deleteHospital(item.id);
        } else {
          await adminApi.updateHospital(item.id, { isActive: true });
        }
        await loadCatalog();
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not update hospital."));
      } finally {
        setBusy(false);
      }
    },
    [loadCatalog],
  );

  return {
    specialties,
    hospitals,
    loading,
    error,
    notice,
    busy,
    createSpecialty,
    toggleSpecialty,
    createHospital,
    toggleHospital,
  };
}
