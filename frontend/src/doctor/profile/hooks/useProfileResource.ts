import { useCallback, useEffect, useState } from "react";
import { doctorsApi } from "../../../api/doctors";
import type { Hospital, Specialty } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";
import type { DoctorProfileData } from "../types/doctorProfile.types";

export function useProfileResource() {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogReady, setCatalogReady] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await doctorsApi.getMyProfile<DoctorProfileData>();
        if (active) setProfile(data);
      } catch (caught) {
        if (active) setError(getErrorMessage(caught, "Could not load your profile."));
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [version]);
  const loadCatalogs = useCallback(async () => {
    if (catalogReady || catalogLoading) return;
    setCatalogLoading(true);
    const [hospitalResult, specialtyResult] = await Promise.allSettled([doctorsApi.listHospitals(), doctorsApi.listSpecialties()]);
    const failures: string[] = [];
    if (hospitalResult.status === "fulfilled") setHospitals(hospitalResult.value.items);
    else failures.push("Hospitals could not be loaded.");
    if (specialtyResult.status === "fulfilled") setSpecialties(specialtyResult.value.items);
    else failures.push("Specialties could not be loaded.");
    setCatalogError(failures.length ? failures.join(" ") : null);
    setCatalogReady(!failures.length);
    setCatalogLoading(false);
  }, [catalogReady, catalogLoading]);
  const reload = () => { setLoading(true); setError(null); setVersion((value) => value + 1); };
  return { profile, setProfile, hospitals, specialties, loading, error, catalogError, catalogLoading, loadCatalogs, reload };
}
