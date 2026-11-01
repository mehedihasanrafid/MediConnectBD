import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { doctorsApi } from "../../../api/doctors";
import type { Hospital, PublicDoctor, Specialty } from "../../../shared/types";
import { buildDoctorSearchParams } from "../utils/doctorSearch.utils";

/**
 * Owns doctor directory search, filters (specialty, hospital, area, fee range), URL synchronization, and debounced API loading.
 */
export function useDoctorSearch() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize filters from current URL query parameters
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [specialty, setSpecialty] = useState(() => searchParams.get("specialty") ?? "");
  const [hospital, setHospital] = useState(() => searchParams.get("hospital") ?? "");
  const [area, setArea] = useState(() => searchParams.get("area") ?? "");
  const [minFee, setMinFee] = useState(() => searchParams.get("minFee") ?? "");
  const [maxFee, setMaxFee] = useState(() => searchParams.get("maxFee") ?? "");

  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Response metadata from API
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Avoid circular update loops between component state and URL state
  const isUpdatingUrlRef = useRef(false);

  // Sync state if browser back/forward changes URL search parameters
  useEffect(() => {
    if (isUpdatingUrlRef.current) {
      isUpdatingUrlRef.current = false;
      return;
    }
    const urlSearch = searchParams.get("search") ?? "";
    const urlSpecialty = searchParams.get("specialty") ?? "";
    const urlHospital = searchParams.get("hospital") ?? "";
    const urlArea = searchParams.get("area") ?? "";
    const urlMinFee = searchParams.get("minFee") ?? "";
    const urlMaxFee = searchParams.get("maxFee") ?? "";

    setSearch((prev) => (prev !== urlSearch ? urlSearch : prev));
    setSpecialty((prev) => (prev !== urlSpecialty ? urlSpecialty : prev));
    setHospital((prev) => (prev !== urlHospital ? urlHospital : prev));
    setArea((prev) => (prev !== urlArea ? urlArea : prev));
    setMinFee((prev) => (prev !== urlMinFee ? urlMinFee : prev));
    setMaxFee((prev) => (prev !== urlMaxFee ? urlMaxFee : prev));
  }, [searchParams]);

  // Synchronize URL search params as filters change (using replace: true)
  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (search.trim()) nextParams.set("search", search.trim());
    if (specialty.trim()) nextParams.set("specialty", specialty.trim());
    if (hospital.trim()) nextParams.set("hospital", hospital.trim());
    if (area.trim()) nextParams.set("area", area.trim());
    if (minFee.trim() && !Number.isNaN(Number(minFee))) nextParams.set("minFee", minFee.trim());
    if (maxFee.trim() && !Number.isNaN(Number(maxFee))) nextParams.set("maxFee", maxFee.trim());

    const currentSupported = new URLSearchParams();
    for (const key of ["search", "specialty", "hospital", "area", "minFee", "maxFee"]) {
      const val = searchParams.get(key);
      if (val) currentSupported.set(key, val);
    }

    if (nextParams.toString() !== currentSupported.toString()) {
      isUpdatingUrlRef.current = true;
      setSearchParams(nextParams, { replace: true });
    }
  }, [search, specialty, hospital, area, minFee, maxFee, searchParams, setSearchParams]);

  // Load catalog options
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
    isUpdatingUrlRef.current = true;
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  // Debounce API query by 250ms
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
          if (!controller.signal.aborted) {
            setDoctors(result.items);
            setPage(result.page);
            setLimit(result.limit);
            setTotal(result.total);
            setTotalPages(result.totalPages);
          }
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
    page,
    limit,
    total,
    totalPages,
    pagination: { page, limit, total, totalPages },
  };
}
