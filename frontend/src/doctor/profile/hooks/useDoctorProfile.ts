import { useCallback, useEffect, useState } from "react";
import { doctorsApi } from "../../../api/doctors";
import type { Hospital, Specialty } from "../../../shared/types";
import { getErrorMessage } from "../../../shared/utils/apiError";
import type {
  ChamberFormValues,
  DoctorChamberDetail,
  DoctorProfileData,
  DoctorProfilePatchPayload,
} from "../types/doctorProfile.types";

export function useDoctorProfile() {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  // Loading & error states
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  // Form states
  const [degrees, setDegrees] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState<string[]>(["Bangla", "English"]);
  const [videoConsultationFee, setVideoConsultationFee] = useState<string>("");
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [chambers, setChambers] = useState<DoctorChamberDetail[]>([]);

  // Mutation states
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Re-verification dialog state for APPROVED doctors
  const [showReverificationModal, setShowReverificationModal] = useState(false);
  const [pendingPatchPayload, setPendingPatchPayload] = useState<DoctorProfilePatchPayload | null>(null);

  // Populate form from profile data
  const populateForm = useCallback((data: DoctorProfileData) => {
    setProfile(data);
    setDegrees(data.degrees ?? "");
    setExperienceYears(data.experienceYears ?? 0);
    setBio(data.bio ?? "");
    setLanguages(data.languages && data.languages.length > 0 ? data.languages : ["Bangla", "English"]);
    setVideoConsultationFee(data.videoConsultationFee !== null ? String(data.videoConsultationFee) : "");
    setSpecialtyIds(data.specialties?.map((s) => s.id) ?? []);

    // Filter active chambers and normalize
    const activeChambers = (data.chambers ?? [])
      .filter((c) => c.isActive !== false)
      .map((c) => ({
        id: c.id,
        hospitalId: c.hospital?.id ?? c.hospitalId,
        roomOrUnit: c.roomOrUnit ?? null,
        consultationFee: Number(c.consultationFee),
        isActive: true,
        hospital: c.hospital,
      }));
    setChambers(activeChambers);
  }, []);

  // Initial load
  const loadData = useCallback(async () => {
    setLoading(true);
    setProfileError(null);
    setCatalogError(null);

    // 1. Fetch Profile
    try {
      const profileData = await doctorsApi.getMyProfile<DoctorProfileData>();
      populateForm(profileData);
    } catch (err) {
      setProfileError(getErrorMessage(err, "Failed to load doctor profile."));
      setLoading(false);
      return;
    }

    // 2. Fetch Catalogs independently so failures don't block profile
    try {
      const [hospRes, specRes] = await Promise.allSettled([
        doctorsApi.listHospitals(),
        doctorsApi.listSpecialties(),
      ]);

      if (hospRes.status === "fulfilled") {
        setHospitals(hospRes.value.items ?? []);
      } else {
        setCatalogError("Hospital catalog could not be loaded. Chamber additions may be limited.");
      }

      if (specRes.status === "fulfilled") {
        setSpecialties(specRes.value.items ?? []);
      } else {
        setCatalogError("Specialty catalog could not be loaded. Specialty selection may be limited.");
      }
    } catch {
      setCatalogError("Could not retrieve catalog data.");
    } finally {
      setLoading(false);
    }
  }, [populateForm]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Build complete patch payload from current form state or override
  const buildPayload = useCallback(
    (overrides?: Partial<DoctorProfilePatchPayload>): DoctorProfilePatchPayload => {
      const payloadChambers = (overrides?.chambers !== undefined
        ? overrides.chambers
        : chambers.map((c) => ({
            hospitalId: c.hospitalId || c.hospital?.id || "",
            roomOrUnit: c.roomOrUnit ? c.roomOrUnit.trim() : null,
            consultationFee: Number(c.consultationFee),
          }))
      ).map((item) => ({
        hospitalId: item.hospitalId,
        roomOrUnit: item.roomOrUnit ? item.roomOrUnit.trim() : null,
        consultationFee: Number(item.consultationFee),
      }));

      return {
        degrees: overrides?.degrees !== undefined ? overrides.degrees : degrees.trim() || null,
        experienceYears:
          overrides?.experienceYears !== undefined
            ? overrides.experienceYears
            : Number(experienceYears) || 0,
        bio: overrides?.bio !== undefined ? overrides.bio : bio.trim() || null,
        languages: overrides?.languages !== undefined ? overrides.languages : languages,
        videoConsultationFee:
          overrides?.videoConsultationFee !== undefined
            ? overrides.videoConsultationFee
            : videoConsultationFee.trim() !== ""
              ? Number(videoConsultationFee)
              : null,
        specialtyIds: overrides?.specialtyIds !== undefined ? overrides.specialtyIds : specialtyIds,
        chambers: payloadChambers,
      };
    },
    [bio, chambers, degrees, experienceYears, languages, specialtyIds, videoConsultationFee],
  );

  // Direct execute save
  const executeSave = useCallback(
    async (payload: DoctorProfilePatchPayload) => {
      setSaving(true);
      setSaveError(null);
      setSaveSuccess(null);
      setShowReverificationModal(false);
      setPendingPatchPayload(null);

      try {
        const updated = await doctorsApi.updateMyProfile<DoctorProfileData>(payload);
        populateForm(updated);
        setSaveSuccess("Profile changes saved successfully.");
      } catch (err) {
        setSaveError(getErrorMessage(err, "Failed to save profile changes."));
      } finally {
        setSaving(false);
      }
    },
    [populateForm],
  );

  // Request save - intercepts with reverification warning if doctor is APPROVED
  const saveProfile = useCallback(
    async (overrides?: Partial<DoctorProfilePatchPayload>) => {
      setSaveError(null);
      setSaveSuccess(null);
      setSubmitError(null);
      setSubmitSuccess(null);

      const payload = buildPayload(overrides);

      // Validation checks
      if (payload.degrees && payload.degrees.length > 500) {
        setSaveError("Degrees must not exceed 500 characters.");
        return;
      }
      if (payload.bio && payload.bio.length > 5000) {
        setSaveError("Biography must not exceed 5,000 characters.");
        return;
      }
      if (payload.experienceYears !== undefined && (payload.experienceYears < 0 || payload.experienceYears > 80)) {
        setSaveError("Experience must be between 0 and 80 years.");
        return;
      }
      if (
        payload.videoConsultationFee !== null &&
        payload.videoConsultationFee !== undefined &&
        (isNaN(payload.videoConsultationFee) || payload.videoConsultationFee < 0 || payload.videoConsultationFee > 1000000)
      ) {
        setSaveError("Video consultation fee must be between 0 and 1,000,000 BDT.");
        return;
      }
      if (payload.specialtyIds && payload.specialtyIds.length > 10) {
        setSaveError("A maximum of 10 specialties can be selected.");
        return;
      }

      // Check if re-verification confirmation is required
      if (profile?.applicationStatus === "APPROVED") {
        setPendingPatchPayload(payload);
        setShowReverificationModal(true);
        return;
      }

      await executeSave(payload);
    },
    [buildPayload, executeSave, profile?.applicationStatus],
  );

  const confirmReverificationSave = useCallback(async () => {
    if (pendingPatchPayload) {
      await executeSave(pendingPatchPayload);
    }
  }, [executeSave, pendingPatchPayload]);

  const cancelReverificationSave = useCallback(() => {
    setShowReverificationModal(false);
    setPendingPatchPayload(null);
  }, []);

  // Submit Application for admin review
  const submitApplication = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);
    setSaveError(null);

    try {
      const updated = await doctorsApi.submitApplication<DoctorProfileData>();
      populateForm(updated);
      setSubmitSuccess("Application submitted for administrator review.");
    } catch (err) {
      setSubmitError(getErrorMessage(err, "Could not submit application for review."));
    } finally {
      setSubmitting(false);
    }
  }, [populateForm]);

  // Chamber Management Handlers
  const addChamber = useCallback(
    async (values: ChamberFormValues) => {
      const selectedHospital = hospitals.find((h) => h.id === values.hospitalId);
      if (!selectedHospital) {
        setSaveError("Please select a valid hospital from the catalog.");
        return false;
      }

      // Check uniqueness
      const exists = chambers.some(
        (c) => (c.hospitalId === values.hospitalId || c.hospital?.id === values.hospitalId) && c.isActive !== false,
      );
      if (exists) {
        setSaveError("This hospital has already been added to your chambers.");
        return false;
      }

      const fee = Number(values.consultationFee);
      if (isNaN(fee) || fee < 0 || fee > 1000000) {
        setSaveError("Consultation fee must be between 0 and 1,000,000 BDT.");
        return false;
      }

      const newChamber: DoctorChamberDetail = {
        hospitalId: values.hospitalId,
        roomOrUnit: values.roomOrUnit.trim() || null,
        consultationFee: fee,
        isActive: true,
        hospital: selectedHospital,
      };

      const updatedChambers = [...chambers, newChamber];
      setChambers(updatedChambers);

      // Persist update
      await saveProfile({
        chambers: updatedChambers.map((c) => ({
          hospitalId: c.hospitalId || c.hospital?.id || "",
          roomOrUnit: c.roomOrUnit ? c.roomOrUnit.trim() : null,
          consultationFee: Number(c.consultationFee),
        })),
      });

      return true;
    },
    [chambers, hospitals, saveProfile],
  );

  const editChamber = useCallback(
    async (hospitalId: string, values: ChamberFormValues) => {
      const fee = Number(values.consultationFee);
      if (isNaN(fee) || fee < 0 || fee > 1000000) {
        setSaveError("Consultation fee must be between 0 and 1,000,000 BDT.");
        return false;
      }

      const updatedChambers = chambers.map((c) => {
        const idMatch = c.hospitalId === hospitalId || c.hospital?.id === hospitalId;
        if (idMatch) {
          return {
            ...c,
            roomOrUnit: values.roomOrUnit.trim() || null,
            consultationFee: fee,
          };
        }
        return c;
      });

      setChambers(updatedChambers);

      await saveProfile({
        chambers: updatedChambers.map((c) => ({
          hospitalId: c.hospitalId || c.hospital?.id || "",
          roomOrUnit: c.roomOrUnit ? c.roomOrUnit.trim() : null,
          consultationFee: Number(c.consultationFee),
        })),
      });

      return true;
    },
    [chambers, saveProfile],
  );

  const removeChamber = useCallback(
    async (hospitalId: string) => {
      const updatedChambers = chambers.filter(
        (c) => c.hospitalId !== hospitalId && c.hospital?.id !== hospitalId,
      );

      setChambers(updatedChambers);

      await saveProfile({
        chambers: updatedChambers.map((c) => ({
          hospitalId: c.hospitalId || c.hospital?.id || "",
          roomOrUnit: c.roomOrUnit ? c.roomOrUnit.trim() : null,
          consultationFee: Number(c.consultationFee),
        })),
      });
    },
    [chambers, saveProfile],
  );

  // Specialty selection helpers
  const toggleSpecialty = useCallback((id: string) => {
    setSpecialtyIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((sId) => sId !== id);
      }
      if (prev.length >= 10) {
        return prev;
      }
      return [...prev, id];
    });
  }, []);

  const removeSpecialty = useCallback((id: string) => {
    setSpecialtyIds((prev) => prev.filter((sId) => sId !== id));
  }, []);

  // Checklist computation for backend submission requirements
  const hasDegrees = Boolean(degrees && degrees.trim().length > 0);
  const hasSpecialties = specialtyIds.length > 0;
  const hasConsultationFee =
    (videoConsultationFee.trim() !== "" && !isNaN(Number(videoConsultationFee))) ||
    chambers.some((c) => c.isActive !== false);

  const isProfileComplete = hasDegrees && hasSpecialties && hasConsultationFee;
  const canSubmit =
    (profile?.applicationStatus === "DRAFT" || profile?.applicationStatus === "REJECTED") &&
    isProfileComplete;

  const isReadOnly = profile?.applicationStatus === "PENDING_REVIEW";

  return {
    profile,
    hospitals,
    specialties,
    loading,
    profileError,
    catalogError,

    // Form fields
    degrees,
    setDegrees,
    experienceYears,
    setExperienceYears,
    bio,
    setBio,
    languages,
    setLanguages,
    videoConsultationFee,
    setVideoConsultationFee,
    specialtyIds,
    setSpecialtyIds,
    chambers,
    setChambers,

    // Actions
    toggleSpecialty,
    removeSpecialty,
    addChamber,
    editChamber,
    removeChamber,
    saveProfile,
    submitApplication,

    // Status checks
    isReadOnly,
    hasDegrees,
    hasSpecialties,
    hasConsultationFee,
    isProfileComplete,
    canSubmit,

    // Mutex & feedback
    saving,
    saveError,
    saveSuccess,
    submitting,
    submitError,
    submitSuccess,
    showReverificationModal,
    confirmReverificationSave,
    cancelReverificationSave,
    reload: loadData,
  };
}
