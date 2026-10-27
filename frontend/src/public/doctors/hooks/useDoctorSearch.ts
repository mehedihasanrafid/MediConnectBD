import { useEffect, useState } from "react";

import { api } from "../../../shared/api";
import type { DoctorListResponse, PublicDoctor, Specialty } from "../../../shared/types";

/**
 * Owns doctor directory search, specialty filter, and debounced API loading.
 */
export function useDoctorSearch() {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api
      .get<{ items: Specialty[] }>("/catalog/specialties")
      .then((result) => setSpecialties(result.items))
      .catch(() => setSpecialties([]));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (specialty) params.set("specialty", specialty);
    params.set("limit", "12");

    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void api
        .get<DoctorListResponse>(`/doctors?${params.toString()}`)
        .then((result) => {
          if (!controller.signal.aborted) setDoctors(result.items);
        })
        .catch(() => {
          if (!controller.signal.aborted) setError("Could not load doctors. Is the API running?");
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [search, specialty]);

  return {
    doctors,
    specialties,
    search,
    setSearch,
    specialty,
    setSpecialty,
    loading,
    error,
  };
}
