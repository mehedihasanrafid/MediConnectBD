import { z } from "zod";
import { DoctorApplicationStatus } from "../../database/entities/doctor-profile.entity";

const nullableTrimmedText = (maximum: number) =>
  z.union([z.string().trim().min(1).max(maximum), z.null()]);

const fee = z.number().finite().min(0).max(1_000_000);

export const updateDoctorProfileSchema = z
  .object({
    degrees: nullableTrimmedText(500).optional(),
    experienceYears: z.number().int().min(0).max(80).optional(),
    bio: nullableTrimmedText(5_000).optional(),
    photoUrl: z.union([z.string().trim().url().max(500), z.null()]).optional(),
    languages: z
      .array(z.string().trim().min(1).max(50))
      .max(10)
      .transform((values) => [...new Set(values)])
      .optional(),
    videoConsultationFee: z.union([fee, z.null()]).optional(),
    specialtyIds: z.array(z.string().uuid()).max(10).optional(),
    chambers: z
      .array(
        z.object({
          hospitalId: z.string().uuid(),
          roomOrUnit: nullableTrimmedText(120).optional(),
          consultationFee: fee,
        }),
      )
      .max(20)
      .refine(
        (items) => new Set(items.map((item) => item.hospitalId)).size === items.length,
        "A hospital can only be added once",
      )
      .optional(),
  })
  .refine((input) => Object.keys(input).length > 0, "At least one profile field is required");

const positiveInteger = (defaultValue: number, maximum: number) =>
  z.preprocess(
    (value) => (value === undefined ? defaultValue : value),
    z.coerce.number().int().min(1).max(maximum),
  );

const optionalQueryText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().trim().max(120).optional(),
);

const optionalQueryFee = z.preprocess(
  (value) => (value === undefined || value === "" ? undefined : value),
  z.coerce.number().finite().min(0).max(1_000_000).optional(),
);

export const publicDoctorQuerySchema = z
  .object({
    search: optionalQueryText,
    specialty: optionalQueryText,
    hospital: optionalQueryText,
    area: optionalQueryText,
    minFee: optionalQueryFee,
    maxFee: optionalQueryFee,
    page: positiveInteger(1, 100_000),
    limit: positiveInteger(12, 50),
  })
  .refine(
    (query) =>
      query.minFee === undefined ||
      query.maxFee === undefined ||
      query.minFee <= query.maxFee,
    { message: "minFee cannot be greater than maxFee", path: ["minFee"] },
  );

export const doctorApplicationQuerySchema = z.object({
  status: z
    .nativeEnum(DoctorApplicationStatus)
    .default(DoctorApplicationStatus.PENDING_REVIEW),
  page: positiveInteger(1, 100_000),
  limit: positiveInteger(20, 50),
});

export const doctorReviewSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal(DoctorApplicationStatus.APPROVED),
  }),
  z.object({
    decision: z.literal(DoctorApplicationStatus.REJECTED),
    reason: z.string().trim().min(3).max(500),
  }),
]);

export const doctorIdSchema = z.string().uuid();
