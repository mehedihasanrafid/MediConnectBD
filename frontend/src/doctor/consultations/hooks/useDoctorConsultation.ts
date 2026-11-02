import { useCallback, useEffect, useState } from "react";
import { appointmentsApi } from "../../../api/appointments";
import { doctorsApi } from "../../../api/doctors";
import { prescriptionsApi } from "../../../api/prescriptions";
import type {
  DoctorAppointment,
  Prescription,
  VideoSession,
} from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";
import type { FastRxBundle } from "../../dashboard/data/fastRxPresets";
import type {
  EncounterClinicalNotes,
  VideoEligibilityStatus,
  VitalsIntake,
} from "../types/doctorConsultation.types";

export function useDoctorConsultation(appointmentId?: string) {
  const [appointment, setAppointment] = useState<DoctorAppointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video Session State (Daily.co)
  const [videoSession, setVideoSession] = useState<VideoSession | null>(null);
  const [videoStatus, setVideoStatus] = useState<VideoEligibilityStatus>("CHECKING");
  const [videoError, setVideoError] = useState<string | null>(null);

  // Existing Prescription
  const [existingPrescription, setExistingPrescription] = useState<Prescription | null>(null);

  // In-Memory Clinical Documentation (Private to session — never in localStorage)
  const [clinicalNotes, setClinicalNotes] = useState<EncounterClinicalNotes>({
    chiefComplaint: "",
    clinicalFindings: "",
    diagnosis: "",
    medicines: [],
    tests: [],
    advice: "",
  });

  // In-Memory Vitals (Chamber intake)
  const [vitals, setVitals] = useState<VitalsIntake>({
    bpSystolic: "",
    bpDiastolic: "",
    pulse: "",
    temperature: "",
    weightKg: "",
  });

  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    if (!appointmentId) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch appointments & existing prescriptions in parallel
      const [apptsRes, rxRes] = await Promise.all([
        doctorsApi.listMyAppointments(),
        prescriptionsApi.listDoctorPrescriptions().catch(() => ({ items: [] as Prescription[] })),
      ]);

      const found = apptsRes.items.find((a) => a.id === appointmentId) ?? null;
      if (!found) {
        setError("Appointment not found or not assigned to your clinical account.");
        setLoading(false);
        return;
      }

      setAppointment(found);

      // Check existing prescription
      const matchingRx = rxRes.items.find((rx) => rx.appointmentId === appointmentId) ?? null;
      setExistingPrescription(matchingRx);

      // Pre-fill diagnosis & advice from existing rx if present
      if (matchingRx) {
        setClinicalNotes({
          chiefComplaint: "",
          clinicalFindings: "",
          diagnosis: matchingRx.diagnosis,
          medicines: matchingRx.medicines,
          tests: matchingRx.tests || [],
          advice: matchingRx.advice || "",
        });
      }

      // 2. If VIDEO consultation, verify session authorization via backend API
      if (found.mode === "VIDEO") {
        setVideoStatus("CHECKING");
        setVideoError(null);

        try {
          const session = await appointmentsApi.getVideoSession(appointmentId);
          setVideoSession(session);
          setVideoStatus("ELIGIBLE");
        } catch (sessionErr: unknown) {
          const msg = getErrorMessage(sessionErr, "");
          if (
            msg.includes("5 minutes") ||
            msg.includes("early") ||
            msg.includes("BEFORE_START") ||
            msg.includes("VIDEO_NOT_OPEN")
          ) {
            setVideoStatus("TOO_EARLY");
            setVideoError(
              "Consultation room opens 5 minutes before scheduled start time."
            );
          } else if (msg.includes("CONFIRMED") || found.status !== "CONFIRMED") {
            setVideoStatus("NOT_CONFIRMED");
            setVideoError(`Video session is unavailable while appointment status is ${found.status}.`);
          } else {
            setVideoStatus("ERROR");
            setVideoError(msg || "Could not authorize video session.");
          }
        }
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Failed to load consultation encounter."));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Update clinical notes field
  const updateClinicalNotes = useCallback(
    <K extends keyof EncounterClinicalNotes>(field: K, value: EncounterClinicalNotes[K]) => {
      setClinicalNotes((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  // Update vitals field
  const updateVitals = useCallback((field: keyof VitalsIntake, value: string) => {
    setVitals((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Apply FastRx Bundle into in-memory clinical notes
  const applyFastRxBundle = useCallback((bundle: FastRxBundle) => {
    setClinicalNotes((prev) => ({
      ...prev,
      diagnosis: bundle.diagnosis,
      medicines: bundle.medicines.map((m) => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
      })),
      tests: bundle.tests || [],
      advice: bundle.advice,
    }));
  }, []);

  // Complete consultation (POST /api/v1/appointments/:id/complete)
  const completeConsultation = useCallback(async (): Promise<boolean> => {
    if (!appointmentId) return false;

    setBusy(true);
    try {
      await appointmentsApi.completeAppointment(appointmentId);
      setAppointment((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));
      return true;
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not mark consultation as completed."));
      return false;
    } finally {
      setBusy(false);
    }
  }, [appointmentId]);

  // Register newly created prescription
  const registerIssuedPrescription = useCallback((rx: Prescription) => {
    setExistingPrescription(rx);
  }, []);

  return {
    appointment,
    loading,
    error,
    videoSession,
    videoStatus,
    videoError,
    existingPrescription,
    clinicalNotes,
    vitals,
    busy,
    updateClinicalNotes,
    updateVitals,
    applyFastRxBundle,
    completeConsultation,
    registerIssuedPrescription,
    reload: loadData,
  };
}
