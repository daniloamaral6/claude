import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedBase } from "./seed-base";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

seedBase(prisma)
  .then(() => console.log("Seed concluído (categorias, cores, páginas e configurações-base)."))
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
