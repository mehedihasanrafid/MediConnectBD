/**
 * Complete OpenAPI inventory for the implemented HTTP surface.
 * Relative same-origin server URLs work on localhost and on a later test deployment.
 * Adding a route requires updating this inventory; tests compare it with actual router bindings.
 */
import type { OpenAPIV3 } from "openapi-types";
import { applicationStatuses, openApiSchemas, requestExamples, schemaRef } from "./openapi.schemas";

type Method = "get" | "post" | "put" | "patch" | "delete";
type Access = "public" | "bearer" | "refresh";
interface OperationOptions {
  access?: Access;
  roles?: string[];
  body?: keyof typeof requestExamples;
  form?: boolean;
  parameters?: OpenAPIV3.ParameterObject[];
  errors?: number[];
  description?: string;
  cookie?: boolean;
}
const paths: OpenAPIV3.PathsObject = {};
const jsonResponse = (schema: string, description = "Successful response"): OpenAPIV3.ResponseObject => ({ description, content: { "application/json": { schema: schemaRef(schema) } } });
const errorResponse = (code: number): OpenAPIV3.ReferenceObject => ({ $ref: `#/components/responses/Error${code}` });
const id = (name: string): OpenAPIV3.ParameterObject => ({ name, in: "path", required: true, description: `Use a real ${name} returned by the API.`, schema: { type: "string", format: "uuid" } });
const query = (name: string, schema: OpenAPIV3.SchemaObject, description?: string): OpenAPIV3.ParameterObject => ({ name, in: "query", required: false, schema, ...(description ? { description } : {}) });
const pagination = (limit: number): OpenAPIV3.ParameterObject[] => [
  query("page", { type: "integer", minimum: 1, maximum: 100000, default: 1 }),
  query("limit", { type: "integer", minimum: 1, maximum: 50, default: limit }),
];

/** Keep the same response envelopes and status codes that the controllers actually send. */
function add(method: Method, path: string, operationId: string, tag: string, summary: string, responseSchema: string | null, status = 200, options: OperationOptions = {}): void {
  const access = options.access ?? "public";
  const security = access === "bearer" ? [{ bearerAuth: [] }] : access === "refresh" ? [{ refreshCookie: [] }] : [];
  const errors = new Set([500, ...(options.errors ?? [])]);
  if (access !== "public") { errors.add(401); errors.add(403); }
  if (options.body || options.parameters?.length) errors.add(422);
  const responses: OpenAPIV3.ResponsesObject = { [status]: responseSchema ? jsonResponse(responseSchema) : { description: "Completed successfully; no response body." } };
  for (const code of errors) responses[code] = errorResponse(code);
  if (options.cookie) (responses[status] as OpenAPIV3.ResponseObject).headers = {
    "Set-Cookie": { description: "HTTP-only rotating refresh cookie; the browser stores it automatically. Secure in production.", schema: { type: "string" } },
  };
  const operation: OpenAPIV3.OperationObject & { "x-required-roles"?: string[] } = {
    operationId, tags: [tag], summary, responses, security,
    ...(options.description ? { description: options.description } : {}),
    ...(options.parameters?.length ? { parameters: options.parameters } : {}),
    ...(options.roles ? { "x-required-roles": options.roles } : {}),
  };
  if (options.body) operation.requestBody = { required: true, content: {
    [options.form ? "application/x-www-form-urlencoded" : "application/json"]: {
      schema: schemaRef(options.body), example: requestExamples[options.body],
    },
  } };
  paths[path] ??= {};
  paths[path]![method] = operation;
}

add("get", "/", "getApiInfo", "Platform", "API information", "ApiInfo");
add("get", "/health/live", "getLiveness", "Health", "Check that the HTTP process is alive", "Liveness");
add("get", "/health/ready", "getReadiness", "Health", "Check MySQL and Redis readiness", "Readiness");
paths["/health/ready"]!.get!.responses[503] = jsonResponse("Readiness", "A required local dependency is unavailable.");

