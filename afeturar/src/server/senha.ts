import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (senha: string, salt: Buffer, tam: number, opts: object) => Promise<Buffer>;

// Parâmetros do scrypt (OWASP): custo 2^15, r=8, p=1.
const N = 32768, R = 8, P = 1, TAM = 64;
const OPTS = { N, r: R, p: P, maxmem: 128 * 1024 * 1024 };

/** Formato: scrypt$N$r$p$salt$hash (base64). Sem dependências externas. */
export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(senha, salt, TAM, OPTS);
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const partes = armazenado.split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = partes;
  const esperado = Buffer.from(hash, "base64");
  const obtido = await scrypt(senha, Buffer.from(salt, "base64"), esperado.length, { N: +n, r: +r, p: +p, maxmem: 128 * 1024 * 1024 });
  return obtido.length === esperado.length && timingSafeEqual(obtido, esperado);
}

/** Hash fixo usado para gastar o mesmo tempo quando o e-mail não existe (evita revelar contas). */
export const HASH_FALSO = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

/** Política mínima: 10+ caracteres, não pode ser só um tipo de caractere repetido nem conter o e-mail. */
export function validarForcaSenha(senha: string, email?: string): string | null {
  if (senha.length < 10) return "A senha precisa ter pelo menos 10 caracteres.";
  if (senha.length > 200) return "A senha é longa demais.";
  if (new Set(senha).size < 5) return "Use uma senha com mais variedade de caracteres.";
  if (email && senha.toLowerCase().includes(email.split("@")[0].toLowerCase()) && email.split("@")[0].length >= 4)
    return "A senha não pode conter o seu e-mail.";
  return null;
}
