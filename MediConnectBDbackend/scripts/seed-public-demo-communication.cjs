/** Explicit one-off public-demo seed; refuses development and production patient databases. */
const { randomUUID } = require('node:crypto');
if (process.env.NODE_ENV !== 'production' || process.env.PUBLIC_DEMO !== 'true' ||
    process.env.DB_NAME !== 'mediconnect_demo' || process.env.DB_HOST !== 'mysql') {
  throw Error('Only the explicitly marked Docker public-demo database is permitted.');
}
const local = process.env;
async function main() {
  const source = require('../dist/database/data-source').default;
  if (source.options.port !== Number(local.DB_PORT || 3306) || source.options.database !== 'mediconnect_demo' || source.options.host !== 'mysql') throw Error('Unexpected database target');
  await source.initialize();
  try {
    const { User } = require('../dist/modules/users/user.entity');
    const { DoctorProfile } = require('../dist/modules/doctors/doctor-profile.entity');
    const { PatientProfile } = require('../dist/modules/patients/patient-profile.entity');
    const { Appointment } = require('../dist/modules/appointments/appointment.entity');
    const { AppointmentSlot } = require('../dist/modules/scheduling/appointment-slot.entity');
    const { SlotHold } = require('../dist/modules/appointments/slot-hold.entity');
    const { TypeOrmCommunicationRepository } = require('../dist/modules/communication/typeorm-communication.repository');
    const users=source.getRepository(User);
    const du=await users.findOneBy({email:'doctor.demo@mediconnect.example'});
    const pu=await users.findOneBy({email:'patient.demo@mediconnect.example'});
    if (!du || !pu) throw Error('Existing demo accounts are required; credentials are never created/reset by this seeder.');
    const doctor=await source.getRepository(DoctorProfile).findOneByOrFail({userId:du.id});
    const patient=await source.getRepository(PatientProfile).findOneByOrFail({userId:pu.id});
    const pa={userId:pu.id,userRole:'PATIENT',patientProfileId:patient.id};
    const da={userId:du.id,userRole:'DOCTOR',doctorProfileId:doctor.id};
    const now=new Date(), day=now.toISOString().slice(0,10);
    const cases=[{name:'followup',minutes:-120,days:0,status:'COMPLETED',mode:'CHAMBER'},
      {name:'expired',minutes:-120,days:9,status:'COMPLETED',mode:'CHAMBER'},
      {name:'video',minutes:-2,days:0,status:'CONFIRMED',mode:'VIDEO'}];
    const repo=new TypeOrmCommunicationRepository(source);
    for (const scenario of cases) {
      const marker=`SYNTHETIC_COMM_${day}_${scenario.name}`;
      let appt=await source.getRepository(Appointment).findOneBy({paymentReference:marker,doctorProfileId:doctor.id,patientProfileId:patient.id});
      if (!appt) appt=await source.transaction(async manager=>{
        const start=new Date(now.getTime()+scenario.minutes*60000-scenario.days*86400000);
        const end=new Date(start.getTime()+30*60000);
        const slot=await manager.save(AppointmentSlot,manager.create(AppointmentSlot,{id:randomUUID(),doctorProfileId:doctor.id,startAt:start,endAt:end,mode:scenario.mode,feeAmount:'0.00',status:'BOOKED'}));
        const hold=await manager.save(SlotHold,manager.create(SlotHold,{slotId:slot.id,patientProfileId:patient.id,status:'CONVERTED',expiresAt:end}));
        return manager.save(Appointment,manager.create(Appointment,{slotId:slot.id,holdId:hold.id,doctorProfileId:doctor.id,patientProfileId:patient.id,
          familyMemberId:null,scheduledStartAt:start,scheduledEndAt:end,mode:scenario.mode,status:scenario.status,feeAmount:'0.00',
          paymentReference:marker,completedAt:scenario.status==='COMPLETED'?end:null}));
      });
      const list=await repo.listConversations(pa,now);
      const conv=list.find(c=>c.appointmentId===appt.id);
      if (!conv) throw Error('Synthetic conversation could not be provisioned');
      const seedTime=scenario.status==='COMPLETED'?new Date(appt.completedAt.getTime()+60000):new Date(appt.scheduledStartAt.getTime()+60000);
      await repo.createMessage(conv.id,pa,{content:`[Synthetic demo: ${scenario.name}] Hello doctor, this message tests persisted consultation messaging.`,idempotencyKey:`seed-${scenario.name}-patient`},seedTime);
      await repo.createMessage(conv.id,da,{content:`[Synthetic demo: ${scenario.name}] Hello, your test message was received. This is seeded sample data, not medical advice.`,idempotencyKey:`seed-${scenario.name}-doctor`},new Date(seedTime.getTime()+1000));
      console.log(`${scenario.name}: persisted conversation ready (${conv.communicationState})`);
    }
    console.log('Synthetic communication seed complete. Existing credentials and appointments were preserved.');
  } finally { await source.destroy(); }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
