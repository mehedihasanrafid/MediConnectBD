import { useEffect, useState } from "react";
import { doctorsApi } from "../../../api/doctors";
import type { PublicDoctor, Specialty } from "../../../shared/types";

export const DEV_DOCTOR_IMAGES: Record<string, string> = {
  "Farhana Rahman": "/images/home/doctors/dr-farhana-rahman.webp",
  "Tanvir Ahmed": "/images/home/doctors/dr-tanvir-ahmed.webp",
  "Nusrat Jahan": "/images/home/doctors/dr-nusrat-jahan.webp",
};

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

        const [doctorsRes, specialtiesRes] = await Promise.all([
          doctorsApi.listPublic(new URLSearchParams({ limit: "3" }).toString()),
          doctorsApi.listSpecialties().catch(() => ({ items: [] as Specialty[] })),
        ]);

        if (!cancelled) {
          setDoctors(doctorsRes.items.slice(0, 3));
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
