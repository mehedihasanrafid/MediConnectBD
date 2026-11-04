/** Synthetic appointments only; never resets existing seeded appointments or account credentials. */
const { randomUUID } = require('node:crypto');
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' });

function dashboardPlan(now = new Date()) {
  const day = dayFormat.format(now);
  const base = Math.floor(now.getTime() / 60000) * 60000;
  const cases = [
    ['completed-1', -120, 20, 'COMPLETED', 'CHAMBER', null],
    ['completed-2', -90, 20, 'COMPLETED', 'CHAMBER', null],
    ['completed-3', -60, 20, 'COMPLETED', 'CHAMBER', null],
    ['video-now', -1, 45, 'CONFIRMED', 'VIDEO', null],
    ['chamber-next', 60, 20, 'CONFIRMED', 'CHAMBER', null],
    ['family-video', 90, 20, 'CONFIRMED', 'VIDEO', 'child'],
    ['chamber-later', 120, 20, 'CONFIRMED', 'CHAMBER', null],
    ['family-chamber', 150, 20, 'CONFIRMED', 'CHAMBER', 'parent'],
  ];
  const items = cases.map(([name, offset, duration, status, mode, family]) => {
    const start = new Date(base + offset * 60000), end = new Date(base + (offset + duration) * 60000);
    if (dayFormat.format(start) !== day || dayFormat.format(end) !== day) {
      throw Error('Run this eight-appointment demo between 02:00 and 21:00 Asia/Dhaka to keep all visits on the same day.');
    }
    return { name, start, end, status, mode, family, marker: `SYNTHETIC_DASH_${day}_${name}` };
  });
  return { day, items };
}

async function seedDashboardData(manager, doctor, patient, plan) {
  const { FamilyMember } = require('../dist/modules/patients/family-member.entity');
  const { Appointment } = require('../dist/modules/appointments/appointment.entity');
  const { AppointmentSlot } = require('../dist/modules/scheduling/appointment-slot.entity');
  const { SlotHold } = require('../dist/modules/appointments/slot-hold.entity');
  const { MedicalReport } = require('../dist/modules/patients/medical-report.entity');
  await manager.query('SELECT id FROM doctor_profiles WHERE id = ? FOR UPDATE', [doctor.id]);
  const families = {};
  for (const [key, name, relationship] of [
    ['child', '[Synthetic demo] Demo Child', 'Child'],
    ['parent', '[Synthetic demo] Demo Parent', 'Parent'],
  ]) {
    families[key] = await manager.findOneBy(FamilyMember, { patientProfileId: patient.id, name }) ||
      await manager.save(FamilyMember, manager.create(FamilyMember, { patientProfileId: patient.id, name, relationship }));
  }
  const appointments = [];
  let created = 0;
  for (const item of plan.items) {
    let appointment = await manager.findOneBy(Appointment, {
      paymentReference: item.marker, doctorProfileId: doctor.id, patientProfileId: patient.id,
    });
    if (!appointment) {
      const overlap = await manager.query(`SELECT id FROM appointments
        WHERE (doctor_profile_id = ? OR patient_profile_id = ?) AND status IN ('CONFIRMED','PENDING_PAYMENT')
        AND scheduled_start_at < ? AND scheduled_end_at > ? LIMIT 1`, [doctor.id, patient.id, item.end, item.start]);
      if (overlap.length) throw Error(`Existing active booking overlaps ${item.name}; no existing records were changed.`);
      const slot = await manager.save(AppointmentSlot, manager.create(AppointmentSlot, {
        id: randomUUID(), doctorProfileId: doctor.id, startAt: item.start, endAt: item.end,
        mode: item.mode, feeAmount: '0.00', status: 'BOOKED', scheduleId: null, chamberId: null,
      }));
      const hold = await manager.save(SlotHold, manager.create(SlotHold, {
        slotId: slot.id, patientProfileId: patient.id, status: 'CONVERTED', expiresAt: item.end,
      }));
      appointment = await manager.save(Appointment, manager.create(Appointment, {
        slotId: slot.id, holdId: hold.id, doctorProfileId: doctor.id, patientProfileId: patient.id,
        familyMemberId: item.family ? families[item.family].id : null,
        scheduledStartAt: item.start, scheduledEndAt: item.end, mode: item.mode, status: item.status,
        feeAmount: '0.00', paymentReference: item.marker, completedAt: item.status === 'COMPLETED' ? item.end : null,
        reminder24hSent: true, reminder30minSent: true,
      }));
      created++;
    }
    appointments.push(appointment);
  }
  const title = '[Synthetic demo] Dashboard sample report';
  if (!await manager.findOneBy(MedicalReport, { patientProfileId: patient.id, title })) {
    const content = Buffer.from('SYNTHETIC DEMO FILE\nFor testing report display and download only.\nNo patient medical information, diagnosis, medication or advice is included.\n');
    await manager.save(MedicalReport, manager.create(MedicalReport, {
      patientProfileId: patient.id, title, fileName: 'synthetic-dashboard-report.txt', mimeType: 'text/plain',
      sizeBytes: content.length, contentBase64: content.toString('base64'), notes: 'Synthetic demo data. Not a medical report.',
    }));
  }
  return { appointments, created, reused: appointments.length - created };
}
module.exports = { dashboardPlan, seedDashboardData };
