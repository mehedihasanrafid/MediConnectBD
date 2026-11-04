const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { DirectMessages } = require("../../dist/modules/communication/direct/direct.messages");
module.exports = async function directChecks(store, users) {
  const messages = new DirectMessages(store);
  const thread = await store.create(users.doctor, "COLLEAGUE", users.colleague.id), id = thread.id.slice(7);
  assert.equal((await store.create(users.colleague, "COLLEAGUE", users.doctor.id)).id, thread.id);
  await assert.rejects(store.get(id, users.admin), error => error.statusCode === 403);
  await assert.rejects(store.create(users.patient, "COLLEAGUE", users.doctor.id), error => error.statusCode === 403);
  await assert.rejects(store.contacts(users.patient, "COLLEAGUE"), error => error.statusCode === 403);
  const key = randomUUID();
  const sent = await Promise.all(Array.from({ length: 4 }, () => messages.send(id, users.doctor, {
    content: "Synthetic colleague message", idempotencyKey: key,
  })));
  assert.equal(new Set(sent.map(result => result.message.id)).size, 1);
  assert.equal(sent.filter(result => !result.replay).length, 1);
  const inbox = await store.list(users.colleague);
  assert.equal(inbox[0].unreadCount, 1);
  assert.equal(inbox[0].lastMessage.content, "Synthetic colleague message");
  assert.equal((await messages.list(id, users.colleague, { limit: 30 })).items.length, 1);
  assert.equal((await store.list(users.colleague))[0].unreadCount, 0);
  for (let n = 0; n < 4; n++) await messages.send(id, users.doctor, { content: "Synthetic pagination " + n, idempotencyKey: randomUUID() });
  const newest = await messages.list(id, users.colleague, { limit: 2 });
  assert.equal(newest.hasMore, true);
  const older = await messages.list(id, users.colleague, { limit: 10, before: newest.nextCursor });
  assert.equal(older.items.length, 3);
  assert.equal(new Set([...newest.items, ...older.items].map(message => message.id)).size, 5);
  await assert.rejects(messages.send(id, users.admin, { content: "Denied" }), error => error.statusCode === 403);
  const support = await store.create(users.patient, "SUPPORT");
  assert.equal(support.participant.role, "ADMIN");
  const supportActor = [users.admin, users.staff].find(user => user.id === support.participant.userId);
  await messages.send(support.id.slice(7), users.patient, { content: "Synthetic support request", idempotencyKey: randomUUID() });
  assert((await store.list(supportActor)).some(conversation => conversation.id === support.id));
  await assert.rejects(store.get(support.id.slice(7), users.doctor), error => error.statusCode === 403);
  assert.equal((await store.create(users.admin, "STAFF", users.staff.id)).participant.role, "ADMIN");
  assert.equal((await store.contacts(users.doctor, "COLLEAGUE")).length, 2);
  return { reference: thread.id, support: support.id };
};
