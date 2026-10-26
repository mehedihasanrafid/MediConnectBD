/**
 * Seeds catalog values by stable keys and creates comprehensive synthetic demo accounts and
 * end-to-end sample records (doctors, schedules, 7-day slots, family members, appointments,
 * payments, refunds, prescriptions, and reviews) for local demonstration and QA testing.
 */

import { hash } from "bcryptjs";
import AppDataSource from "../data-source";
import {
  DoctorApplicationStatus,
  DoctorProfile,
} from "../../modules/doctors/doctor-profile.entity";
import { DoctorChamber } from "../../modules/doctors/doctor-chamber.entity";
import { TypeOrmDoctorRepository } from "../../modules/doctors/typeorm-doctor.repository";
import { ConsultationMode } from "../../modules/appointments/consultation-mode";
import { Appointment, AppointmentStatus } from "../../modules/appointments/appointment.entity";
import { SlotHold, SlotHoldStatus } from "../../modules/appointments/slot-hold.entity";
import {
  AppointmentSlot,
  AppointmentSlotStatus,
} from "../../modules/scheduling/appointment-slot.entity";
import { DoctorSchedule } from "../../modules/scheduling/doctor-schedule.entity";
import { SchedulingService } from "../../modules/scheduling/scheduling.service";
import { TypeOrmSchedulingRepository } from "../../modules/scheduling/typeorm-scheduling.repository";
import { Hospital } from "../../modules/hospitals/hospital.entity";
import { BiologicalSex, PatientProfile } from "../../modules/patients/patient-profile.entity";
import { FamilyMember } from "../../modules/patients/family-member.entity";
import { Payment } from "../../modules/payments/payment.entity";
import { Refund } from "../../modules/payments/refund.entity";
import { Prescription } from "../../modules/prescriptions/prescription.entity";
import { Review } from "../../modules/reviews/review.entity";
import { Role } from "../../modules/role/role.entity";
import { Specialty } from "../../modules/specialties/specialty.entity";
import { User, UserStatus } from "../../modules/users/user.entity";
import { env } from "../../config/env";

const roleSeed = [
  { name: "PATIENT", description: "Books and attends healthcare appointments" },
  { name: "DOCTOR", description: "Provides approved healthcare consultations" },
  { name: "ADMIN", description: "Manages operational platform data" },
] as const;

const specialtySeed = [
  "Medicine",
  "Cardiology",
  "Pediatrics",
  "Dermatology",
  "Neurology",
  "Orthopedics",
  "Gynecology",
  "ENT",
  "Gastroenterology",
  "Ophthalmology",
];

const hospitalSeed = [
  {
    name: "MediConnect Demo Hospital",
    slug: "mediconnect-demo-hospital",
    area: "Dhanmondi",
    address: "House 12, Road 5, Dhanmondi, Dhaka 1205",
  },
  {
    name: "MediConnect Demo Medical Centre",
    slug: "mediconnect-demo-medical-centre",
    area: "Uttara",
    address: "Sector 7, Uttara Model Town, Dhaka 1230",
  },
  {
    name: "Square Hospitals Ltd",
    slug: "square-hospitals-ltd",
    area: "Panthapath",
    address: "18/F, Bir Uttam Qazi Nuruzzaman Sarak, Panthapath, Dhaka 1205",
  },
  {
    name: "Evercare Hospital Dhaka",
    slug: "evercare-hospital-dhaka",
    area: "Bashundhara",
    address: "Plot 81, Block E, Bashundhara R/A, Dhaka 1229",
  },
  {
    name: "United Hospital Limited",
    slug: "united-hospital-limited",
    area: "Gulshan",
    address: "Plot 15, Road 71, Gulshan-2, Dhaka 1212",
  },
  {
    name: "Ibn Sina Specialized Hospital",
    slug: "ibn-sina-specialized-hospital",
    area: "Dhanmondi",
    address: "House 68, Road 15/A, Dhanmondi, Dhaka 1209",
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
    user.firstName = input.firstName;
    user.lastName = input.lastName;
    user.passwordHash = input.passwordHash;
    user.roles = [input.role];
  }

  return repository.save(user);
}

