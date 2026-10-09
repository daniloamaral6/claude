import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Cliente único do banco (evita múltiplas conexões em desenvolvimento com hot reload). */
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

function criarCliente() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL não definida. Copie .env.example para .env.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
}

export const db = globalParaPrisma.prisma ?? criarCliente();

if (process.env.NODE_ENV !== "production") globalParaPrisma.prisma = db;