const auth = "/api/v1/auth";
add("post", `${auth}/patient/register`, "registerPatient", "Authentication", "Register a patient and start a session", "AuthResponse", 201, { body: "PatientRegistration", cookie: true, errors: [409], description: "The example credentials are synthetic. Use your own development account; do not enter a production password." });
add("post", `${auth}/doctor/register`, "registerDoctor", "Authentication", "Register a doctor with a draft application", "AuthResponse", 201, { body: "DoctorRegistration", cookie: true, errors: [409], description: "Registration grants a login, not clinical approval. Complete the profile and submit it for manual admin review." });
add("post", `${auth}/login`, "login", "Authentication", "Log in and receive an access token", "AuthResponse", 200, { body: "Login", cookie: true, errors: [401, 403], description: "Copy accessToken from the response into Authorize. Enter the token alone; Swagger adds Bearer automatically. The HTTP-only refresh cookie is stored by the browser." });
add("post", `${auth}/refresh`, "refreshSession", "Authentication", "Rotate the browser's refresh session", "AuthResponse", 200, { access: "refresh", cookie: true, description: "No request body. Log in through this same origin first. The browser sends the HTTP-only cookie; Swagger's Authorize panel cannot manually create that cookie. Rotate only once per current token; replay revokes refresh sessions." });
add("post", `${auth}/logout`, "logout", "Authentication", "Revoke the current refresh session", null, 204, { cookie: true, description: "No request body. Revokes the refresh cookie if present and clears it; an already-issued access JWT remains valid until its own expiry/account checks." });

add("get", "/api/v1/me", "getMyAccount", "Account", "Read the authenticated account", "User", 200, { access: "bearer" });
add("get", "/api/v1/catalog/specialties", "listSpecialties", "Catalog", "List active specialties", "Specialties");
add("get", "/api/v1/catalog/hospitals", "listHospitals", "Catalog", "List active hospitals", "Hospitals");

const doctors = "/api/v1/doctors";
add("get", doctors, "listDoctors", "Doctors", "Search approved, active doctors", "Doctors", 200, {
  parameters: [query("search", { type: "string", maxLength: 120 }), query("specialty", { type: "string", maxLength: 120 }, "Specialty UUID or slug, for example medicine."),
    query("hospital", { type: "string", maxLength: 120 }, "Hospital UUID or slug."), query("area", { type: "string", maxLength: 120 }),
    query("minFee", { type: "number", minimum: 0, maximum: 1_000_000 }), query("maxFee", { type: "number", minimum: 0, maximum: 1_000_000 }), ...pagination(12)],
  description: "Filters combine with AND. minFee must not exceed maxFee. Public responses omit private account/reviewer information.",
});
add("get", `${doctors}/{doctorId}`, "getDoctor", "Doctors", "Read an approved doctor's public profile", "PublicDoctor", 200, { parameters: [id("doctorId")], errors: [404] });
const doctorAccess = { access: "bearer" as const, roles: ["DOCTOR"], errors: [404, 409] };
add("get", `${doctors}/me`, "getMyDoctorProfile", "Doctor profile", "Read your private doctor profile", "DoctorDetails", 200, doctorAccess);
add("get", `${doctors}/me/earnings`, "getMyDoctorEarnings", "Doctor profile", "Read your earnings summary by day and month", "DoctorEarnings", 200, doctorAccess);
add("get", `${doctors}/me/patients/{patientProfileId}/history`, "getDoctorPatientHistory", "Doctor profile", "Read clinical history, prescriptions, and reports for a patient you treat", "DoctorPatientHistory", 200, {
  ...doctorAccess, parameters: [id("patientProfileId")],
  description: "DOCTOR only. Requires at least one appointment between the doctor and the patient. Returns past visits, prescriptions, and uploaded medical reports.",
});
add("patch", `${doctors}/me`, "updateMyDoctorProfile", "Doctor profile", "Update your doctor profile", "DoctorDetails", 200, { ...doctorAccess, body: "DoctorProfilePatch", description: "DOCTOR only. Add actual specialty IDs from Catalog. Pending applications cannot be edited; changes to an approved profile reset it to draft." });
add("post", `${doctors}/me/submit`, "submitDoctorApplication", "Doctor profile", "Submit your application for review", "DoctorDetails", 200, { ...doctorAccess, description: "No body. Requires degrees, at least one specialty, and a video fee or active chamber. Only draft/rejected applications can be submitted." });
add("get", `${doctors}/me/appointments`, "listDoctorAppointments", "Doctor profile", "List appointments assigned to the authenticated doctor", "DoctorAppointments", 200, doctorAccess);

