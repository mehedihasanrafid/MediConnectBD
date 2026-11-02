const path = require("node:path");
const mysql = require("/home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend/node_modules/mysql2/promise");
const { parse } = require("/home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend/node_modules/dotenv");
const { readFileSync } = require("node:fs");

async function main() {
  const backendDir = "/home/mehedi/Desktop/MediConnectBD/MediConnectBDbackend";
  const env = parse(readFileSync(path.join(backendDir, ".env")));

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    timezone: "Z",
  });

  const now = new Date();
  const start = new Date(now.getTime() - 2 * 60 * 1000);
  const end = new Date(now.getTime() + 30 * 60 * 1000);

  const [res] = await conn.query(`
    UPDATE appointments 
    SET status = 'CONFIRMED',
        scheduled_start_at = ?,
        scheduled_end_at = ?
    WHERE id = '1bfc64d7-41dd-4b64-9672-a8190d0be1bb';
  `, [start, end]);

  console.log("Updated appointment to CONFIRMED:", res.affectedRows);
  await conn.end();
}

main().catch(console.error);
