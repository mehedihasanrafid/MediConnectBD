import { hash } from "bcryptjs";
import { AppDataSource } from "../data-source";
import {
  DoctorApplicationStatus,
  DoctorProfile,
} from "../entities/doctor-profile.entity";
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
  await AppDataSource.getRepository(DoctorProfile).upsert(
    {
      userId: doctorUser.id,
      bmdcNumber: "DEMO-BMDC-NOT-REAL",
      degrees: "Synthetic credentials for demonstration only",
      experienceYears: 10,
      bio: "Synthetic doctor profile. Not for clinical use.",
      applicationStatus: DoctorApplicationStatus.APPROVED,
      reviewedAt: new Date(),
      rejectionReason: null,
    },
    ["userId"],
  );

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