add("get", `${doctors}/me/schedule`, "getMySchedule", "Scheduling", "Read your weekly rules and time off", "Schedule", 200, doctorAccess);
add("put", `${doctors}/me/schedule`, "replaceMySchedule", "Scheduling", "Replace your weekly schedule", "Schedule", 200, { ...doctorAccess, body: "ReplaceSchedule", description: "Approved DOCTOR only. Replaces the full rule collection and regenerates availability. Times are Dhaka local values; use a chamber ID from your profile for CHAMBER rules." });
add("post", `${doctors}/me/time-off`, "addMyTimeOff", "Scheduling", "Add a full or partial day off", "TimeOff", 201, { ...doctorAccess, body: "CreateTimeOff", description: "Approved DOCTOR only. Choose an actual future date; the example date is illustrative. Omit both times for a full day." });
add("delete", `${doctors}/me/time-off/{timeOffId}`, "removeMyTimeOff", "Scheduling", "Remove your own time-off entry", null, 204, { ...doctorAccess, parameters: [id("timeOffId")] });
add("post", `${doctors}/me/slots/generate`, "generateMySlots", "Scheduling", "Regenerate the rolling seven-day slot window", "GeneratedSlots", 200, doctorAccess);
add("get", `${doctors}/{doctorId}/availability`, "getDoctorAvailability", "Scheduling", "Find bookable slots for an approved doctor", "Availability", 200, {
  parameters: [id("doctorId"), query("from", { type: "string", format: "date" }, "Dhaka local date within the next seven days; omit to start today."), query("days", { type: "integer", minimum: 1, maximum: 7, default: 7 })],
  errors: [404], description: "Returns UTC slot timestamps and the display timezone. The complete date range must stay inside the next seven Dhaka calendar days. Only slots at least one hour ahead are returned.",
});

const admin = "/api/v1/admin/doctors";
const adminAccess = { access: "bearer" as const, roles: ["ADMIN"] };
add("get", `${admin}/applications`, "listDoctorApplications", "Admin", "List doctor applications", "DoctorApplications", 200, {
  ...adminAccess, parameters: [query("status", { type: "string", enum: applicationStatuses, default: "PENDING_REVIEW" }), ...pagination(20)], description: "ADMIN only. Use a seeded development admin account; public registration does not grant the admin role.",
});
add("patch", `${admin}/{doctorId}/application`, "reviewDoctorApplication", "Admin", "Approve or reject a pending doctor application", "DoctorDetails", 200, {
  ...adminAccess, parameters: [id("doctorId")], body: "DoctorReview", errors: [409], description: 'ADMIN only. For rejection send {"decision":"REJECTED","reason":"Explanation"}. The reviewer is derived from the authenticated account.',
});

