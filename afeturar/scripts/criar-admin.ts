/**
 * Cria (ou atualiza a senha de) um administrador do painel.
 *
 *   ADMIN_EMAIL=voce@exemplo.com ADMIN_SENHA='uma senha forte' npm run admin:criar
 *
 * A senha NUNCA fica gravada em arquivo: informe-a só na hora de executar. Não há usuário padrão.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashSenha, validarForcaSenha } from "../src/server/senha";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const senha = process.env.ADMIN_SENHA;
const nome = process.env.ADMIN_NOME?.trim() || null;

if (!email || !/^\S+@\S+\.\S+$/.test(email) || !senha) {
  console.error("Informe ADMIN_EMAIL e ADMIN_SENHA (e, opcionalmente, ADMIN_NOME).");
  process.exit(1);
}
const problema = validarForcaSenha(senha, email);
if (problema) { console.error(problema); process.exit(1); }

async function main() {
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
  try {
    const senhaHash = await hashSenha(senha as string);
    const u = await prisma.usuario.upsert({
      where: { email: email as string },
      update: { senhaHash, papel: "ADMIN", ativo: true, falhasLogin: 0, bloqueadoAte: null, ...(nome ? { nome } : {}) },
      create: { email: email as string, senhaHash, papel: "ADMIN", nome, aceitouTermosEm: new Date() },
    });
    await prisma.sessao.deleteMany({ where: { usuarioId: u.id } }); // troca de senha derruba sessões antigas
    console.log(`Administrador pronto: ${u.email}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
