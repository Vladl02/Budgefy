import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_DEV;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_DEV is not set");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle/dev",
  dbCredentials: {
    url: databaseUrl,
  },
});
