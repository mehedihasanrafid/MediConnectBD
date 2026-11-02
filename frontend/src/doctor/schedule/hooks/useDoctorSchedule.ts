import { useCallback, useEffect, useMemo, useState } from "react";
import { doctorsApi } from "../../../api/doctors";
import { getErrorMessage } from "../../../shared/utils/apiError";
import type { DoctorChamberDetail, DoctorProfileData } from "../../profile/types/doctorProfile.types";
import type {
  AddTimeOffFormValues,
  DoctorScheduleData,
  ScheduleRuleItem,
  WorkingHoursFormValues,
} from "../types/doctorSchedule.types";

export function useDoctorSchedule() {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [schedule, setSchedule] = useState<DoctorScheduleData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [generatingSlots, setGeneratingSlots] = useState(false);
  const [slotsGeneratedCount, setSlotsGeneratedCount] = useState<number | null>(null);

  const isApproved = profile?.applicationStatus === "APPROVED";

  const activeChambers: DoctorChamberDetail[] = useMemo(() => {
    return (profile?.chambers ?? []).filter((c) => c.isActive !== false);
  }, [profile?.chambers]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Load Doctor Profile to inspect approval and chambers
      const profileData = await doctorsApi.getMyProfile<DoctorProfileData>();
      setProfile(profileData);

      // 2. Only fetch schedule if doctor is approved
      if (profileData.applicationStatus === "APPROVED") {
        try {
          const scheduleData = await doctorsApi.getMySchedule<DoctorScheduleData>();
          setSchedule(scheduleData);
        } catch (scheduleErr) {
          setError(getErrorMessage(scheduleErr, "Failed to load schedule overview."));
        }
      } else {
        // Not approved: clear any stale schedule
        setSchedule(null);
      }
    } catch (profileErr) {
      setError(getErrorMessage(profileErr, "Failed to load doctor profile."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Check rule validation before saving
  const validateRuleInput = useCallback(
    (
      values: WorkingHoursFormValues,
      existingRules: ScheduleRuleItem[],
      excludeRuleId?: string,
    ): string | null => {
      if (values.startTime >= values.endTime) {
        return "Start time must be earlier than end time.";
      }

      if (values.mode === "VIDEO" && profile?.videoConsultationFee === null) {
        return "Set a video consultation fee in your profile before adding video availability.";
      }

      if (values.mode === "CHAMBER") {
        if (!values.chamberId) {
          return "Please select an active practicing chamber.";
        }
        const chamberValid = activeChambers.some(
          (c) => c.id === values.chamberId || c.hospitalId === values.chamberId,
        );
        if (!chamberValid) {
          return "Selected chamber is no longer active. Please choose a valid chamber.";
        }
      }

      // Check overlap on the same day across both video and chamber modes
      const sameDayRules = existingRules.filter((r) => {
        if (excludeRuleId && r.id === excludeRuleId) return false;
        return r.dayOfWeek === values.dayOfWeek && r.isActive !== false;
      });

      const newStart = values.startTime.slice(0, 5);
      const newEnd = values.endTime.slice(0, 5);

      for (const r of sameDayRules) {
        const existStart = r.startTime.slice(0, 5);
        const existEnd = r.endTime.slice(0, 5);

        // Overlap condition: start < other.end && end > other.start
        if (newStart < existEnd && newEnd > existStart) {
          return `Working hours overlap with existing ${r.mode} session (${existStart} - ${existEnd}) on this day.`;
        }
      }

      return null;
    },
    [activeChambers, profile?.videoConsultationFee],
  );

  // Add working hours rule
  const addRule = useCallback(
    async (values: WorkingHoursFormValues) => {
      if (!isApproved) {
        setError("Only approved doctors can configure working hours.");
        return false;
      }

      const currentRules = schedule?.rules ?? [];
      const validationError = validateRuleInput(values, currentRules);
      if (validationError) {
        setError(validationError);
        return false;
      }

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const payloadRules = currentRules.map((r) => ({
          dayOfWeek: r.dayOfWeek,
          startTime: r.startTime.slice(0, 5),
          endTime: r.endTime.slice(0, 5),
          slotDurationMinutes: r.slotDurationMinutes,
          mode: r.mode,
          ...(r.mode === "CHAMBER" && r.chamberId ? { chamberId: r.chamberId } : {}),
        }));

        payloadRules.push({
          dayOfWeek: values.dayOfWeek,
          startTime: values.startTime.slice(0, 5),
          endTime: values.endTime.slice(0, 5),
          slotDurationMinutes: values.slotDurationMinutes,
          mode: values.mode,
          ...(values.mode === "CHAMBER" && values.chamberId ? { chamberId: values.chamberId } : {}),
        });

        const updated = await doctorsApi.replaceMySchedule<DoctorScheduleData>(payloadRules);
        setSchedule(updated);
        setNotice("Working hours added and schedule saved.");
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to add working hours."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [isApproved, schedule?.rules, validateRuleInput],
  );

  // Edit working hours rule
  const editRule = useCallback(
    async (ruleId: string, values: WorkingHoursFormValues) => {
      if (!isApproved) {
        setError("Only approved doctors can configure working hours.");
        return false;
      }

      const currentRules = schedule?.rules ?? [];
      const validationError = validateRuleInput(values, currentRules, ruleId);
      if (validationError) {
        setError(validationError);
        return false;
      }

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const payloadRules = currentRules.map((r) => {
          if (r.id === ruleId) {
            return {
              dayOfWeek: values.dayOfWeek,
              startTime: values.startTime.slice(0, 5),
              endTime: values.endTime.slice(0, 5),
              slotDurationMinutes: values.slotDurationMinutes,
              mode: values.mode,
              ...(values.mode === "CHAMBER" && values.chamberId ? { chamberId: values.chamberId } : {}),
            };
          }
          return {
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime.slice(0, 5),
            endTime: r.endTime.slice(0, 5),
            slotDurationMinutes: r.slotDurationMinutes,
            mode: r.mode,
            ...(r.mode === "CHAMBER" && r.chamberId ? { chamberId: r.chamberId } : {}),
          };
        });

        const updated = await doctorsApi.replaceMySchedule<DoctorScheduleData>(payloadRules);
        setSchedule(updated);
        setNotice("Working hours updated successfully.");
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to update working hours."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [isApproved, schedule?.rules, validateRuleInput],
  );

  // Remove working hours rule
  const removeRule = useCallback(
    async (ruleId: string) => {
      if (!isApproved) {
        setError("Only approved doctors can configure working hours.");
        return false;
      }

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        const remainingRules = (schedule?.rules ?? [])
          .filter((r) => r.id !== ruleId)
          .map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime.slice(0, 5),
            endTime: r.endTime.slice(0, 5),
            slotDurationMinutes: r.slotDurationMinutes,
            mode: r.mode,
            ...(r.mode === "CHAMBER" && r.chamberId ? { chamberId: r.chamberId } : {}),
          }));

        const updated = await doctorsApi.replaceMySchedule<DoctorScheduleData>(remainingRules);
        setSchedule(updated);
        setNotice("Working period removed.");
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to remove working period."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [isApproved, schedule?.rules],
  );

  // Slot generation
  const generateSlots = useCallback(async () => {
    if (!isApproved) {
      setError("Only approved doctors can generate consultation slots.");
      return;
    }

    setGeneratingSlots(true);
    setError(null);
    setNotice(null);

    try {
      const res = await doctorsApi.generateSlots();
      setSlotsGeneratedCount(res.generated);
      setNotice(`Successfully refreshed and generated ${res.generated} slots for the 7-day rolling window.`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to generate appointment slots."));
    } finally {
      setGeneratingSlots(false);
    }
  }, [isApproved]);

  // Add Time Off
  const addTimeOff = useCallback(
    async (values: AddTimeOffFormValues) => {
      if (!isApproved) {
        setError("Only approved doctors can record time off.");
        return false;
      }

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        await doctorsApi.addTimeOff({
          date: values.date,
          startTime: values.isFullDay ? null : values.startTime.slice(0, 5),
          endTime: values.isFullDay ? null : values.endTime.slice(0, 5),
          reason: values.reason.trim() || null,
        });

        // Refresh schedule data
        const updated = await doctorsApi.getMySchedule<DoctorScheduleData>();
        setSchedule(updated);
        setNotice("Time-off blackout period added successfully.");
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to add time off."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [isApproved],
  );

  // Remove Time Off
  const removeTimeOff = useCallback(
    async (timeOffId: string) => {
      if (!isApproved) return false;

      setBusy(true);
      setError(null);
      setNotice(null);

      try {
        await doctorsApi.removeTimeOff(timeOffId);
        const updated = await doctorsApi.getMySchedule<DoctorScheduleData>();
        setSchedule(updated);
        setNotice("Time-off blackout period removed.");
        return true;
      } catch (err) {
        setError(getErrorMessage(err, "Failed to remove time off."));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [isApproved],
  );

  return {
    profile,
    schedule,
    loading,
    error,
    notice,
    busy,
    generatingSlots,
    slotsGeneratedCount,
    isApproved,
    activeChambers,
    addRule,
    editRule,
    removeRule,
    generateSlots,
    addTimeOff,
    removeTimeOff,
    reload: loadData,
  };
}