async function ensurePatient(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  sex: BiologicalSex;
  address: string;
  passwordHash: string;
  role: Role;
}): Promise<{ user: User; profile: PatientProfile }> {
  const user = await saveDemoUser({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash: input.passwordHash,
    role: input.role,
  });
  const patientRepo = AppDataSource.getRepository(PatientProfile);
  await patientRepo.upsert(
    {
      userId: user.id,
      phone: input.phone,
      dateOfBirth: input.dateOfBirth,
      sex: input.sex,
      address: input.address,
    },
    ["userId"],
  );
  const profile = await patientRepo.findOneByOrFail({ userId: user.id });
  return { user, profile };
}

async function ensureDoctor(input: {
  email: string;
  firstName: string;
  lastName: string;
  bmdcNumber: string;
  degrees: string;
  experienceYears: number;
  bio: string;
  languages: string[];
  videoFee: string;
  chamberFee: string;
  roomOrUnit: string;
  specialtySlug: string;
  hospitalSlug: string;
  applicationStatus: DoctorApplicationStatus;
  passwordHash: string;
  role: Role;
  schedulingService: SchedulingService;
}): Promise<{ user: User; profile: DoctorProfile; chamber: DoctorChamber }> {
  const user = await saveDemoUser({
    email: input.email,
    firstName: input.firstName,
    lastName: input.lastName,
    passwordHash: input.passwordHash,
    role: input.role,
  });

  const doctorRepository = AppDataSource.getRepository(DoctorProfile);
  await doctorRepository.upsert(
    {
      userId: user.id,
      bmdcNumber: input.bmdcNumber,
      degrees: input.degrees,
      experienceYears: input.experienceYears,
      bio: input.bio,
      photoUrl: null,
      languages: input.languages,
      videoConsultationFee: input.videoFee,
      applicationStatus: input.applicationStatus,
      reviewedAt:
        input.applicationStatus === DoctorApplicationStatus.APPROVED ? new Date() : null,
      reviewedByUserId: null,
      rejectionReason: null,
    },
    ["userId"],
  );

  const profile = await doctorRepository.findOneByOrFail({ userId: user.id });
  const specialty = await AppDataSource.getRepository(Specialty).findOneByOrFail({
    slug: input.specialtySlug,
  });
  profile.specialties = [specialty];
  await doctorRepository.save(profile);

  const hospital = await AppDataSource.getRepository(Hospital).findOneByOrFail({
    slug: input.hospitalSlug,
  });
  const chamberRepo = AppDataSource.getRepository(DoctorChamber);
  await chamberRepo.upsert(
    {
      doctorProfileId: profile.id,
      hospitalId: hospital.id,
      roomOrUnit: input.roomOrUnit,
      consultationFee: input.chamberFee,
      isActive: true,
    },
    ["doctorProfileId", "hospitalId"],
  );
  const chamber = await chamberRepo.findOneByOrFail({
    doctorProfileId: profile.id,
    hospitalId: hospital.id,
  });

  if (input.applicationStatus === DoctorApplicationStatus.APPROVED) {
    const scheduleRepository = AppDataSource.getRepository(DoctorSchedule);
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
      let videoSchedule = await scheduleRepository.findOneBy({
        doctorProfileId: profile.id,
        dayOfWeek,
        startTime: "10:00:00",
      });
      videoSchedule ??= scheduleRepository.create({
        doctorProfileId: profile.id,
        dayOfWeek,
        startTime: "10:00:00",
      });
      videoSchedule.endTime = "12:00:00";
      videoSchedule.slotDurationMinutes = 20;
      videoSchedule.mode = ConsultationMode.VIDEO;
      videoSchedule.chamberId = null;
      videoSchedule.isActive = true;
      await scheduleRepository.save(videoSchedule);

      let chamberSchedule = await scheduleRepository.findOneBy({
        doctorProfileId: profile.id,
        dayOfWeek,
        startTime: "17:00:00",
      });
      chamberSchedule ??= scheduleRepository.create({
        doctorProfileId: profile.id,
        dayOfWeek,
        startTime: "17:00:00",
      });
      chamberSchedule.endTime = "19:00:00";
      chamberSchedule.slotDurationMinutes = 20;
      chamberSchedule.mode = ConsultationMode.CHAMBER;
      chamberSchedule.chamberId = chamber.id;
      chamberSchedule.isActive = true;
      await scheduleRepository.save(chamberSchedule);
    }

    await input.schedulingService.regenerateMySlots(user.id);
  }

  return { user, profile, chamber };
}

