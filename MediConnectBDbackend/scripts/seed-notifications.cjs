/**
 * Seeds rich, role-tailored notifications for Demo Patient, Demo Doctor, and Demo Admin.
 */
const mysql = require("mysql2/promise");
const crypto = require("crypto");

async function seedNotifications() {
  const connection = await mysql.createConnection({
    host: "127.0.0.1",
    port: 3306,
    user: "mediconnect_app",
    password: "#King123",
    database: "mediconnect",
  });

  console.log("Connected to MySQL. Fetching user IDs...");
  const [users] = await connection.execute(
    "SELECT id, email, first_name, last_name FROM users WHERE email IN ('patient.demo@mediconnect.example', 'doctor.demo@mediconnect.example', 'admin.demo@mediconnect.example')"
  );

  const userMap = {};
  users.forEach((u) => {
    userMap[u.email] = u.id;
  });

  const patientId = userMap["patient.demo@mediconnect.example"];
  const doctorId = userMap["doctor.demo@mediconnect.example"];
  const adminId = userMap["admin.demo@mediconnect.example"];

  if (!patientId || !doctorId || !adminId) {
    console.error("Missing demo users in database!", userMap);
    process.exit(1);
  }

  // Clear existing notifications
  await connection.execute("DELETE FROM in_app_notifications");

  const now = new Date();
  const subMinutes = (m) => new Date(now.getTime() - m * 60 * 1000);
  const subHours = (h) => new Date(now.getTime() - h * 60 * 60 * 1000);
  const subDays = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const notifications = [
    // PATIENT NOTIFICATIONS
    {
      id: crypto.randomUUID(),
      userId: patientId,
      role: "PATIENT",
      type: "PRESCRIPTION",
      title: "New E-Prescription Issued",
      message: "Dr. Anisur Rahman issued digital prescription for your respiratory follow-up.",
      details: "Tab Napa Extra (500mg/65mg) 1+0+1 for 5 days. Tab Montair 10mg 0+0+1. Verification Code: MC-RX-8842-DHAKA.",
      priority: "info",
      isRead: false,
      readAt: null,
      actionUrl: "/prescriptions",
      actionLabel: "View Prescription",
      secondaryActionUrl: "/verify-prescription?code=MCRX8842DHAKA",
      secondaryActionLabel: "Verify Code",
      metadata: JSON.stringify({ rxId: "rx-demo-1" }),
      createdAt: subMinutes(15),
    },
    {
      id: crypto.randomUUID(),
      userId: patientId,
      role: "PATIENT",
      type: "APPOINTMENT",
      title: "Upcoming Telehealth Consultation",
      message: "Your video consultation with Dr. Anisur Rahman is confirmed for today at 4:30 PM.",
      details: "Waiting room opens 10 minutes prior. Please test your camera and microphone beforehand.",
      priority: "urgent",
      isRead: false,
      readAt: null,
      actionUrl: "/communication",
      actionLabel: "Join Video Hub",
      secondaryActionUrl: "/appointments",
      secondaryActionLabel: "Appointment Details",
      metadata: JSON.stringify({ appointmentId: "apt-demo-1" }),
      createdAt: subHours(2),
    },
    {
      id: crypto.randomUUID(),
      userId: patientId,
      role: "PATIENT",
      type: "PAYMENT",
      title: "bKash Payment Succeeded",
      message: "৳800.00 consultation fee paid successfully (Transaction: TR-BKASH-77192).",
      details: "Appointment slot locked and confirmed. E-receipt generated.",
      priority: "success",
      isRead: true,
      readAt: subHours(3),
      actionUrl: "/appointments",
      actionLabel: "View Receipt",
      secondaryActionUrl: null,
      secondaryActionLabel: null,
      metadata: JSON.stringify({ paymentId: "pay-demo-1" }),
      createdAt: subHours(4),
    },
    {
      id: crypto.randomUUID(),
      userId: patientId,
      role: "PATIENT",
      type: "COMMUNICATION",
      title: "Doctor Sent Clinical Message",
      message: "Dr. Anisur Rahman replied regarding your latest blood report.",
      details: "Everything looks within normal limits. Keep staying well hydrated during fasting.",
      priority: "info",
      isRead: true,
      readAt: subDays(1),
      actionUrl: "/communication",
      actionLabel: "Open Chat",
      secondaryActionUrl: null,
      secondaryActionLabel: null,
      metadata: JSON.stringify({ threadId: "chat-demo-1" }),
      createdAt: subDays(1),
    },

    // DOCTOR NOTIFICATIONS
    {
      id: crypto.randomUUID(),
      userId: doctorId,
      role: "DOCTOR",
      type: "APPOINTMENT",
      title: "New Video Appointment Confirmed",
      message: "Demo Patient booked a 20-min Telehealth consultation for today at 4:30 PM.",
      details: "Chief Complaint: Seasonal respiratory allergies and mild cough for 3 days.",
      priority: "urgent",
      isRead: false,
      readAt: null,
      actionUrl: "/doctor/appointments",
      actionLabel: "View Schedule",
      secondaryActionUrl: "/communication",
      secondaryActionLabel: "Communication Hub",
      metadata: JSON.stringify({ appointmentId: "apt-demo-1" }),
      createdAt: subMinutes(25),
    },
    {
      id: crypto.randomUUID(),
      userId: doctorId,
      role: "DOCTOR",
      type: "CALL",
      title: "Telehealth Room Active",
      message: "Daily.co video room `mediconnectbd/telehealth-call-demo` is provisioned.",
      details: "HD audio/video enabled with screen share and instant prescription writing dock.",
      priority: "info",
      isRead: false,
      readAt: null,
      actionUrl: "/communication",
      actionLabel: "Launch Telehealth",
      secondaryActionUrl: null,
      secondaryActionLabel: null,
      metadata: JSON.stringify({ callUrl: "https://mediconnectbd.daily.co/telehealth-call-demo" }),
      createdAt: subHours(1),
    },
    {
      id: crypto.randomUUID(),
      userId: doctorId,
      role: "DOCTOR",
      type: "PAYMENT",
      title: "Consultation Fee Credited",
      message: "Net ৳680.00 credited to your doctor wallet for completed video session #MC-3310.",
      details: "Platform commission 15% (৳120.00) deducted per verified billing standards.",
      priority: "success",
      isRead: true,
      readAt: subDays(1),
      actionUrl: "/doctor/dashboard",
      actionLabel: "View Financials",
      secondaryActionUrl: null,
      secondaryActionLabel: null,
      metadata: JSON.stringify({ amount: 680 }),
      createdAt: subDays(1),
    },

    // ADMIN NOTIFICATIONS
    {
      id: crypto.randomUUID(),
      userId: adminId,
      role: "ADMIN",
      type: "SYSTEM",
      title: "Doctor Credential Verification Pending",
      message: "Dr. Farhana Rahman submitted BMDC license #A-89412 for platform verification.",
      details: "Pediatrics & Neonatology, Dhaka Medical College. MBBS certificate attached.",
      priority: "warning",
      isRead: false,
      readAt: null,
      actionUrl: "/admin/applications",
      actionLabel: "Review Application",
      secondaryActionUrl: null,
      secondaryActionLabel: null,
      metadata: JSON.stringify({ doctorId: "doc-farhana-1" }),
      createdAt: subMinutes(40),
    },
    {
      id: crypto.randomUUID(),
      userId: adminId,
      role: "ADMIN",
      type: "PAYMENT",
      title: "Daily SSLCommerz Reconciliation Completed",
      message: "Total volume ৳34,500 across 42 appointments. 0 unresolved dispute flags.",
      details: "All sandbox transaction signatures matched provider IPN responses.",
      priority: "success",
      isRead: true,
      readAt: subHours(5),
      actionUrl: "/admin/payments",
      actionLabel: "Audit Log",
      secondaryActionUrl: null,
      secondaryActionLabel: null,
      metadata: JSON.stringify({ volume: 34500 }),
      createdAt: subHours(6),
    },
  ];

  for (const n of notifications) {
    await connection.execute(
      `INSERT INTO in_app_notifications 
       (id, user_id, role, type, title, message, details, priority, is_read, read_at, action_url, action_label, secondary_action_url, secondary_action_label, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        n.id,
        n.userId,
        n.role,
        n.type,
        n.title,
        n.message,
        n.details,
        n.priority,
        n.isRead ? 1 : 0,
        n.readAt,
        n.actionUrl,
        n.actionLabel,
        n.secondaryActionUrl,
        n.secondaryActionLabel,
        n.metadata,
        n.createdAt,
      ]
    );
  }

  console.log(`Successfully seeded ${notifications.length} in-app notifications into MySQL.`);
  await connection.end();
}

seedNotifications().catch((err) => {
  console.error("Failed to seed notifications:", err);
  process.exit(1);
});