const appointments = "/api/v1/appointments";
const patientAccess = { access: "bearer" as const, roles: ["PATIENT"] };
add("post", `${appointments}/holds`, "holdAppointmentSlot", "Appointments", "Hold an available slot for ten minutes", "Hold", 201, { ...patientAccess, body: "CreateHold", errors: [404, 409], description: "PATIENT only. Get slotId from doctor availability. Same-patient retries may return the existing active hold; another patient cannot take that hold." });
add("delete", `${appointments}/holds/{holdId}`, "releaseAppointmentHold", "Appointments", "Release your hold and unpaid booking", null, 204, { ...patientAccess, parameters: [id("holdId")], errors: [404] });
add("post", appointments, "bookAppointment", "Appointments", "Create an appointment from your active hold", "Appointment", 201, { ...patientAccess, body: "BookAppointment", errors: [404, 409], description: "PATIENT only. Chamber visits confirm immediately. Video visits remain PENDING_PAYMENT with the original hold expiry; proceed to payment before it expires." });
add("get", `${appointments}/me`, "listMyAppointments", "Appointments", "List your appointments", "Appointments", 200, patientAccess);
add("post", `${appointments}/{appointmentId}/reschedule`, "rescheduleAppointment", "Appointments", "Reschedule an upcoming appointment to a new slot", "Appointment", 200, {
  ...patientAccess, body: "RescheduleAppointment", errors: [403, 404, 409], parameters: [id("appointmentId")],
  description: "PATIENT only. Atomically moves an upcoming confirmed or pending-payment appointment (at least 1 hour before start) to another available slot with the same doctor and consultation mode.",
});
add("get", `${appointments}/{appointmentId}/video-session`, "getAppointmentVideoSession", "Appointments", "Join the video consultation room for a confirmed video appointment", "VideoSession", 200, {
  access: "bearer", roles: ["PATIENT", "DOCTOR"], errors: [403, 404, 409], parameters: [id("appointmentId")],
  description: "PATIENT or DOCTOR only (never ADMIN). Room opens 5 minutes before scheduledStartAt and closes at scheduledEndAt.",
});
add("post", `${appointments}/{appointmentId}/cancel`, "cancelAppointment", "Appointments", "Cancel an appointment and request a refund", "CancellationOutcome", 200, {
  access: "bearer", roles: ["PATIENT", "DOCTOR", "ADMIN"], body: "CancelAppointment", errors: [403, 404, 409], parameters: [id("appointmentId")],
  description: "PATIENT, DOCTOR, or ADMIN. Refund depends on notice for patients: more than 24 hours is full, 2 to 24 hours is half, under 2 hours is none. A doctor or admin cancellation always refunds in full. The refund is recorded as REQUESTED; no provider refund is executed yet. Repeating the call for an already-cancelled appointment returns its current state.",
});
add("post", `${appointments}/{appointmentId}/complete`, "completeAppointment", "Appointments", "Mark a confirmed appointment as completed", "Appointment", 200, {
  access: "bearer", roles: ["DOCTOR"], errors: [403, 404, 409], parameters: [id("appointmentId")],
  description: "DOCTOR only. Transitions a confirmed appointment owned by the doctor to COMPLETED so prescriptions and reviews can be created. Repeating the call on an already-completed appointment is idempotent.",
});
add("post", `${appointments}/{appointmentId}/no-show`, "markAppointmentNoShow", "Appointments", "Mark a confirmed appointment as no-show", "Appointment", 200, {
  access: "bearer", roles: ["DOCTOR"], errors: [403, 404, 409], parameters: [id("appointmentId")],
  description: "DOCTOR only. Transitions a confirmed appointment owned by the doctor to NO_SHOW when the patient does not attend. Repeating the call on an already-marked no-show appointment is idempotent.",
});

