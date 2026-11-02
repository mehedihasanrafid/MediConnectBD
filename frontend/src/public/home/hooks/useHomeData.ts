import { useEffect, useState } from "react";
import { doctorsApi } from "../../../api/doctors";
import type { PublicDoctor, Specialty } from "../../../shared/types";

export const DEV_DOCTOR_IMAGES: Record<string, string> = {
  "Farhana Rahman": "/images/home/doctors/dr-farhana-rahman.webp",
  "Tanvir Ahmed": "/images/home/doctors/dr-tanvir-ahmed.webp",
  "Nusrat Jahan": "/images/home/doctors/dr-nusrat-jahan.webp",
};

export const DEV_FEATURED_DOCTOR_ORDER = [
  "Farhana Rahman",
  "Tanvir Ahmed",
  "Nusrat Jahan",
];

/**
 * Returns the public doctor's photo URL with local dev asset fallback when photoUrl is null.
 */
export function getDoctorPhotoUrl(doctor: PublicDoctor): string | null {
  if (doctor.photoUrl) return doctor.photoUrl;
  if (import.meta.env.DEV) {
    const fullName = `${doctor.firstName} ${doctor.lastName}`.trim();
    return DEV_DOCTOR_IMAGES[fullName] || null;
  }
  return null;
}

/**
 * Reorders doctors in development mode to match seeded presentation.
 */
export function orderFeaturedDoctors(
  doctors: PublicDoctor[],
  isDev: boolean = import.meta.env.DEV,
): PublicDoctor[] {
  if (!isDev) {
    return doctors.slice(0, 3);
  }

  const matched: PublicDoctor[] = [];
  for (const targetName of DEV_FEATURED_DOCTOR_ORDER) {
    const found = doctors.find(
      (d) => `${d.firstName} ${d.lastName}`.trim().toLowerCase() === targetName.toLowerCase(),
    );
    if (found) {
      matched.push(found);
    }
  }

  if (matched.length > 0) {
    const remaining = doctors.filter((d) => !matched.some((m) => m.id === d.id));
    return [...matched, ...remaining].slice(0, 3);
  }

  return doctors.slice(0, 3);
}

export function useHomeData() {
  const [doctors, setDoctors] = useState<PublicDoctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // In dev mode, fetch up to 12 doctors to ensure our target trio is retrieved
        const fetchLimit = import.meta.env.DEV ? "12" : "3";
        const [doctorsRes, specialtiesRes] = await Promise.all([
          doctorsApi.listPublic(new URLSearchParams({ limit: fetchLimit }).toString()),
          doctorsApi.listSpecialties().catch(() => ({ items: [] as Specialty[] })),
        ]);

        if (!cancelled) {
          const processedDoctors = orderFeaturedDoctors(doctorsRes.items);
          setDoctors(processedDoctors);
          setSpecialties(specialtiesRes.items);
        }
      } catch {
        if (!cancelled) {
          setError("Could not load featured doctors. Please visit the doctor directory.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    doctors,
    specialties,
    loading,
    error,
  };
}
