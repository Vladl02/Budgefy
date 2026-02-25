import { createClient } from "@libsql/client";
import "dotenv/config";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { reset } from "drizzle-seed";
import * as schema from "./schema";
import { seedAppData } from "./seed-data";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./users_13.db";

async function main() {
  const client = createClient({ url: DATABASE_URL });
  const db = drizzle(client);

  await migrate(db, { migrationsFolder: "./drizzle" });
  await reset(db, schema);
  await seedAppData(db, { usersCount: 1, seedValue: 20260212 });

  await client.close();
}

main().catch((error) => {
  console.error("Seeding failed:", error);
  process.exitCode = 1;
});