const familyMembers = "/api/v1/patients/me/family-members";
add("get", familyMembers, "listFamilyMembers", "Family members", "List your family members", "FamilyMembersList", 200, patientAccess);
add("get", `${familyMembers}/{id}`, "getFamilyMember", "Family members", "Read a single family member", "FamilyMember", 200, { ...patientAccess, parameters: [id("id")], errors: [404] });
add("post", familyMembers, "createFamilyMember", "Family members", "Add a family member (max 10 per patient)", "FamilyMember", 201, { ...patientAccess, body: "CreateFamilyMember", errors: [409] });
add("patch", `${familyMembers}/{id}`, "updateFamilyMember", "Family members", "Update a family member", "FamilyMember", 200, { ...patientAccess, body: "UpdateFamilyMember", parameters: [id("id")], errors: [404] });
add("delete", `${familyMembers}/{id}`, "deleteFamilyMember", "Family members", "Remove a family member", null, 204, { ...patientAccess, parameters: [id("id")], errors: [404] });

const medicalReports = "/api/v1/patients/me/reports";
add("get", medicalReports, "listMyMedicalReports", "Medical reports", "List your uploaded medical reports", "MedicalReportsList", 200, patientAccess);
add("post", medicalReports, "uploadMedicalReport", "Medical reports", "Upload a medical report to share with treating doctors", "MedicalReportSummary", 201, {
  ...patientAccess, body: "CreateMedicalReport", errors: [400, 413],
  description: "PATIENT only. Uploads a base64-encoded medical report (up to 2 MB) visible only to the patient and their treating doctors.",
});
add("get", `${medicalReports}/{reportId}/download`, "downloadMedicalReport", "Medical reports", "Download a medical report (patient or treating doctor only)", "MedicalReportDetail", 200, {
  access: "bearer", roles: ["PATIENT", "DOCTOR"], parameters: [id("reportId")], errors: [403, 404],
  description: "PATIENT or treating DOCTOR only. ADMIN cannot read medical report content.",
});
add("delete", `${medicalReports}/{reportId}`, "deleteMedicalReport", "Medical reports", "Delete your uploaded medical report", null, 204, {
  ...patientAccess, parameters: [id("reportId")], errors: [404],
});

const reviews = "/api/v1/reviews";
add("post", `${reviews}/me/reviews`, "createReview", "Reviews", "Submit a review for a completed appointment", "Review", 201, {
  ...patientAccess, body: "CreateReview", errors: [404, 409], parameters: [],
  description: "PATIENT only. One review per completed appointment. Rating must be 1-5. Only COMPLETED appointments can be reviewed.",
});
add("get", `${reviews}/me/reviews`, "listMyReviews", "Reviews", "List your reviews", "ReviewsList", 200, patientAccess);
add("get", `${reviews}/doctors/{doctorId}/reviews`, "listDoctorReviews", "Reviews", "View all public reviews for a doctor", "ReviewsList", 200, {
  access: "public", parameters: [id("doctorId")],
  description: "Public endpoint. Returns visible reviews sorted by newest first.",
});
add("delete", `${reviews}/{reviewId}`, "deleteReview", "Reviews", "Admin: remove a review (soft delete)", null, 204, {
  ...adminAccess, parameters: [id("reviewId")], errors: [404],
  description: "ADMIN only. Soft-deletes by setting isVisible=false.",
});

