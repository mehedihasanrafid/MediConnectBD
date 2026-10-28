/**
 * Seeds or refreshes an active confirmed video appointment between Demo Doctor
 * (doctor.demo@mediconnect.example) and Demo Patient (patient.demo@mediconnect.example)
 * scheduled for today starting at 1:50 PM Dhaka time.
 *
 * Safe to rerun repeatedly: updates existing slot and appointment timestamps to maintain
 * an active video session window.
 */

const path = require("node:path");
const crypto = require("node:crypto");
const mysql = require("mysql2/promise");
const { parse } = require("dotenv");
const { readFileSync } = require("node:fs");

async function main() {
  const backendDir = path.resolve(__dirname, "..");
  const envPath = path.join(backendDir, ".env");
  const env = parse(readFileSync(envPath));

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    timezone: "Z",
  });

  try {
    // 1. Locate Demo Doctor and Demo Patient profiles
    const [doctors] = await conn.query(`
      SELECT dp.id as doctor_profile_id, u.id as user_id, u.email, u.first_name, u.last_name
      FROM users u
      JOIN doctor_profiles dp ON dp.user_id = u.id
      WHERE u.email = 'doctor.demo@mediconnect.example'
      LIMIT 1;
    `);

    const [patients] = await conn.query(`
      SELECT pp.id as patient_profile_id, u.id as user_id, u.email, u.first_name, u.last_name
      FROM users u
      JOIN patient_profiles pp ON pp.user_id = u.id
      WHERE u.email = 'patient.demo@mediconnect.example'
      LIMIT 1;
    `);

    if (!doctors.length || !patients.length) {
      throw new Error(
        "Demo doctor or demo patient not found in database. Run 'npm run db:seed' first.",
      );
    }

    const doctor = doctors[0];
    const patient = patients[0];

    // Today at 1:50 PM Dhaka Time (UTC+6 -> 07:50:00 UTC)
    // End time at 4:00 PM Dhaka Time (10:00:00 UTC) for an active testing window
    const now = new Date();
    // Construct today's date in YYYY-MM-DD
    const pad = (n) => String(n).padStart(2, "0");
    const todayDhaka = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1:50 PM BST is 13:50:00 local time
    // 4:30 PM BST is 16:30:00 local time
    // In UTC (Dhaka is UTC+6):
    // 13:50 BST = 07:50 UTC
    // 16:30 BST = 10:30 UTC
    // When passing Date objects to mysql2 with timezone: 'Z', or formatting in UTC:
    const startAtDate = new Date(`${todayDhaka}T07:50:00.000Z`);
    const endAtDate = new Date(`${todayDhaka}T10:30:00.000Z`);

    const paymentRef = "MCSEEDTX_DEMO_CALL";

    // 2. Check if the demo appointment already exists
    const [existingAppts] = await conn.query(
      `SELECT id, slot_id, hold_id FROM appointments WHERE payment_reference = ? LIMIT 1;`,
      [paymentRef],
    );

    let appointmentId;

    if (existingAppts.length > 0) {
      const existing = existingAppts[0];
      appointmentId = existing.id;

      // Update slot
      await conn.query(
        `UPDATE appointment_slots
         SET start_at = ?, end_at = ?, status = 'BOOKED', updated_at = NOW()
         WHERE id = ?;`,
        [startAtDate, endAtDate, existing.slot_id],
      );

      // Update appointment
      await conn.query(
        `UPDATE appointments
         SET scheduled_start_at = ?, scheduled_end_at = ?, status = 'CONFIRMED', updated_at = NOW()
         WHERE id = ?;`,
        [startAtDate, endAtDate, existing.id],
      );

      console.log(`Updated existing demo appointment: ${appointmentId}`);
    } else {
      // Create new slot, hold, appointment, and payment
      const slotId = crypto.randomUUID();
      const holdId = crypto.randomUUID();
      appointmentId = crypto.randomUUID();
      const paymentId = crypto.randomUUID();

      await conn.query(
        `INSERT INTO appointment_slots
         (id, doctor_profile_id, schedule_id, chamber_id, start_at, end_at, mode, fee_amount, status, created_at, updated_at)
         VALUES (?, ?, NULL, NULL, ?, ?, 'VIDEO', 800.00, 'BOOKED', NOW(), NOW());`,
        [slotId, doctor.doctor_profile_id, startAtDate, endAtDate],
      );

      await conn.query(
        `INSERT INTO slot_holds
         (id, slot_id, patient_profile_id, status, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, 'CONVERTED', ?, NOW(), NOW());`,
        [holdId, slotId, patient.patient_profile_id, startAtDate],
      );

      await conn.query(
        `INSERT INTO appointments
         (id, slot_id, hold_id, patient_profile_id, doctor_profile_id, scheduled_start_at, scheduled_end_at, mode, fee_amount, status, payment_reference, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'VIDEO', 800.00, 'CONFIRMED', ?, NOW(), NOW());`,
        [
          appointmentId,
          slotId,
          holdId,
          patient.patient_profile_id,
          doctor.doctor_profile_id,
          startAtDate,
          endAtDate,
          paymentRef,
        ],
      );

      await conn.query(
        `INSERT INTO payments
         (id, appointment_id, patient_profile_id, transaction_id, idempotency_key, request_hash, amount, commission_amount, net_amount, currency, status, session_id, expires_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 800.00, 120.00, 680.00, 'BDT', 'SUCCEEDED', ?, ?, NOW(), NOW());`,
        [
          paymentId,
          appointmentId,
          patient.patient_profile_id,
          paymentRef,
          `idem_${paymentRef}`,
          "0".repeat(64),
          `session_${paymentRef}`,
          startAtDate,
        ],
      );

      console.log(`Created new demo video appointment: ${appointmentId}`);
    }

    console.log("\n=======================================================");
    console.log("DEMO VIDEO CALL APPOINTMENT READY");
    console.log("=======================================================");
    console.log(`Appointment ID : ${appointmentId}`);
    console.log(`Date & Time    : Today, 1:50 PM – 4:30 PM (Dhaka Time, BST)`);
    console.log(`Mode           : VIDEO Consultation`);
    console.log(`Status         : CONFIRMED`);
    console.log(`Doctor         : ${doctor.first_name} ${doctor.last_name} (${doctor.email})`);
    console.log(`Patient        : ${patient.first_name} ${patient.last_name} (${patient.email})`);
    console.log(`Password       : #king123 (for both accounts)`);
    console.log("=======================================================\n");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error("Failed to seed demo appointment:", err);
  process.exit(1);
});
