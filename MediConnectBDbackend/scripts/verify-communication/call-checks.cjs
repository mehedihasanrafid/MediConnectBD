const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { CommunicationCall } = require("../../dist/modules/communication/calls/call.entity");
module.exports = async function callChecks(service, users, reference, db, providerInputs) {
  const call = await service.start(users.doctor, reference, "AUDIO", randomUUID());
  assert.equal(call.status, "RINGING");
  await assert.rejects(service.room(users.doctor, call.id), error => error.statusCode === 409);
  await assert.rejects(service.action(users.outsider, call.id, "accept"), error => error.statusCode === 403);
  await assert.rejects(service.start(users.colleague, reference, "VIDEO", randomUUID()), error => error.code === "CALL_BUSY");
  assert.equal((await service.active(users.colleague))[0].id, call.id);
  assert.equal((await service.action(users.colleague, call.id, "accept")).status, "ACCEPTED");
  assert.equal((await service.room(users.doctor, call.id)).provider, "daily");
  assert.equal(providerInputs.at(-1).audioOnly, true);
  assert.equal((await service.action(users.doctor, call.id, "end")).status, "ENDED");
  await assert.rejects(service.room(users.colleague, call.id), error => error.statusCode === 409);
  const missed = await service.start(users.doctor, reference, "VIDEO", randomUUID());
  await db.getRepository(CommunicationCall).update(missed.id, { expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await service.active(users.doctor)).length, 0);
  assert.equal((await service.history(users.colleague, reference)).find(item => item.id === missed.id).status, "MISSED");
  const outcomes = await Promise.allSettled([
    service.start(users.doctor, reference, "VIDEO", randomUUID()),
    service.start(users.colleague, reference, "VIDEO", randomUUID()),
  ]);
  assert.equal(outcomes.filter(outcome => outcome.status === "fulfilled").length, 1);
  const active = outcomes.find(outcome => outcome.status === "fulfilled").value;
  const caller = active.caller.userId === users.doctor.id ? users.doctor : users.colleague;
  const callee = active.callee.userId === users.doctor.id ? users.doctor : users.colleague;
  assert.equal((await service.action(callee, active.id, "decline")).status, "DECLINED");
  const cancel = await service.start(caller, reference, "VIDEO", randomUUID());
  assert.equal((await service.action(caller, cancel.id, "cancel")).status, "CANCELLED");
};