const prescriptions = "/api/v1/prescriptions";
const prescriptionDoctorAccess = { access: "bearer" as const, roles: ["DOCTOR"] };
add("get", `${prescriptions}/medicines/suggest`, "suggestMedicines", "Prescriptions", "Autocomplete medicine names and standard dosages", "MedicineSuggestionsList", 200, {
  ...prescriptionDoctorAccess, parameters: [query("q", { type: "string", maxLength: 100 }, "Search prefix or keyword for medicine brand/generic name.")],
});
add("post", `${prescriptions}/me/prescriptions`, "createPrescription", "Prescriptions", "Doctor creates a prescription for a completed appointment", "Prescription", 201, {
  ...prescriptionDoctorAccess, body: "CreatePrescription", errors: [403, 404, 409],
  description: "DOCTOR only. One prescription per completed appointment. Requires at least one medicine. Editable within 24h of creation.",
});
add("get", `${prescriptions}/me/prescriptions`, "listDoctorPrescriptions", "Prescriptions", "List prescriptions issued by the doctor", "PrescriptionsList", 200, prescriptionDoctorAccess);
add("get", `${prescriptions}/{prescriptionId}/pdf`, "downloadPrescriptionPdf", "Prescriptions", "Download a formatted PDF of the prescription", null, 200, {
  access: "bearer", roles: ["PATIENT", "DOCTOR"], parameters: [id("prescriptionId")], errors: [403, 404],
  description: "PATIENT or prescribing DOCTOR only (never ADMIN). Streams an application/pdf document.",
});
paths[`${prescriptions}/{prescriptionId}/pdf`]!.get!.responses[200] = {
  description: "Formatted PDF prescription document.",
  content: { "application/pdf": { schema: { type: "string", format: "binary" } } },
};
add("put", `${prescriptions}/{prescriptionId}`, "updatePrescription", "Prescriptions", "Update a prescription within 24h edit window", "Prescription", 200, {
  ...prescriptionDoctorAccess, body: "UpdatePrescription", errors: [403, 404, 409], parameters: [id("prescriptionId")],
  description: "DOCTOR only. Only the prescribing doctor can update. Edit window is 24 hours from creation. Updates are versioned.",
});
add("delete", `${prescriptions}/{prescriptionId}`, "deletePrescription", "Prescriptions", "Delete a prescription within 24h edit window", null, 204, {
  ...prescriptionDoctorAccess, parameters: [id("prescriptionId")], errors: [404, 409],
  description: "DOCTOR only. Permanent deletion within the 24-hour edit window.",
});
add("get", `${prescriptions}/patients/me/prescriptions`, "listPatientPrescriptions", "Prescriptions", "List prescriptions received by the patient", "PrescriptionsList", 200, patientAccess);
add("get", `${prescriptions}/verify/{verificationCode}`, "verifyPrescription", "Prescriptions", "Verify a prescription by its unique code", "VerifyPrescription", 200, {
  access: "public", parameters: [{ name: "verificationCode", in: "path", required: true, description: "16-character verification code.", schema: { type: "string", minLength: 16, maxLength: 16 } }],
  description: "Public endpoint. Returns minimal verification metadata (doctor name and issue date) without clinical content.",
});

