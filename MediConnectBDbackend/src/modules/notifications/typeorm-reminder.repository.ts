/**
 * TypeORM repository for querying upcoming appointments that need reminders.
 */

import { DataSource } from "typeorm";
import { User } from "../users/user.entity";
import { Appointment } from "../appointments/appointment.entity";
import { PatientProfile } from "../patients/patient-profile.entity";
import { DoctorProfile } from "../doctors/doctor-profile.entity";
import type { ReminderJobPayload } from "./reminder.types";

export interface UpcomingAppointmentInfo {
  id: string;
  scheduledAt: string;
  patientEmail: string;
  doctorName: string;
}

export interface UpcomingAppointmentRepository {
  findUpcomingReminders(
    now: Date,
    batchSize: number,
  ): Promise<UpcomingAppointmentInfo[]>;
}

export class TypeOrmReminderRepository implements UpcomingAppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findUpcomingReminders(
    now: Date,
    batchSize: number,
  ): Promise<UpcomingAppointmentInfo[]> {
    const results = await this.dataSource
      .createQueryBuilder()
      .select("a.id", "appointmentId")
      .addSelect("a.scheduled_start_at", "scheduledStartAt")
      .addSelect("u.email", "patientEmail")
      .addSelect("dp.full_name", "doctorName")
      .from(Appointment, "a")
      .innerJoin(PatientProfile, "pp", "pp.id = a.patient_profile_id")
      .innerJoin(User, "u", "u.id = pp.user_id")
      .innerJoin(DoctorProfile, "dp", "dp.id = a.doctor_profile_id")
      .where("a.status = :status", { status: "CONFIRMED" })
      .andWhere("a.scheduled_start_at >= :now AND a.scheduled_start_at <= :targetTime", {
        now,
        targetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24h window
      })
      .andWhere("a.reminder_24h_sent = false")
      .orderBy("a.scheduled_start_at", "ASC")
      .limit(batchSize)
      .getRawMany();

    return results.map((row) => ({
      id: row.appointmentId,
      scheduledAt: row.scheduledStartAt,
      patientEmail: row.patientEmail,
      doctorName: row.doctorName,
    }));
  }
}
