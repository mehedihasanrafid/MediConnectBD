/**
 * OpenAPI 3.0 request/response contracts for implemented routes only.
 * Keep request constraints aligned with module Zod schemas; the documentation tests validate
 * examples against those schemas. Response models deliberately exclude hashes and raw tokens.
 */
import type { OpenAPIV3 } from "openapi-types";

type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
export const schemaRef = (name: string): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/schemas/${name}` });
const uuid: OpenAPIV3.SchemaObject = { type: "string", format: "uuid" };
const timestamp: OpenAPIV3.SchemaObject = { type: "string", format: "date-time" };
const money: OpenAPIV3.SchemaObject = { type: "number", minimum: 0, maximum: 1_000_000 };
const text = (maxLength?: number): OpenAPIV3.SchemaObject => ({ type: "string", ...(maxLength ? { maxLength } : {}) });
const array = (items: Schema): OpenAPIV3.ArraySchemaObject => ({ type: "array", items });
const object = (properties: Record<string, Schema>, required = Object.keys(properties)): OpenAPIV3.SchemaObject => ({ type: "object", properties, ...(required.length ? { required } : {}) });
const nullable = (schema: OpenAPIV3.SchemaObject): OpenAPIV3.SchemaObject => ({ ...schema, nullable: true });
const stringDate = { type: "string", format: "date" } as const;
const localTime = { type: "string", pattern: "^([01]\\d|2[0-3]):[0-5]\\d$", example: "18:00" } as const;
const registrationIdentity = {
  email: { type: "string", format: "email", maxLength: 191 } as const,
  password: { type: "string", format: "password", writeOnly: true, minLength: 12, maxLength: 128,
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).{12,128}$", description: "At least one lowercase letter, uppercase letter, and digit." } as const,
  firstName: { type: "string", minLength: 1, maxLength: 80 } as const,
  lastName: { type: "string", minLength: 1, maxLength: 80 } as const,
};
export const applicationStatuses = ["DRAFT", "PENDING_REVIEW", "APPROVED", "REJECTED"];
export const paymentStatuses = ["INITIATED", "PENDING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REVIEW_REQUIRED"];

const hospitalProperties = { id: uuid, name: text(), slug: text(), area: text(), address: text() };
const chamber = object({ id: uuid, roomOrUnit: nullable(text()), consultationFee: money, isActive: { type: "boolean" }, hospital: schemaRef("Hospital") });
const publicDoctor = {
  id: uuid, firstName: text(), lastName: text(), degrees: nullable(text()), experienceYears: { type: "integer", minimum: 0 },
  bio: nullable(text()), photoUrl: nullable({ type: "string", format: "uri" }), languages: array(text()),
  videoConsultationFee: nullable(money), minimumFee: nullable(money), specialties: array(schemaRef("Specialty")), chambers: array(chamber),
} satisfies Record<string, Schema>;
const slotChamber = object({ id: uuid, roomOrUnit: nullable(text()), hospital: object(hospitalProperties, ["id", "name", "area", "address"]) });
const slot = object({ id: uuid, doctorId: uuid, startAt: timestamp, endAt: timestamp, mode: { type: "string", enum: ["VIDEO", "CHAMBER"] }, feeAmount: money, chamber: nullable(slotChamber) });
const ruleProperties = {
  dayOfWeek: { type: "integer", minimum: 0, maximum: 6, description: "0 = Sunday; 6 = Saturday. Times are Asia/Dhaka local wall-clock values." },
  startTime: localTime, endTime: localTime, slotDurationMinutes: { type: "integer", enum: [10, 15, 20, 30] },
} satisfies Record<string, Schema>;

export const requestExamples = {
  PatientRegistration: { email: "patient@example.com", password: "ExamplePassword123!", firstName: "Test", lastName: "Patient", phone: "01700000000" },
  DoctorRegistration: { email: "doctor@example.com", password: "ExamplePassword123!", firstName: "Test", lastName: "Doctor", bmdcNumber: "DEMO-NOT-REAL-123" },
  Login: { email: "patient@example.com", password: "ExamplePassword123!" },
  DoctorProfilePatch: { degrees: "Synthetic MBBS", experienceYears: 5, bio: "Synthetic doctor for development testing.", languages: ["Bangla", "English"], videoConsultationFee: 800, specialtyIds: [] },
  DoctorReview: { decision: "APPROVED" },
  ReplaceSchedule: { rules: [{ dayOfWeek: 1, startTime: "18:00", endTime: "20:00", slotDurationMinutes: 20, mode: "VIDEO" }] },
  CreateTimeOff: { date: "2026-10-25", reason: "Unavailable for the day" },
  CreateHold: { slotId: "00000000-0000-4000-8000-000000000001" },
  BookAppointment: { holdId: "00000000-0000-4000-8000-000000000002" },
  CancelAppointment: { reason: "Schedule conflict" },
  PaymentCustomer: { name: "Test Patient", email: "patient@example.com", phone: "01700000000", address: "Test Road", city: "Dhaka", postcode: "1200" },
  PaymentCallback: { tran_id: "MCexample_transaction", val_id: "provider_validation_reference" },
} satisfies Record<string, unknown>;

/** Request examples are synthetic. Replace UUIDs with IDs returned by real API calls. */
export const openApiSchemas: Record<string, Schema> = {
  Error: object({ code: text(), message: text(), details: { description: "Optional safe details, such as paymentId for uncertain checkout initiation." } }, ["code", "message"]),
  ValidationError: object({ code: { type: "string", enum: ["VALIDATION_FAILED"] }, message: text(), fieldErrors: array(object({ path: text(), message: text() })) }),
  PatientRegistration: object({ ...registrationIdentity, phone: { type: "string", minLength: 7, maxLength: 32 } }, Object.keys(registrationIdentity)),
  DoctorRegistration: object({ ...registrationIdentity, bmdcNumber: { type: "string", minLength: 3, maxLength: 64, pattern: "^[A-Za-z0-9\\-/.]+$", description: "Uppercased by the API. A demo value is not a verified clinical credential." } }),
  Login: object({ email: registrationIdentity.email, password: { type: "string", format: "password", writeOnly: true, minLength: 1, maxLength: 128 } }),
  User: object({ id: uuid, email: { type: "string", format: "email" }, firstName: text(), lastName: text(),
    status: { type: "string", enum: ["ACTIVE", "PENDING", "SUSPENDED"] }, roles: array({ type: "string", enum: ["PATIENT", "DOCTOR", "ADMIN"] }),
    patientProfileId: nullable(uuid), doctorProfile: nullable(object({ id: uuid, applicationStatus: { type: "string", enum: applicationStatuses } })) }),
  AuthResponse: object({ accessToken: { type: "string", description: "Short-lived JWT. Copy this value into Authorize; do not include the Bearer prefix." },
    accessTokenExpiresIn: { type: "integer", example: 900 }, tokenType: { type: "string", enum: ["Bearer"] }, user: schemaRef("User") }),
  Specialty: object({ id: uuid, name: text(), slug: text() }),
  Hospital: object(hospitalProperties),
  Specialties: object({ items: array(schemaRef("Specialty")) }),
  Hospitals: object({ items: array(schemaRef("Hospital")) }),
  PublicDoctor: object(publicDoctor),
  DoctorDetails: object({
    id: uuid, userId: uuid, email: { type: "string", format: "email" }, firstName: text(), lastName: text(), bmdcNumber: text(),
    degrees: nullable(text()), experienceYears: { type: "integer" }, bio: nullable(text()), photoUrl: nullable({ type: "string", format: "uri" }), languages: array(text()),
    videoConsultationFee: nullable(money), applicationStatus: { type: "string", enum: applicationStatuses }, reviewedAt: nullable(timestamp), reviewedByUserId: nullable(uuid),
    rejectionReason: nullable(text()), specialties: array(schemaRef("Specialty")), chambers: array(chamber), createdAt: timestamp, updatedAt: timestamp,
  }),
  DoctorProfilePatch: { ...object({
    degrees: nullable({ type: "string", minLength: 1, maxLength: 500 }), experienceYears: { type: "integer", minimum: 0, maximum: 80 },
    bio: nullable({ type: "string", minLength: 1, maxLength: 5000 }), photoUrl: nullable({ type: "string", format: "uri", maxLength: 500 }),
    languages: { ...array({ type: "string", minLength: 1, maxLength: 50 }), maxItems: 10 }, videoConsultationFee: nullable(money),
    specialtyIds: { ...array(uuid), maxItems: 10 },
    chambers: { ...array(object({ hospitalId: uuid, roomOrUnit: nullable({ type: "string", minLength: 1, maxLength: 120 }), consultationFee: money }, ["hospitalId", "consultationFee"])), maxItems: 20 },
  }, []), minProperties: 1, description: "Only supplied fields are changed. Hospitals must be unique within chambers. Editing an approved profile resets approval; pending applications are frozen." },
  DoctorReview: { oneOf: [object({ decision: { type: "string", enum: ["APPROVED"] } }), object({ decision: { type: "string", enum: ["REJECTED"] }, reason: { type: "string", minLength: 3, maxLength: 500 } })] },
  ReplaceSchedule: object({ rules: { type: "array", maxItems: 50, items: { oneOf: [
    object({ ...ruleProperties, mode: { type: "string", enum: ["VIDEO"] }, chamberId: { type: "string", nullable: true, enum: [null] } }, [...Object.keys(ruleProperties), "mode"]),
    object({ ...ruleProperties, mode: { type: "string", enum: ["CHAMBER"] }, chamberId: uuid }),
  ] }, description: "Replaces all weekly rules. Start must precede end; intervals cannot overlap across consultation modes." } }),
  ScheduleRule: object({ id: uuid, doctorProfileId: uuid, ...ruleProperties,
    startTime: { type: "string", example: "18:00:00" }, endTime: { type: "string", example: "20:00:00" },
    mode: { type: "string", enum: ["VIDEO", "CHAMBER"] }, chamberId: nullable(uuid), isActive: { type: "boolean" } }),
  CreateTimeOff: { ...object({ date: stringDate, startTime: nullable(localTime), endTime: nullable(localTime), reason: nullable({ type: "string", minLength: 1, maxLength: 300 }) }, ["date"]),
    description: "Omit both times (or use null for both) for a full day. Otherwise supply both times with start before end. Date must be today through one year ahead in Dhaka." },
  TimeOff: object({ id: uuid, doctorProfileId: uuid, date: stringDate, startTime: nullable(text()), endTime: nullable(text()), reason: nullable(text()), createdAt: timestamp }),
  Schedule: object({ timezone: { type: "string", enum: ["Asia/Dhaka"] }, rules: array(schemaRef("ScheduleRule")), timeOff: array(schemaRef("TimeOff")) }),
  Slot: slot,
  Availability: object({ doctorId: uuid, timezone: { type: "string", enum: ["Asia/Dhaka"] }, from: stringDate, through: stringDate, items: array(schemaRef("Slot")) }),
  GeneratedSlots: object({ generated: { type: "integer", minimum: 0 } }),
  CreateHold: object({ slotId: uuid }),
  BookAppointment: object({ holdId: uuid }),
  CancelAppointment: object({ reason: { type: "string", minLength: 3, maxLength: 500 } }),
  CancellationOutcome: object({ appointment: schemaRef("Appointment"),
    refundPercent: { type: "integer", enum: [0, 50, 100] }, refundAmount: money,
    refundId: nullable(uuid) }),
  Hold: object({ id: uuid, patientProfileId: uuid, status: { type: "string", enum: ["ACTIVE", "CONVERTED", "EXPIRED", "RELEASED"] }, expiresAt: timestamp, createdAt: timestamp, slot: schemaRef("Slot") }),
  Appointment: object({ id: uuid, patientProfileId: uuid, doctorId: uuid, holdId: uuid,
    status: { type: "string", enum: ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "PAYMENT_EXPIRED", "COMPLETED", "NO_SHOW"] },
    scheduledStartAt: timestamp, scheduledEndAt: timestamp, mode: { type: "string", enum: ["VIDEO", "CHAMBER"] }, feeAmount: money,
    paymentRequired: { type: "boolean" }, paymentReference: nullable(text()), cancellationReason: nullable(text()), createdAt: timestamp, updatedAt: timestamp, slot: schemaRef("Slot") }),
  Appointments: object({ items: array(schemaRef("Appointment")) }),
  PaymentCustomer: { ...object({ name: { type: "string", minLength: 1, maxLength: 50 }, email: { type: "string", format: "email", maxLength: 50 },
    phone: { type: "string", pattern: "^\\+?\\d{7,20}$" }, address: { type: "string", minLength: 1, maxLength: 50 },
    city: { type: "string", minLength: 1, maxLength: 50 }, postcode: { type: "string", minLength: 1, maxLength: 30 } }), additionalProperties: false },
  Payment: object({ id: uuid, appointmentId: uuid, patientProfileId: uuid, transactionId: text(30),
    amount: { type: "string", pattern: "^\\d+\\.\\d{2}$", example: "800.00", description: "Exact decimal BDT snapshot; this is a string, unlike presentation fees in doctor/slot views." },
    currency: { type: "string", enum: ["BDT"] }, status: { type: "string", enum: paymentStatuses },
    gatewayUrl: nullable({ type: "string", format: "uri", description: "Only returned for an unexpired PENDING checkout." }), expiresAt: timestamp }),
  PaymentCallback: { ...object({ tran_id: { type: "string", minLength: 1, maxLength: 30, pattern: "^[A-Za-z0-9_-]+$" }, val_id: { type: "string", minLength: 1, maxLength: 100 } }, ["tran_id"]),
    description: "Provider reference only. Every result is verified with SSLCommerz; caller-supplied status/amount is not trusted." },
  CallbackReceived: object({ received: { type: "boolean", enum: [true] }, status: { type: "string", enum: paymentStatuses } }),
  Liveness: object({ status: { type: "string", enum: ["ok"] }, service: { type: "string", enum: ["mediconnect-api"] } }),
  Readiness: object({ status: { type: "string", enum: ["ready", "not_ready"] }, dependencies: object({ database: { type: "string", enum: ["up", "down"] }, redis: { type: "string", enum: ["up", "down"] } }) }),
  ApiInfo: object({ name: text(), version: text(), documentation: text() }),
};

for (const [name, item] of [["Doctors", "PublicDoctor"], ["DoctorApplications", "DoctorDetails"]] as const) {
  openApiSchemas[name] = object({ items: array(schemaRef(item)), page: { type: "integer", minimum: 1 }, limit: { type: "integer", minimum: 1 }, total: { type: "integer", minimum: 0 }, totalPages: { type: "integer", minimum: 0 } });
}
