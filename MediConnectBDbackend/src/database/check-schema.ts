import type { DataSource } from "typeorm";

/** Render startup only reads migration state. Schema changes are a separate operator action. */
export async function assertMigrationsApplied(database: DataSource): Promise<void> {
  const rows: { name: string }[] = await database.query("SELECT name FROM typeorm_migrations");
  const applied = new Set(rows.map(({ name }) => name));
  if (database.migrations.some((migration) => !applied.has(migration.name ?? migration.constructor.name))) {
    throw new Error("Pending database migrations");
  }
}
