// Disposable MySQL on a private /tmp socket. Never connects to the project database.
const { mkdtemp, mkdir, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");
const mysql = require("mysql2/promise");
const { DataSource } = require("typeorm");
async function main() {
  const directory = await mkdtemp(path.join(tmpdir(), "mediconnect-comm-mysql-"));
  const data = path.join(directory, "data"), socket = path.join(directory, "mysql.sock");
  let server, connection, source;
  try {
    await mkdir(data);
    execFileSync("/usr/sbin/mysqld", ["--no-defaults", "--initialize-insecure", "--datadir=" + data,
      "--log-error=" + directory + "/initialize.log", "--innodb-buffer-pool-size=32M"], { timeout: 60000, stdio: "pipe" });
    server = spawn("/usr/sbin/mysqld", ["--no-defaults", "--datadir=" + data, "--socket=" + socket,
      "--pid-file=" + directory + "/mysql.pid", "--log-error=" + directory + "/server.log", "--skip-networking",
      "--mysqlx=0", "--innodb-buffer-pool-size=32M", "--innodb-redo-log-capacity=16M"], { stdio: "ignore" });
    for (let attempt = 0; attempt < 120; attempt++) {
      try { connection = await mysql.createConnection({ socketPath: socket, user: "root", password: "" }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    if (!connection) throw Error("Disposable MySQL did not start; inspect " + directory + "/server.log");
    await connection.query("CREATE DATABASE communication_verification CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    const original = require("../dist/database/data-source").default;
    source = new DataSource({ ...original.options, host: "localhost", username: "root", password: "", database: "communication_verification",
      extra: { socketPath: socket }, logging: false });
    await source.initialize(); await source.runMigrations();
    const users = await require("./verify-communication/fixture.cjs")(source);
    const { DirectStore } = require("../dist/modules/communication/direct/direct.store");
    const { CallStore } = require("../dist/modules/communication/calls/call.store");
    const { CallService } = require("../dist/modules/communication/calls/call.service");
    const { CallAccess } = require("../dist/modules/communication/calls/call.access");
    const { CommunicationService } = require("../dist/modules/communication/communication.service");
    const { TypeOrmCommunicationRepository } = require("../dist/modules/communication/typeorm-communication.repository");
    const store = new DirectStore(source), consultations = new CommunicationService(new TypeOrmCommunicationRepository(source));
    const { reference } = await require("./verify-communication/direct-checks.cjs")(store, users);
    const providerInputs = [], provider = { createSession: async input => { providerInputs.push(input); return {
      roomName: input.roomName, roomUrl: "https://synthetic.daily.co/test", accessToken: "synthetic-test-only", provider: "daily" }; } };
    const calls = new CallService(new CallStore(source), new CallAccess(consultations, store), provider);
    await require("./verify-communication/call-checks.cjs")(calls, users, reference, source, providerInputs);
    process.stdout.write("PASS: real MySQL persistence, unread counts, pagination, ownership, support/staff, idempotency, call transitions and concurrent busy locks.\n");
  } finally {
    if (source?.isInitialized) await source.destroy();
    if (connection) { try { await connection.query("SHUTDOWN"); } catch {} await connection.end(); }
    if (server && server.exitCode === null) {
      await Promise.race([new Promise(resolve => server.once("exit", resolve)), new Promise(resolve => setTimeout(resolve, 5000))]);
      if (server.exitCode === null) server.kill("SIGTERM");
    }
    if (/^mediconnect-comm-mysql-[A-Za-z0-9]+$/.test(path.basename(directory))) await rm(directory, { recursive: true, force: true });
  }
}
main().catch(error => { process.stderr.write((error.stack || error.message) + "\n"); process.exitCode = 1; });
