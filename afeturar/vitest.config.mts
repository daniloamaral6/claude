import { defineConfig } from "vitest/config";
import path from "node:path";
import os from "node:os";

const testUrl = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/afeturar_test";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/server-only-stub.ts") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false, // todos os testes compartilham um único banco
    testTimeout: 30000,
    // Os serviços (src/server) usam DATABASE_URL: aqui sempre o banco de TESTE.
    env: { DATABASE_URL: testUrl, TEST_DATABASE_URL: testUrl, STORAGE_DIR: path.join(os.tmpdir(), "afeturar-test-uploads") },
  },
});
