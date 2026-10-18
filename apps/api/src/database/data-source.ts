import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env";
import { DoctorProfile } from "./entities/doctor-profile.entity";
import { Hospital } from "./entities/hospital.entity";
import { PatientProfile } from "./entities/patient-profile.entity";
import { Role } from "./entities/role.entity";
import { Specialty } from "./entities/specialty.entity";
import { User } from "./entities/user.entity";
import { InitialFoundation1760788800000 } from "./migrations/1760788800000-initial-foundation";

export const AppDataSource = new DataSource({
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
  entities: [User, Role, PatientProfile, DoctorProfile, Specialty, Hospital],
  migrations: [InitialFoundation1760788800000],
  migrationsTableName: "typeorm_migrations",
});

export default AppDataSource;
