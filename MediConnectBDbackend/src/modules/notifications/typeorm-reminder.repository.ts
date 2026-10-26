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
    hoursBefore: number,
    batchSize: number,
  ): Promise<UpcomingAppointmentInfo[]>;
  markReminderSent(appointmentId: string, hoursBefore: number): Promise<void>;
}

export class TypeOrmReminderRepository implements UpcomingAppointmentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findUpcomingReminders(
    now: Date,
    hoursBefore: number,
    batchSize: number,
  ): Promise<UpcomingAppointmentInfo[]> {
    const is24h = hoursBefore > 1;
    const targetTime = new Date(now.getTime() + hoursBefore * 60 * 60 * 1000);
    const builder = this.dataSource
      .createQueryBuilder()
      .select("a.id", "appointmentId")
      .addSelect("a.scheduled_start_at", "scheduledStartAt")
      .addSelect("u.email", "patientEmail")
      .addSelect("CONCAT(du.first_name, ' ', du.last_name)", "doctorName")
      .from(Appointment, "a")
      .innerJoin(PatientProfile, "pp", "pp.id = a.patient_profile_id")
      .innerJoin(User, "u", "u.id = pp.user_id")
      .innerJoin(DoctorProfile, "dp", "dp.id = a.doctor_profile_id")
      .innerJoin(User, "du", "du.id = dp.user_id")
      .where("a.status = :status", { status: "CONFIRMED" })
      .andWhere("a.scheduled_start_at >= :now AND a.scheduled_start_at <= :targetTime", {
        now,
        targetTime,
      });

    if (is24h) {
      builder.andWhere("a.reminder_24h_sent = false");
    } else {
      builder.andWhere("a.reminder_30min_sent = false");
    }

    const results = await builder
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

  async markReminderSent(appointmentId: string, hoursBefore: number): Promise<void> {
    const is24h = hoursBefore > 1;
    await this.dataSource
      .getRepository(Appointment)
      .update(
        { id: appointmentId },
        is24h ? { reminder24hSent: true } : { reminder30minSent: true },
      );
  }
}
