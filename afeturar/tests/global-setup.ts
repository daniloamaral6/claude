import { execSync } from "node:child_process";

/** Aplica as migrações no banco de TESTE (nunca no de desenvolvimento). */
export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/afeturar_test";
  process.env.TEST_DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { stdio: "pipe", env: { ...process.env, DATABASE_URL: url } });
}