async function ensureSampleAppointment(input: {
  doctorProfileId: string;
  patientProfileId: string;
  chamberId: string | null;
  startAt: Date;
  mode: ConsultationMode;
  feeAmount: string;
  status: AppointmentStatus;
  paymentReference?: string | null;
  cancellationReason?: string | null;
}): Promise<Appointment> {
  const slotRepo = AppDataSource.getRepository(AppointmentSlot);
  const holdRepo = AppDataSource.getRepository(SlotHold);
  const apptRepo = AppDataSource.getRepository(Appointment);

  const endAt = new Date(input.startAt.getTime() + 20 * 60 * 1000);
  let slot = await slotRepo.findOneBy({
    doctorProfileId: input.doctorProfileId,
    startAt: input.startAt,
  });
  if (!slot) {
    slot = await slotRepo.save(
      slotRepo.create({
        doctorProfileId: input.doctorProfileId,
        scheduleId: null,
        chamberId: input.chamberId,
        startAt: input.startAt,
        endAt,
        mode: input.mode,
        feeAmount: input.feeAmount,
        status:
          input.status === AppointmentStatus.CANCELLED
            ? AppointmentSlotStatus.AVAILABLE
            : AppointmentSlotStatus.BOOKED,
        heldUntil: null,
      }),
    );
  }

  let appt = await apptRepo.findOneBy({
    doctorProfileId: input.doctorProfileId,
    patientProfileId: input.patientProfileId,
    scheduledStartAt: input.startAt,
  });

  if (!appt) {
    const hold = await holdRepo.save(
      holdRepo.create({
        slotId: slot.id,
        patientProfileId: input.patientProfileId,
        status: SlotHoldStatus.CONVERTED,
        expiresAt: new Date(input.startAt.getTime() - 50 * 60 * 1000),
        releasedAt: null,
      }),
    );

    appt = await apptRepo.save(
      apptRepo.create({
        slotId: slot.id,
        holdId: hold.id,
        patientProfileId: input.patientProfileId,
        doctorProfileId: input.doctorProfileId,
        scheduledStartAt: input.startAt,
        scheduledEndAt: endAt,
        mode: input.mode,
        feeAmount: input.feeAmount,
        status: input.status,
        paymentReference: input.paymentReference ?? null,
        cancellationReason: input.cancellationReason ?? null,
      }),
    );
  }

  return appt;
}

