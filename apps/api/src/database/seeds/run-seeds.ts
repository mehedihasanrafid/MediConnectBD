import { hash } from "bcryptjs";
import AppDataSource from "../data-source";
import {
  DoctorApplicationStatus,
  DoctorProfile,
} from "../entities/doctor-profile.entity";
import { DoctorChamber } from "../entities/doctor-chamber.entity";
import { ConsultationMode } from "../entities/consultation-mode";
import { DoctorSchedule } from "../entities/doctor-schedule.entity";
import { Hospital } from "../entities/hospital.entity";
import { BiologicalSex, PatientProfile } from "../entities/patient-profile.entity";
import { Role } from "../entities/role.entity";
import { Specialty } from "../entities/specialty.entity";
import { User, UserStatus } from "../entities/user.entity";
import { env } from "../../config/env";

const roleSeed = [
  { name: "PATIENT", description: "Books and attends healthcare appointments" },
  { name: "DOCTOR", description: "Provides approved healthcare consultations" },
  { name: "ADMIN", description: "Manages operational platform data" },
] as const;

const specialtySeed = ["Medicine", "Cardiology", "Pediatrics", "Dermatology"];

const hospitalSeed = [
  {
    name: "MediConnect Demo Hospital",
    slug: "mediconnect-demo-hospital",
    area: "Dhanmondi",
    address: "Synthetic demo address, Dhanmondi, Dhaka",
  },
  {
    name: "MediConnect Demo Medical Centre",
    slug: "mediconnect-demo-medical-centre",
    area: "Uttara",
    address: "Synthetic demo address, Uttara, Dhaka",
  },
];

async function seedCatalogs(): Promise<Map<string, Role>> {
  const roleRepository = AppDataSource.getRepository(Role);
  const specialtyRepository = AppDataSource.getRepository(Specialty);
  const hospitalRepository = AppDataSource.getRepository(Hospital);

  for (const item of roleSeed) {
    await roleRepository.upsert(item, ["name"]);
  }

  for (const name of specialtySeed) {
    await specialtyRepository.upsert(
      { name, slug: name.toLowerCase().replaceAll(" ", "-"), isActive: true },
      ["slug"],
    );
  }

  for (const hospital of hospitalSeed) {
    await hospitalRepository.upsert({ ...hospital, isActive: true }, ["slug"]);
  }

  const roles = await roleRepository.find();
  return new Map(roles.map((role) => [role.name, role]));
}

async function saveDemoUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  role: Role;
}): Promise<User> {
  const repository = AppDataSource.getRepository(User);
  let user = await repository.findOne({
    where: { email: input.email },
    relations: { roles: true },
  });

  if (!user) {
    user = repository.create({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      passwordHash: input.passwordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      roles: [input.role],
    });
  } else {
    user.passwordHash = input.passwordHash;
    user.roles = [input.role];
  }

  return repository.save(user);
}

async function seedDemoUsers(roles: Map<string, Role>, password: string): Promise<void> {
  const passwordHash = await hash(password, 12);
  const patientRole = roles.get("PATIENT");
  const doctorRole = roles.get("DOCTOR");
  const adminRole = roles.get("ADMIN");

  if (!patientRole || !doctorRole || !adminRole) {
    throw new Error("Required roles were not created");
  }

  const patientUser = await saveDemoUser({
    email: "patient.demo@mediconnect.example",
    firstName: "Demo",
    lastName: "Patient",
    passwordHash,
    role: patientRole,
  });
  await AppDataSource.getRepository(PatientProfile).upsert(
    {
      userId: patientUser.id,
      phone: "+8801000000001",
      dateOfBirth: "1995-01-01",
      sex: BiologicalSex.UNDISCLOSED,
      address: "Synthetic demo profile, Dhaka",
    },
    ["userId"],
  );

  const doctorUser = await saveDemoUser({
    email: "doctor.demo@mediconnect.example",
    firstName: "Demo",
    lastName: "Doctor",
    passwordHash,
    role: doctorRole,
  });
  const doctorRepository = AppDataSource.getRepository(DoctorProfile);
  await doctorRepository.upsert(
    {
      userId: doctorUser.id,
      bmdcNumber: "DEMO-BMDC-NOT-REAL",
      degrees: "Synthetic credentials for demonstration only",
      experienceYears: 10,
      bio: "Synthetic doctor profile. Not for clinical use.",
      photoUrl: null,
      languages: ["Bangla", "English"],
      videoConsultationFee: "800.00",
      applicationStatus: DoctorApplicationStatus.APPROVED,
      reviewedAt: new Date(),
      reviewedByUserId: null,
      rejectionReason: null,
    },
    ["userId"],
  );

  const doctorProfile = await doctorRepository.findOneByOrFail({ userId: doctorUser.id });
  const medicine = await AppDataSource.getRepository(Specialty).findOneByOrFail({
    slug: "medicine",
  });
  doctorProfile.specialties = [medicine];
  await doctorRepository.save(doctorProfile);

  const demoHospital = await AppDataSource.getRepository(Hospital).findOneByOrFail({
    slug: "mediconnect-demo-hospital",
  });
  await AppDataSource.getRepository(DoctorChamber).upsert(
    {
      doctorProfileId: doctorProfile.id,
      hospitalId: demoHospital.id,
      roomOrUnit: "Demo Chamber 1",
      consultationFee: "600.00",
      isActive: true,
    },
    ["doctorProfileId", "hospitalId"],
  );

  const scheduleRepository = AppDataSource.getRepository(DoctorSchedule);
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
    let schedule = await scheduleRepository.findOneBy({
      doctorProfileId: doctorProfile.id,
      dayOfWeek,
      startTime: "10:00:00",
    });
    schedule ??= scheduleRepository.create({
      doctorProfileId: doctorProfile.id,
      dayOfWeek,
      startTime: "10:00:00",
    });
    schedule.endTime = "12:00:00";
    schedule.slotDurationMinutes = 20;
    schedule.mode = ConsultationMode.VIDEO;
    schedule.chamberId = null;
    schedule.isActive = true;
    await scheduleRepository.save(schedule);
  }

  await saveDemoUser({
    email: "admin.demo@mediconnect.example",
    firstName: "Demo",
    lastName: "Administrator",
    passwordHash,
    role: adminRole,
  });
}

async function main(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const roles = await seedCatalogs();
    if (env.SEED_DEMO_PASSWORD) {
      await seedDemoUsers(roles, env.SEED_DEMO_PASSWORD);
      process.stdout.write("Seeded catalogs and synthetic demo users.\n");
    } else {
      process.stdout.write(
        "Seeded roles, specialties, and hospitals. Set SEED_DEMO_PASSWORD privately to add demo users.\n",
      );
    }
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