const adminOps = "/api/v1/admin";
add("get", `${adminOps}/overview`, "getAdminOverview", "Admin operations", "Read platform-wide operational totals", "AdminOverview", 200, adminAccess);
add("get", `${adminOps}/users`, "listAdminUsers", "Admin operations", "List and filter user accounts", "AdminUsers", 200, {
  ...adminAccess, parameters: [query("status", { type: "string", enum: ["ACTIVE", "PENDING", "SUSPENDED"] }), query("role", { type: "string", enum: ["PATIENT", "DOCTOR", "ADMIN"] }), query("search", { type: "string", maxLength: 120 }), ...pagination(20)],
  description: "ADMIN only. Filters combine with AND. Search matches email, first name, or last name.",
});
add("patch", `${adminOps}/users/{userId}/status`, "updateAdminUserStatus", "Admin operations", "Activate, pend, or suspend an account", "AdminUser", 200, {
  ...adminAccess, body: "UpdateUserStatus", parameters: [id("userId")], errors: [404, 409],
  description: "ADMIN only. Suspending your own account is rejected with 409 SELF_SUSPENSION_FORBIDDEN.",
});
add("get", `${adminOps}/specialties`, "listAdminSpecialties", "Admin operations", "List all specialties including inactive", "AdminSpecialties", 200, adminAccess);
add("post", `${adminOps}/specialties`, "createAdminSpecialty", "Admin operations", "Create a specialty", "AdminSpecialty", 201, { ...adminAccess, body: "CreateSpecialty", errors: [409] });
add("put", `${adminOps}/specialties/{specialtyId}`, "updateAdminSpecialty", "Admin operations", "Update a specialty", "AdminSpecialty", 200, { ...adminAccess, body: "UpdateSpecialty", parameters: [id("specialtyId")], errors: [404, 409] });
add("delete", `${adminOps}/specialties/{specialtyId}`, "deleteAdminSpecialty", "Admin operations", "Deactivate a specialty", null, 204, { ...adminAccess, parameters: [id("specialtyId")], errors: [404], description: "ADMIN only. Soft delete: sets isActive=false because doctors reference specialties." });
add("get", `${adminOps}/hospitals`, "listAdminHospitals", "Admin operations", "List all hospitals including inactive", "AdminHospitals", 200, adminAccess);
add("post", `${adminOps}/hospitals`, "createAdminHospital", "Admin operations", "Create a hospital", "AdminHospital", 201, { ...adminAccess, body: "CreateHospital", errors: [409] });
add("put", `${adminOps}/hospitals/{hospitalId}`, "updateAdminHospital", "Admin operations", "Update a hospital", "AdminHospital", 200, { ...adminAccess, body: "UpdateHospital", parameters: [id("hospitalId")], errors: [404, 409] });
add("delete", `${adminOps}/hospitals/{hospitalId}`, "deleteAdminHospital", "Admin operations", "Deactivate a hospital", null, 204, { ...adminAccess, parameters: [id("hospitalId")], errors: [404], description: "ADMIN only. Soft delete: sets isActive=false because chambers reference hospitals." });
add("get", `${adminOps}/appointments`, "listAdminAppointments", "Admin operations", "List and filter all appointments", "AdminAppointments", 200, {
  ...adminAccess, parameters: [query("status", { type: "string", enum: ["PENDING_PAYMENT", "CONFIRMED", "CANCELLED", "PAYMENT_EXPIRED", "COMPLETED", "NO_SHOW"] }), query("doctorId", { type: "string", format: "uuid" }), query("patientProfileId", { type: "string", format: "uuid" }), query("from", { type: "string", format: "date" }), query("to", { type: "string", format: "date" }), ...pagination(20)],
});
add("get", `${adminOps}/payments`, "listAdminPayments", "Admin operations", "List and filter all payments", "AdminPayments", 200, {
  ...adminAccess, parameters: [query("status", { type: "string", enum: ["INITIATED", "PENDING", "SUCCEEDED", "FAILED", "CANCELLED", "EXPIRED", "REVIEW_REQUIRED"] }), query("from", { type: "string", format: "date" }), query("to", { type: "string", format: "date" }), ...pagination(20)],
});
add("get", `${adminOps}/refunds`, "listAdminRefunds", "Admin operations", "List refund requests", "AdminRefunds", 200, { ...adminAccess, parameters: pagination(20) });
add("post", `${adminOps}/refunds/{refundId}/submit`, "submitAdminRefund", "Admin operations", "Mark a refund request as submitted", "AdminRefund", 200, {
  ...adminAccess, parameters: [id("refundId")], errors: [404, 409],
  description: "ADMIN only. Transitions REQUESTED to SUBMITTED. No provider refund is executed: PaymentProvider exposes no refund method, so settlement stays manual.",
});

