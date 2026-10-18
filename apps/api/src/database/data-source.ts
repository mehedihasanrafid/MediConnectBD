import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env";
import { DoctorProfile } from "./entities/doctor-profile.entity";
import { DoctorChamber } from "./entities/doctor-chamber.entity";
import { DoctorSchedule } from "./entities/doctor-schedule.entity";
import { ScheduleTimeOff } from "./entities/schedule-time-off.entity";
import { AppointmentSlot } from "./entities/appointment-slot.entity";
import { SlotHold } from "./entities/slot-hold.entity";
import { Appointment } from "./entities/appointment.entity";
import { Hospital } from "./entities/hospital.entity";
import { PatientProfile } from "./entities/patient-profile.entity";
import { RefreshSession } from "./entities/refresh-session.entity";
import { Role } from "./entities/role.entity";
import { Specialty } from "./entities/specialty.entity";
import { User } from "./entities/user.entity";
import { InitialFoundation1760788800000 } from "./migrations/1760788800000-initial-foundation";
import { AddAuthSessions1760875200000 } from "./migrations/1760875200000-add-auth-sessions";
import { AddDoctorDirectory1760961600000 } from "./migrations/1760961600000-add-doctor-directory";
import { AddDoctorScheduling1761048000000 } from "./migrations/1761048000000-add-doctor-scheduling";
import { AddAppointmentBooking1761134400000 } from "./migrations/1761134400000-add-appointment-booking";

const AppDataSource = new DataSource({
  type: "mysql",
  host: env.DB_HOST,
  port: env.DB_PORT,
  username: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  charset: "utf8mb4",
  timezone: "Z",
  synchronize: false,
  logging: env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  entities: [
    User,
    Role,
    PatientProfile,
    DoctorProfile,
    DoctorChamber,
    DoctorSchedule,
    ScheduleTimeOff,
    AppointmentSlot,
    SlotHold,
    Appointment,
    Specialty,
    Hospital,
    RefreshSession,
  ],
  migrations: [
    InitialFoundation1760788800000,
    AddAuthSessions1760875200000,
    AddDoctorDirectory1760961600000,
    AddDoctorScheduling1761048000000,
    AddAppointmentBooking1761134400000,
  ],
  migrationsTableName: "typeorm_migrations",
});

export default AppDataSource;
