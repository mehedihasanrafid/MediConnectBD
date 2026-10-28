import { useEffect, useState } from "react";

import { doctorsApi } from "../../../api/doctors";
import type { Hospital, PublicDoctor, Specialty } from "../../../shared/types";
import { buildDoctorSearchParams } from "../utils/doctorSearch.utils";

/**
 * Owns doctor directory search, filters (specialty, hospital, area, fee range), and debounced API loading.
 */
export function useDoctorSearch() {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [hospital, setHospital] = useState("");
  const [area, setArea] = useState("");
  const [minFee, setMinFee] = useState("");
  const [maxFee, setMaxFee] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      doctorsApi.listSpecialties().catch(() => ({ items: [] as Specialty[] })),
      doctorsApi.listHospitals().catch(() => ({ items: [] as Hospital[] })),
    ]).then(([specRes, hospRes]) => {
      if (!cancelled) {
        setSpecialties(specRes.items);
        setHospitals(hospRes.items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasActiveFilters = Boolean(
    search.trim() ||
      specialty.trim() ||
      hospital.trim() ||
      area.trim() ||
      minFee.trim() ||
      maxFee.trim(),
  );

  function clearFilters() {
    setSearch("");
    setSpecialty("");
    setHospital("");
    setArea("");
    setMinFee("");
    setMaxFee("");
  }

  useEffect(() => {
    const controller = new AbortController();
    const params = buildDoctorSearchParams({
      search,
      specialty,
      hospital,
      area,
      minFee,
      maxFee,
    });

    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);
      void doctorsApi
        .listPublic(params.toString())
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
  }, [search, specialty, hospital, area, minFee, maxFee]);

  return {
    doctors,
    specialties,
    hospitals,
    search,
    setSearch,
    specialty,
    setSpecialty,
    hospital,
    setHospital,
    area,
    setArea,
    minFee,
    setMinFee,
    maxFee,
    setMaxFee,
    clearFilters,
    hasActiveFilters,
    loading,
    error,
  };
}
