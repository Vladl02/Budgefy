import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL_PROD;

if (!databaseUrl) {
  throw new Error("DATABASE_URL_PROD is not set");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/schema.ts",
  out: "./drizzle/prod",
  dbCredentials: {
    url: databaseUrl,
  },
});
