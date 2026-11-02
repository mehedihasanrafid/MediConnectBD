export type ScheduleDayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ScheduleRuleItem {
  id?: string;
  dayOfWeek: number;
  startTime: string; // HH:mm or HH:mm:ss
  endTime: string;   // HH:mm or HH:mm:ss
  slotDurationMinutes: number; // 10 | 15 | 20 | 30
  mode: "VIDEO" | "CHAMBER";
  chamberId?: string | null;
  chamber?: {
    id: string;
    roomOrUnit?: string | null;
    hospital?: {
      id?: string;
      name: string;
      area?: string;
      address?: string;
    };
  } | null;
  isActive?: boolean;
}

export interface TimeOffItem {
  id: string;
  doctorId?: string;
  date: string; // YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  reason?: string | null;
}

export interface DoctorScheduleData {
  doctorId?: string;
  timezone?: string;
  rules: ScheduleRuleItem[];
  timeOff: TimeOffItem[];
}

export interface WorkingHoursFormValues {
  dayOfWeek: number;
  mode: "VIDEO" | "CHAMBER";
  chamberId: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  slotDurationMinutes: number;
}

export interface AddTimeOffFormValues {
  date: string;
  isFullDay: boolean;
  startTime: string;
  endTime: string;
  reason: string;
}
