/* Run only against the disposable MySQL instance initialized in /tmp. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
if (process.env.DB_NAME !== 'mediconnect_communication_integration' || process.env.DB_PORT !== '33319') throw Error('Disposable DB guard failed');
async function main() {
  const mysql = require('mysql2/promise');
  const admin = await mysql.createConnection({ host:'127.0.0.1',port:33319,user:'root',password:'' });
  await admin.query('CREATE DATABASE IF NOT EXISTS mediconnect_communication_integration'); await admin.query("CREATE USER IF NOT EXISTS 'communication_test'@'localhost' IDENTIFIED BY 'integration-only-password'"); await admin.query("GRANT ALL ON mediconnect_communication_integration.* TO 'communication_test'@'localhost'"); await admin.end();
  const source = require('../dist/database/data-source').default;
  await source.initialize();
  const migrations = await source.runMigrations(); console.log('Migrations applied:', migrations.length);
  const { User } = require('../dist/modules/users/user.entity');
  const { PatientProfile } = require('../dist/modules/patients/patient-profile.entity');
  const { DoctorProfile } = require('../dist/modules/doctors/doctor-profile.entity');
  const { Appointment } = require('../dist/modules/appointments/appointment.entity');
  const { AppointmentSlot } = require('../dist/modules/scheduling/appointment-slot.entity');
  const { SlotHold } = require('../dist/modules/appointments/slot-hold.entity');
  const { TypeOrmCommunicationRepository } = require('../dist/modules/communication/typeorm-communication.repository');
  const { FamilyMember } = require('../dist/modules/patients/family-member.entity');
  const save = (type,input) => source.getRepository(type).save(source.getRepository(type).create(input));
  const now=new Date();
  const user = async name => save(User,{email:`${randomUUID()}@integration.invalid`, passwordHash:await require('bcryptjs').hash('Synthetic-only-123!',4),firstName:name,lastName:'Integration',status:'ACTIVE'});
  const du=await user('Doctor'), pu=await user('Patient'), ou=await user('Unrelated');
  const doc=await save(DoctorProfile,{userId:du.id,bmdcNumber:randomUUID(),applicationStatus:'APPROVED'});
  const patient=await save(PatientProfile,{userId:pu.id}), other=await save(PatientProfile,{userId:ou.id});
  // Real auth service loads roles from the user_roles relation.
  for (const [u,role] of [[du,'DOCTOR'],[pu,'PATIENT'],[ou,'PATIENT']]) {
    await source.query('INSERT IGNORE INTO roles(id,name) VALUES (?,?)',[role.toLowerCase(),role]);
    const [found] = await source.query('SELECT id FROM roles WHERE name=?',[role]);
    await source.query('INSERT INTO user_roles(user_id,role_id) VALUES (?,?)',[u.id,found.id]);
  }
  let offset=0;
  async function appointment(status='COMPLETED',days=0,beneficiary=null) {
    const start=new Date(now-3600000-days*86400000-(offset++)*60000), end=new Date(start.getTime()+1800000);
    const slot=await save(AppointmentSlot,{doctorProfileId:doc.id,startAt:start,endAt:end,mode:'VIDEO',feeAmount:'800.00',status:'BOOKED'});
    const hold=await save(SlotHold,{slotId:slot.id,patientProfileId:patient.id,status:'CONVERTED',expiresAt:end});
    return save(Appointment,{slotId:slot.id,holdId:hold.id,patientProfileId:patient.id,doctorProfileId:doc.id,familyMemberId:beneficiary,scheduledStartAt:start,scheduledEndAt:end,mode:'VIDEO',feeAmount:'800.00',status,completedAt:status==='COMPLETED'?end:null});
  }
  const appt=await appointment(); const old=await appointment('COMPLETED',9);
  for (const status of ['CANCELLED','NO_SHOW','PENDING_PAYMENT','PAYMENT_EXPIRED']) await appointment(status);
  const repo=new TypeOrmCommunicationRepository(source);
  const pa={userId:pu.id,userRole:'PATIENT',patientProfileId:patient.id};
  const da={userId:du.id,userRole:'DOCTOR',doctorProfileId:doc.id};
  const list=await repo.listConversations(pa,now); assert.equal(list.length,2);
  const conv=list.find(c=>c.appointmentId===appt.id); const expired=list.find(c=>c.appointmentId===old.id);
  assert(conv.canSend); assert.equal(expired.canSend,false);
  await Promise.all([repo.listConversations(pa,now),repo.listConversations(da,now)]);
  assert.equal((await repo.listConversations(pa,now)).length,2);
  const key=randomUUID();
  const sends=await Promise.all([repo.createMessage(conv.id,pa,{content:'Patient persisted',idempotencyKey:key},now),repo.createMessage(conv.id,pa,{content:'Patient persisted',idempotencyKey:key},now)]);
  assert.equal(sends[0].message.id,sends[1].message.id);
  await repo.createMessage(conv.id,da,{content:'Doctor persisted',idempotencyKey:key},now);
  assert.equal((await repo.listMessages(conv.id,pa,{limit:30})).items.length,2);
  const page=await repo.listMessages(conv.id,pa,{limit:1}); assert(page.nextCursor);
  assert.equal((await repo.listMessages(conv.id,pa,{limit:1,before:page.nextCursor})).items.length,1);
  await assert.rejects(repo.getConversationById(conv.id,{...pa,userId:ou.id},now));
  await assert.rejects(repo.createMessage(expired.id,pa,{content:'Denied'},now));
  await source.getRepository(Appointment).update(old.id,{updatedAt:now});
  assert.equal((await repo.getConversationById(expired.id,pa,now)).canSend,false);
  await assert.rejects(source.getRepository(Appointment).delete(appt.id));
  const family=await save(FamilyMember,{patientProfileId:other.id,name:'Other family',relationship:'Parent'});
  await appointment('COMPLETED',0,family.id);
  assert.equal((await repo.listConversations(pa,now)).length,2);
  // A previously eligible appointment that is cancelled becomes read-only, retaining history.
  await source.getRepository(Appointment).update(appt.id,{status:'CANCELLED'});
  await assert.rejects(repo.createMessage(conv.id,pa,{content:'Denied after cancellation'},now));
  assert.equal((await repo.listMessages(conv.id,pa,{limit:30})).items.length,2);
  await source.getRepository(Appointment).update(appt.id,{status:'COMPLETED'});
  const ownFamily=await save(FamilyMember,{patientProfileId:patient.id,name:'Own family',relationship:'Child'});
  const familyAppt=await appointment('COMPLETED',0,ownFamily.id);
  const repeat=await appointment();
  await Promise.all([repo.listConversations(pa,now),repo.listConversations(da,now)]);
  const repeated=await repo.listConversations(pa,now);
  assert.equal(repeated.length,4);
  assert.notEqual(repeated.find(c=>c.appointmentId===repeat.id).id,conv.id);
  assert.equal(repeated.find(c=>c.appointmentId===familyAppt.id).beneficiary.id,ownFamily.id);
  const completion=await appointment('CONFIRMED');
  const { TypeOrmAppointmentRepository }=require('../dist/modules/appointments/typeorm-appointment.repository');
  await new TypeOrmAppointmentRepository(source).transitionAppointmentStatus({appointmentId:completion.id,doctorProfileId:doc.id,targetStatus:'COMPLETED',now});
  assert.equal((await source.getRepository(Appointment).findOneByOrFail({id:completion.id})).completedAt.getTime(),now.getTime());
  const credentials={doctor:du.email,patient:pu.email,other:ou.email,conversationId:conv.id,expiredId:expired.id};
  require('node:fs').writeFileSync('/tmp/mediconnect-communication-fixtures.json',JSON.stringify(credentials),{mode:0o600});
  await source.destroy(); console.log('Real MySQL regression checks passed: persistence, authorization, expiry, retention, family scope, pagination, concurrency');
}
main().catch(e=>{console.error(e.message);process.exit(1);});
