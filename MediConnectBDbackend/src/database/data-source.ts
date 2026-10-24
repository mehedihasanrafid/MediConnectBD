/**
 * Registers module-owned TypeORM entities and the explicit migration sequence. synchronize stays
 * disabled: moving an entity file must not rename or recreate tables. MySQL connections use UTC
 * for persisted appointment timestamps.
 */

import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env";
import { DoctorProfile } from "../modules/doctors/doctor-profile.entity";
import { DoctorChamber } from "../modules/doctors/doctor-chamber.entity";
import { DoctorSchedule } from "../modules/scheduling/doctor-schedule.entity";
import { ScheduleTimeOff } from "../modules/scheduling/schedule-time-off.entity";
import { AppointmentSlot } from "../modules/scheduling/appointment-slot.entity";
import { SlotHold } from "../modules/appointments/slot-hold.entity";
import { Appointment } from "../modules/appointments/appointment.entity";
import { Payment } from "../modules/payments/payment.entity";
import { PaymentEvent } from "../modules/payments/payment-event.entity";
import { Refund } from "../modules/payments/refund.entity";
import { AddPayments1761220800000 } from "./migrations/1761220800000-add-payments";
import { Hospital } from "../modules/hospitals/hospital.entity";
import { PatientProfile } from "../modules/patients/patient-profile.entity";
import { RefreshSession } from "../modules/auth/refresh-session.entity";
import { Role } from "../modules/role/role.entity";
import { Specialty } from "../modules/specialties/specialty.entity";
import { User } from "../modules/users/user.entity";
import { InitialFoundation1760788800000 } from "./migrations/1760788800000-initial-foundation";
import { AddAuthSessions1760875200000 } from "./migrations/1760875200000-add-auth-sessions";
import { AddDoctorDirectory1760961600000 } from "./migrations/1760961600000-add-doctor-directory";
import { AddDoctorScheduling1761048000000 } from "./migrations/1761048000000-add-doctor-scheduling";
import { AddAppointmentBooking1761134400000 } from "./migrations/1761134400000-add-appointment-booking";
import { AddHoldExpiryIndex1761307200000 } from "./migrations/1761307200000-add-hold-expiry-index";

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
    Payment,
    PaymentEvent,
    Refund,
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
    AddPayments1761220800000,
    AddHoldExpiryIndex1761307200000,
  ],
  migrationsTableName: "typeorm_migrations",
});

export default AppDataSource;
