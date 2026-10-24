/**
 * One-time Linux development setup for the installed system MySQL server.
 * Reads credentials from private .env; never prints or passes passwords in arguments.
 * Creates the database if needed and aligns the dedicated application's local password with .env.
 * Existing database contents are preserved.
 * Run from your own terminal so sudo can ask for your computer login password.
 */
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const mysql = require("mysql2/promise");
const { parse } = require("dotenv");
const { readFileSync } = require("node:fs");

async function main() {
  const config = parse(readFileSync(path.join(__dirname, "../.env")));
  if (config.NODE_ENV !== "development" || config.DB_HOST !== "127.0.0.1" || Number(config.DB_PORT) !== 3306) {
    throw new Error("This setup is only for development with system MySQL at 127.0.0.1:3306.");
  }
  if (!/^[a-zA-Z0-9_]+$/.test(config.DB_NAME || "") || !/^[a-zA-Z0-9_]+$/.test(config.DB_USER || "") || config.DB_USER === "root" || !config.DB_PASSWORD) {
    throw new Error("Set a dedicated DB_NAME, non-root DB_USER, and DB_PASSWORD in .env first.");
  }

  // Authenticate separately: SQL goes through stdin, while sudo reads its password from the terminal.
  const auth = spawnSync("sudo", ["-v"], { stdio: "inherit" });
  if (auth.error || auth.status !== 0) throw new Error("Sudo approval was not completed. Run this command in your terminal.");

  const database = mysql.escapeId(config.DB_NAME);
  const sql = [`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`];
  for (const host of ["127.0.0.1", "localhost"]) {
    const account = `${mysql.escape(config.DB_USER)}@${mysql.escape(host)}`;
    sql.push(`CREATE USER IF NOT EXISTS ${account} IDENTIFIED BY ${mysql.escape(config.DB_PASSWORD)};`);
    // This dedicated local development account must match this project's private .env.
    sql.push(`ALTER USER ${account} IDENTIFIED BY ${mysql.escape(config.DB_PASSWORD)};`);
    sql.push(`GRANT ALL PRIVILEGES ON ${database}.* TO ${account};`);
  }
  const setup = spawnSync("sudo", ["-n", "mysql", "--protocol=socket", "--batch"], {
    input: sql.join("\n"), encoding: "utf8", stdio: ["pipe", "pipe", "pipe"],
  });
  // MySQL can echo a failing statement. Mask both the configured password and credential clauses.
  const safeError = `${setup.stderr || ""}\n${setup.stdout || ""}`
    .replaceAll(config.DB_PASSWORD, "[hidden]")
    .replace(/IDENTIFIED BY\s+'[^']*'/gi, "IDENTIFIED BY '[hidden]'")
    .trim();
  if (setup.error || setup.status !== 0) {
    if (/ERROR 1819\b/.test(safeError)) {
      throw new Error("MySQL rejected DB_PASSWORD under its password policy. Update private .env with a longer password containing uppercase and lowercase letters, a number, and a symbol, then rerun setup.");
    }
    const details = safeError ? ` MySQL: ${safeError.slice(-1200)}` : "";
    throw new Error(`Database setup failed. Check sudo MySQL access.${details} No existing database was dropped.`);
  }

  let connection;
  try {
    connection = await mysql.createConnection({
      host: config.DB_HOST, port: Number(config.DB_PORT), database: config.DB_NAME,
      user: config.DB_USER, password: config.DB_PASSWORD,
    });
    await connection.query("SELECT 1");
  } catch {
    throw new Error("The configured account could not connect after setup. Check that MySQL is listening on the configured port.");
  } finally {
    if (connection) await connection.end();
  }
  console.log("Local database is ready. Run these commands next, one at a time:\n\nnpm run db:migrate\nnpm run db:seed\nnpm run dev");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