async function seedDemoData(roles: Map<string, Role>, password: string): Promise<void> {
  const passwordHash = await hash(password, 12);
  const patientRole = roles.get("PATIENT");
  const doctorRole = roles.get("DOCTOR");
  const adminRole = roles.get("ADMIN");

  if (!patientRole || !doctorRole || !adminRole) {
    throw new Error("Required roles were not created");
  }

  const schedulingService = new SchedulingService(
    new TypeOrmSchedulingRepository(AppDataSource),
    new TypeOrmDoctorRepository(AppDataSource),
  );

  // 1. Seed Patients
  const demoPatient = await ensurePatient({
    email: "patient.demo@mediconnect.example",
    firstName: "Demo",
    lastName: "Patient",
    phone: "+8801700000001",
    dateOfBirth: "1995-01-01",
    sex: BiologicalSex.MALE,
    address: "House 14, Road 7, Dhanmondi, Dhaka",
    passwordHash,
    role: patientRole,
  });

  const rahimPatient = await ensurePatient({
    email: "rahim.patient@mediconnect.example",
    firstName: "Rahim",
    lastName: "Uddin",
    phone: "+8801711223344",
    dateOfBirth: "1988-06-15",
    sex: BiologicalSex.MALE,
    address: "Uttara Sector 4, Dhaka",
    passwordHash,
    role: patientRole,
  });

  const sumaiyaPatient = await ensurePatient({
    email: "sumaiya.patient@mediconnect.example",
    firstName: "Sumaiya",
    lastName: "Akter",
    phone: "+8801819556677",
    dateOfBirth: "1999-11-20",
    sex: BiologicalSex.FEMALE,
    address: "Banani Road 11, Dhaka",
    passwordHash,
    role: patientRole,
  });

  // 2. Seed Family Members for Demo Patient
  const familyRepo = AppDataSource.getRepository(FamilyMember);
  const existingFamily = await familyRepo.findBy({
    patientProfileId: demoPatient.profile.id,
  });
  if (existingFamily.length === 0) {
    await familyRepo.save([
      familyRepo.create({
        patientProfileId: demoPatient.profile.id,
        name: "Abdul Karim",
        relationship: "Father",
        dateOfBirth: "1962-03-12",
        phone: "+8801711000111",
      }),
      familyRepo.create({
        patientProfileId: demoPatient.profile.id,
        name: "Fatema Begum",
        relationship: "Mother",
        dateOfBirth: "1968-08-25",
        phone: "+8801711000222",
      }),
      familyRepo.create({
        patientProfileId: demoPatient.profile.id,
        name: "Arafat Karim",
        relationship: "Child",
        dateOfBirth: "2018-04-10",
        phone: null,
      }),
    ]);
  }

  // 3. Seed Approved & Pending Doctors
  const demoDoctor = await ensureDoctor({
    email: "doctor.demo@mediconnect.example",
    firstName: "Demo",
    lastName: "Doctor",
    bmdcNumber: "DEMO-BMDC-NOT-REAL",
    degrees: "MBBS (DMC), FCPS (Internal Medicine)",
    experienceYears: 10,
    bio: "Senior consultant in Internal Medicine focusing on preventive care, diabetes, and hypertension management.",
    languages: ["Bangla", "English"],
    videoFee: "800.00",
    chamberFee: "600.00",
    roomOrUnit: "Room 302, 3rd Floor",
    specialtySlug: "medicine",
    hospitalSlug: "mediconnect-demo-hospital",
    applicationStatus: DoctorApplicationStatus.APPROVED,
    passwordHash,
    role: doctorRole,
    schedulingService,
  });

  const drFarhana = await ensureDoctor({
    email: "dr.farhana@mediconnect.example",
    firstName: "Farhana",
    lastName: "Rahman",
    bmdcNumber: "BMDC-A-45821",
    degrees: "MBBS, FCPS (Cardiology), MD (NICVD)",
    experienceYears: 14,
    bio: "Interventional cardiologist specializing in heart failure, arrhythmias, and preventive cardiology.",
    languages: ["Bangla", "English"],
    videoFee: "1200.00",
    chamberFee: "1500.00",
    roomOrUnit: "Cardiac Wing, Room 410",
    specialtySlug: "cardiology",
    hospitalSlug: "square-hospitals-ltd",
    applicationStatus: DoctorApplicationStatus.APPROVED,
    passwordHash,
    role: doctorRole,
    schedulingService,
  });

  const drTanvir = await ensureDoctor({
    email: "dr.tanvir@mediconnect.example",
    firstName: "Tanvir",
    lastName: "Ahmed",
    bmdcNumber: "BMDC-A-51209",
    degrees: "MBBS, MD (Pediatrics), DCH",
    experienceYears: 9,
    bio: "Child health specialist experienced in neonatal care, childhood immunization, and pediatric nutrition.",
    languages: ["Bangla", "English"],
    videoFee: "900.00",
    chamberFee: "1000.00",
    roomOrUnit: "Pediatric Clinic, Room 205",
    specialtySlug: "pediatrics",
    hospitalSlug: "evercare-hospital-dhaka",
    applicationStatus: DoctorApplicationStatus.APPROVED,
    passwordHash,
    role: doctorRole,
    schedulingService,
  });

  await ensureDoctor({
    email: "dr.nusrat@mediconnect.example",
    firstName: "Nusrat",
    lastName: "Jahan",
    bmdcNumber: "BMDC-A-63910",
    degrees: "MBBS, DDV (BSMMU)",
    experienceYears: 7,
    bio: "Clinical dermatologist treating eczema, acne, psoriasis, and allergic skin disorders.",
    languages: ["Bangla", "English"],
    videoFee: "1000.00",
    chamberFee: "1200.00",
    roomOrUnit: "Outpatient Block B, Room 112",
    specialtySlug: "dermatology",
    hospitalSlug: "united-hospital-limited",
    applicationStatus: DoctorApplicationStatus.APPROVED,
    passwordHash,
    role: doctorRole,
    schedulingService,
  });

  // Pending Review Doctors for Admin Queue
  await ensureDoctor({
    email: "dr.kamrul@mediconnect.example",
    firstName: "Kamrul",
    lastName: "Hasan",
    bmdcNumber: "BMDC-A-71044",
    degrees: "MBBS, MD (Neurology - NINS)",
    experienceYears: 12,
    bio: "Neurologist specializing in stroke recovery, migraine, and peripheral neuropathy.",
    languages: ["Bangla", "English"],
    videoFee: "1100.00",
    chamberFee: "1300.00",
    roomOrUnit: "Neuro Centre, Room 504",
    specialtySlug: "neurology",
    hospitalSlug: "ibn-sina-specialized-hospital",
    applicationStatus: DoctorApplicationStatus.PENDING_REVIEW,
    passwordHash,
    role: doctorRole,
    schedulingService,
  });

  await ensureDoctor({
    email: "dr.sadia@mediconnect.example",
    firstName: "Sadia",
    lastName: "Islam",
    bmdcNumber: "BMDC-A-82319",
    degrees: "MBBS, MS (Orthopedic Surgery)",
    experienceYears: 6,
    bio: "Orthopedic specialist focusing on sports injuries, joint pain, and fracture rehabilitation.",
    languages: ["Bangla", "English"],
    videoFee: "950.00",
    chamberFee: "1100.00",
    roomOrUnit: "Ortho Suite, Room 108",
    specialtySlug: "orthopedics",
    hospitalSlug: "mediconnect-demo-medical-centre",
    applicationStatus: DoctorApplicationStatus.PENDING_REVIEW,
    passwordHash,
    role: doctorRole,
    schedulingService,
  });

  // 4. Seed Admin User
  await saveDemoUser({
    email: "admin.demo@mediconnect.example",
    firstName: "Demo",
    lastName: "Administrator",
    passwordHash,
    role: adminRole,
  });

  // 5. Seed Sample Appointments, Payments, Refunds, Prescriptions & Reviews
  const completedStart1 = new Date("2026-10-24T05:00:00.000Z");
  const completedAppt1 = await ensureSampleAppointment({
    doctorProfileId: demoDoctor.profile.id,
    patientProfileId: demoPatient.profile.id,
    chamberId: null,
    startAt: completedStart1,
    mode: ConsultationMode.VIDEO,
    feeAmount: "800.00",
    status: AppointmentStatus.COMPLETED,
    paymentReference: "MCSEEDTX0001",
  });

  const paymentRepo = AppDataSource.getRepository(Payment);
  const existingPay1 = await paymentRepo.findOneBy({ transactionId: "MCSEEDTX0001" });
  if (!existingPay1) {
    await paymentRepo.save(
      paymentRepo.create({
        appointmentId: completedAppt1.id,
        patientProfileId: demoPatient.profile.id,
        transactionId: "MCSEEDTX0001",
        idempotencyKey: "seed_idem_key_0001",
        requestHash: "0".repeat(64),
        amount: "800.00",
        commissionAmount: "120.00",
        netAmount: "680.00",
        currency: "BDT",
        status: "SUCCEEDED",
        sessionId: "seed_session_0001",
        gatewayUrl: null,
        validationId: "seed_val_0001",
        bankTransactionId: "seed_bank_0001",
        expiresAt: new Date(completedStart1.getTime() - 30 * 60 * 1000),
      }),
    );
  }

  const rxRepo = AppDataSource.getRepository(Prescription);
  const existingRx1 = await rxRepo.findOneBy({ verificationCode: "MCBD2026DEMO0001" });
  if (!existingRx1) {
    await rxRepo.save(
      rxRepo.create({
        appointmentId: completedAppt1.id,
        patientProfileId: demoPatient.profile.id,
        doctorProfileId: demoDoctor.profile.id,
        diagnosis: "Seasonal Viral Fever & Acute Pharyngitis",
        medicines: [
          {
            name: "Napa Extend (Paracetamol)",
            dosage: "665mg",
            frequency: "1 tablet every 8 hours after meal",
            duration: "5 days",
          },
          {
            name: "Fexo (Fexofenadine)",
            dosage: "120mg",
            frequency: "1 tablet at night",
            duration: "7 days",
          },
          {
            name: "Ceevit (Vitamin C)",
            dosage: "250mg",
            frequency: "1 chewable tablet daily",
            duration: "14 days",
          },
        ],
        tests: ["CBC with ESR", "CRP (Quantitative)"],
        advice: "Gargle with warm salt water 3 times daily, drink plenty of fluids, and rest.",
        verificationCode: "MCBD2026DEMO0001",
        isEditable: true,
      }),
    );
  }

  const reviewRepo = AppDataSource.getRepository(Review);
  const existingRev1 = await reviewRepo.findOneBy({ appointmentId: completedAppt1.id });
  if (!existingRev1) {
    await reviewRepo.save(
      reviewRepo.create({
        appointmentId: completedAppt1.id,
        patientProfileId: demoPatient.profile.id,
        doctorProfileId: demoDoctor.profile.id,
        rating: 5,
        comment: "Very thorough consultation and clear medication instructions! Highly recommended.",
        isVisible: true,
      }),
    );
  }

  // Completed Consultation #2 (Demo Patient with Dr. Farhana — ready for patient to leave a review!)
  await ensureSampleAppointment({
    doctorProfileId: drFarhana.profile.id,
    patientProfileId: demoPatient.profile.id,
    chamberId: drFarhana.chamber.id,
    startAt: new Date("2026-10-25T11:00:00.000Z"),
    mode: ConsultationMode.CHAMBER,
    feeAmount: "1500.00",
    status: AppointmentStatus.COMPLETED,
  });

  // Completed Consultation #3 (Rahim Patient with Demo Doctor — ready for doctor to write a prescription!)
  const completedAppt3 = await ensureSampleAppointment({
    doctorProfileId: demoDoctor.profile.id,
    patientProfileId: rahimPatient.profile.id,
    chamberId: demoDoctor.chamber.id,
    startAt: new Date("2026-10-25T11:20:00.000Z"),
    mode: ConsultationMode.CHAMBER,
    feeAmount: "600.00",
    status: AppointmentStatus.COMPLETED,
  });

  const existingRev3 = await reviewRepo.findOneBy({ appointmentId: completedAppt3.id });
  if (!existingRev3) {
    await reviewRepo.save(
      reviewRepo.create({
        appointmentId: completedAppt3.id,
        patientProfileId: rahimPatient.profile.id,
        doctorProfileId: demoDoctor.profile.id,
        rating: 4,
        comment: "Helpful chamber visit, doctor listened carefully.",
        isVisible: true,
      }),
    );
  }

  // Upcoming Confirmed Video Consultation (Demo Patient with Demo Doctor — tomorrow!)
  const upcomingStart = new Date(Date.now() + 28 * 60 * 60 * 1000);
  upcomingStart.setUTCMinutes(0, 0, 0);
  const upcomingAppt = await ensureSampleAppointment({
    doctorProfileId: demoDoctor.profile.id,
    patientProfileId: demoPatient.profile.id,
    chamberId: null,
    startAt: upcomingStart,
    mode: ConsultationMode.VIDEO,
    feeAmount: "800.00",
    status: AppointmentStatus.CONFIRMED,
    paymentReference: "MCSEEDTX0002",
  });

  const existingPay2 = await paymentRepo.findOneBy({ transactionId: "MCSEEDTX0002" });
  if (!existingPay2) {
    await paymentRepo.save(
      paymentRepo.create({
        appointmentId: upcomingAppt.id,
        patientProfileId: demoPatient.profile.id,
        transactionId: "MCSEEDTX0002",
        idempotencyKey: "seed_idem_key_0002",
        requestHash: "0".repeat(64),
        amount: "800.00",
        commissionAmount: "120.00",
        netAmount: "680.00",
        currency: "BDT",
        status: "SUCCEEDED",
        sessionId: "seed_session_0002",
        gatewayUrl: null,
        validationId: "seed_val_0002",
        bankTransactionId: "seed_bank_0002",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    );
  }

  // Cancelled Consultation with REQUESTED Refund (for Admin Refunds tab!)
  const cancelledStart = new Date("2026-10-28T05:00:00.000Z");
  const cancelledAppt = await ensureSampleAppointment({
    doctorProfileId: drTanvir.profile.id,
    patientProfileId: sumaiyaPatient.profile.id,
    chamberId: null,
    startAt: cancelledStart,
    mode: ConsultationMode.VIDEO,
    feeAmount: "900.00",
    status: AppointmentStatus.CANCELLED,
    paymentReference: "MCSEEDTX0003",
    cancellationReason: "Patient schedule conflict (cancelled >24h ahead)",
  });

  let pay3 = await paymentRepo.findOneBy({ transactionId: "MCSEEDTX0003" });
  if (!pay3) {
    pay3 = await paymentRepo.save(
      paymentRepo.create({
        appointmentId: cancelledAppt.id,
        patientProfileId: sumaiyaPatient.profile.id,
        transactionId: "MCSEEDTX0003",
        idempotencyKey: "seed_idem_key_0003",
        requestHash: "0".repeat(64),
        amount: "900.00",
        commissionAmount: "135.00",
        netAmount: "765.00",
        currency: "BDT",
        status: "SUCCEEDED",
        sessionId: "seed_session_0003",
        gatewayUrl: null,
        validationId: "seed_val_0003",
        bankTransactionId: "seed_bank_0003",
        expiresAt: new Date(cancelledStart.getTime() - 24 * 60 * 60 * 1000),
      }),
    );
  }

  const refundRepo = AppDataSource.getRepository(Refund);
  const existingRefund = await refundRepo.findOneBy({
    refundTransactionId: "MCREFUND0001",
  });
  if (!existingRefund) {
    await refundRepo.save(
      refundRepo.create({
        paymentId: pay3.id,
        refundTransactionId: "MCREFUND0001",
        amount: "900.00",
        status: "REQUESTED",
        reason: "Patient cancelled more than 24h before appointment (100% refund)",
        providerReference: null,
      }),
    );
  }
}

async function main(): Promise<void> {
  await AppDataSource.initialize();

  try {
    const roles = await seedCatalogs();
    const demoPassword = env.SEED_DEMO_PASSWORD || "#king123";
    await seedDemoData(roles, demoPassword);
    process.stdout.write(
      "Seeded 10 specialties, 6 hospitals, 6 doctors (with 7-day slots), 3 patients, family members, appointments, payments, refunds, prescriptions, and reviews.\n",
    );
  } finally {
    await AppDataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
