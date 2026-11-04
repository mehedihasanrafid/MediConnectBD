/** Local-development-only, repeatable dashboard fixtures for the existing two demo accounts. */
const fs = require('node:fs');
const path = require('node:path');
const { dashboardPlan, seedDashboardData } = require('./dashboard-demo-data.cjs');

function localTarget() {
  const local = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env')));
  if (local.NODE_ENV !== 'development' || !['localhost', '127.0.0.1'].includes(local.DB_HOST) ||
    local.DB_NAME !== 'mediconnect' || Number(local.DB_PORT || 3306) !== 3306) {
    throw Error('Only localhost:3306 mediconnect with NODE_ENV=development is allowed.');
  }
  for (const key of ['NODE_ENV', 'DB_HOST', 'DB_PORT', 'DB_NAME']) {
    if (process.env[key] && process.env[key] !== (local[key] || (key === 'DB_PORT' ? '3306' : ''))) {
      throw Error(`Environment override rejected: ${key}`);
    }
  }
  return local;
}

async function main() {
  const local = localTarget();
  const plan = dashboardPlan();
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'dry-run', day: plan.day, target: 'localhost:3306/mediconnect',
      appointments: plan.items.map((item) => ({ name: item.name, status: item.status, mode: item.mode,
        time: item.start.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka' }) })) }, null, 2));
    return;
  }
  const source = require('../dist/database/data-source').default;
  if (source.options.host !== local.DB_HOST || source.options.port !== 3306 || source.options.database !== 'mediconnect') {
    throw Error('Compiled database configuration does not match the approved local target.');
  }
  await source.initialize();
  try {
    const { User } = require('../dist/modules/users/user.entity');
    const { DoctorProfile } = require('../dist/modules/doctors/doctor-profile.entity');
    const { PatientProfile } = require('../dist/modules/patients/patient-profile.entity');
    const doctorUser = await source.getRepository(User).findOneBy({ email: 'doctor.demo@mediconnect.example' });
    const patientUser = await source.getRepository(User).findOneBy({ email: 'patient.demo@mediconnect.example' });
    if (!doctorUser || !patientUser || doctorUser.status !== 'ACTIVE' || patientUser.status !== 'ACTIVE') {
      throw Error('Existing active demo accounts are required. Account credentials are never created or reset.');
    }
    const doctor = await source.getRepository(DoctorProfile).findOneByOrFail({ userId: doctorUser.id });
    const patient = await source.getRepository(PatientProfile).findOneByOrFail({ userId: patientUser.id });
    if (doctor.applicationStatus !== 'APPROVED') throw Error('The demo doctor must already be approved.');
    const result = await source.transaction((manager) => seedDashboardData(manager, doctor, patient, plan));
    const { TypeOrmCommunicationRepository } = require('../dist/modules/communication/typeorm-communication.repository');
    const repository = new TypeOrmCommunicationRepository(source);
    const pa = { userId: patientUser.id, userRole: 'PATIENT', patientProfileId: patient.id };
    const da = { userId: doctorUser.id, userRole: 'DOCTOR', doctorProfileId: doctor.id };
    const conversations = await repository.listConversations(pa, new Date());
    const currentVideo = result.appointments.find((a) => a.paymentReference.endsWith('_video-now'));
    const thread = conversations.find((c) => c.appointmentId === currentVideo.id);
    if (thread) {
      // Replays remain idempotent even after the live demo's original messaging window expires.
      const time = new Date(currentVideo.scheduledStartAt.getTime() + 1000);
      await repository.createMessage(thread.id, pa, {
        content: '[Synthetic dashboard demo] Hello doctor. This is a sample message for testing the conversation panel.',
        idempotencyKey: `dashboard-${plan.day}-patient`,
      }, time);
      await repository.createMessage(thread.id, da, {
        content: '[Synthetic dashboard demo] Sample reply. This conversation contains no medical advice.',
        idempotencyKey: `dashboard-${plan.day}-doctor`,
      }, new Date(time.getTime() + 1000));
    }
    const { Appointment } = require('../dist/modules/appointments/appointment.entity');
    const stored = await source.getRepository(Appointment).findBy({ doctorProfileId: doctor.id, patientProfileId: patient.id });
    const seeded = stored.filter((a) => a.paymentReference?.startsWith(`SYNTHETIC_DASH_${plan.day}_`));
    console.log(JSON.stringify({ day: plan.day, created: result.created, reused: result.reused,
      appointments: seeded.length, completed: seeded.filter((a) => a.status === 'COMPLETED').length,
      remaining: seeded.filter((a) => a.status === 'CONFIRMED' || a.status === 'PENDING_PAYMENT').length,
      sampleReport: 'synthetic-dashboard-report.txt', syntheticMessageExchange: Boolean(thread),
      paymentRowsCreated: 0, accountCredentialsChanged: false }, null, 2));
  } finally { await source.destroy(); }
}
if (require.main === module) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
module.exports = { localTarget };