add("post", `${appointments}/{appointmentId}/payments`, "initiatePayment", "Payments", "Create a sandbox hosted checkout", "Payment", 200, {
  ...patientAccess, body: "PaymentCustomer", errors: [404, 409, 502, 503], parameters: [id("appointmentId"), {
    name: "Idempotency-Key", in: "header", required: true, description: "Keep the same key and body when retrying the same checkout. A changed payload or key conflicts with the existing payment.",
    schema: { type: "string", minLength: 16, maxLength: 100, pattern: "^[A-Za-z0-9_-]+$" }, example: "checkout_test_2026_001",
  }], description: "PATIENT only. Requires an owned video appointment with an active hold. Amount/currency come from the server, not this body. Requires sandbox configuration. On uncertain initiation, details.paymentId identifies the existing payment for reconciliation; do not create a second charge.",
});
add("get", "/api/v1/payments/{paymentId}", "getPayment", "Payments", "Read your payment status", "Payment", 200, { ...patientAccess, parameters: [id("paymentId")], errors: [404], description: "Reads local state; does not contact the provider. Missing and unrelated payments return 404." });
add("post", "/api/v1/payments/{paymentId}/reconcile", "reconcilePayment", "Payments", "Refresh your payment from SSLCommerz", "Payment", 200, { ...patientAccess, parameters: [id("paymentId")], errors: [404, 409, 502, 503], description: "No body. Checks ownership before provider verification. Late or risky success becomes REVIEW_REQUIRED; it does not reclaim an expired appointment slot. The worker marks an unconfirmed payment EXPIRED when its hold window closes." });
for (const kind of ["ipn", "success", "fail", "cancel"] as const) {
  add("post", `/api/v1/payments/sslcommerz/${kind}`, `receivePayment${kind[0]!.toUpperCase()}${kind.slice(1)}`, "Provider callbacks", `Receive SSLCommerz ${kind} notification`, "CallbackReceived", 200, {
    body: "PaymentCallback", form: true, errors: [404, 409, 502, 503], description: "Provider integration endpoint. Public transport does not mean unverified payment: the backend queries SSLCommerz and compares the stored transaction, exact amount, and currency. Arbitrary examples cannot simulate a successful charge; use references from a real sandbox transaction. Refund execution is not implemented.",
  });
}

const errorDescriptions: Record<number, string> = {
  400: "Malformed request payload or empty content.",
  401: "Missing, invalid, expired, or reused authentication/session token.", 403: "Wrong role, inactive account, unapproved doctor, or forbidden ownership.",
  404: "Resource not found or not visible to the current user.", 409: "Business-state, availability, idempotency, or payment-verification conflict.",
  413: "Uploaded payload exceeds the maximum allowed size.",
  422: "Validation failed; fieldErrors identifies invalid inputs.", 500: "Unexpected server error; internal details are not exposed.",
  502: "Provider unavailable, ambiguous, or invalid response. An uncertain initiation may include details.paymentId.",
  503: "Sandbox payment credentials/public callback URL are not configured.",
};

export const openApiDocument: OpenAPIV3.Document = {
  openapi: "3.0.3",
  info: {
    title: "MediConnect BD API", version: "0.1.0",
    description: "Interactive documentation for implemented backend endpoints. Start with patient registration/login, copy accessToken into Authorize, then test the protected routes. Examples are synthetic; replace example IDs with actual API results. All server timestamps are UTC; scheduling input uses Asia/Dhaka. Swagger does not bypass database readiness, authorization, or sandbox provider verification.",
  },
  servers: [{ url: "/", description: "This API server (same origin as Swagger UI)" }],
  tags: ["Platform", "Health", "Authentication", "Account", "Catalog", "Doctors", "Doctor profile", "Scheduling", "Admin", "Appointments", "Payments", "Provider callbacks"].map(name => ({ name })),
  paths,
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT", description: "Paste accessToken from login/registration without the Bearer prefix. Use an account with the endpoint's required role." },
      refreshCookie: { type: "apiKey", in: "cookie", name: "mediconnect_refresh", description: "HTTP-only cookie set by login. The browser sends it automatically on this origin; do not try to paste it into Swagger's Authorize form." },
    },
    schemas: openApiSchemas,
    responses: Object.fromEntries(Object.entries(errorDescriptions).map(([code, description]) => [`Error${code}`,
      code === "422" ? { description, content: { "application/json": { schema: { anyOf: [schemaRef("ValidationError"), schemaRef("Error")] } } } }
        : jsonResponse("Error", description),
    ])),
  },
};
