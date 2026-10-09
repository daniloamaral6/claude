import { describe, expect, it } from "vitest";
import { centavosParaTexto, textoParaCentavos } from "../src/lib/moeda";
import { slugify } from "../src/lib/slug";
import { hashSenha, validarForcaSenha, verificarSenha } from "../src/server/senha";
import { cnpjValido } from "../src/server/validacao";

describe("moeda", () => {
  it.each([
    ["49,90", 4990], ["R$ 1.234,56", 123456], ["49", 4900], ["49,9", 4990], ["49.90", 4990], ["1.234", 123400], ["0,05", 5],
  ])("converte %s", (txt, esperado) => expect(textoParaCentavos(txt)).toBe(esperado));
  it.each(["", "abc", "1,2,3", "12,345", "-5", "49,9x"])("rejeita %s", (txt) => expect(textoParaCentavos(txt)).toBeNull());
  it("formata centavos para o campo", () => {
    expect(centavosParaTexto(4990)).toBe("49,90");
    expect(centavosParaTexto(123456)).toBe("1234,56");
    expect(centavosParaTexto(null)).toBe("");
  });
});

describe("slug", () => {
  it("remove acentos e símbolos", () => expect(slugify("  Vaso Decorativo Ão! (G) ")).toBe("vaso-decorativo-ao-g"));
});

describe("senha", () => {
  it("gera hash diferente a cada vez e verifica corretamente", async () => {
    const [a, b] = await Promise.all([hashSenha("Senha-Forte-123"), hashSenha("Senha-Forte-123")]);
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verificarSenha("Senha-Forte-123", a)).toBe(true);
    expect(await verificarSenha("senha-forte-123", a)).toBe(false);
    expect(await verificarSenha("x", "formato-invalido")).toBe(false);
  });
  it("aplica política mínima", () => {
    expect(validarForcaSenha("curta")).toMatch(/10 caracteres/);
    expect(validarForcaSenha("aaaaaaaaaaaa")).toMatch(/variedade/);
    expect(validarForcaSenha("maria.silva2026", "maria.silva@x.com")).toMatch(/e-mail/);
    expect(validarForcaSenha("Uma-Senha-Boa-9")).toBeNull();
  });
});

describe("cnpj", () => {
  it("valida dígitos verificadores", () => {
    expect(cnpjValido("11222333000181")).toBe(true);
    expect(cnpjValido("11222333000182")).toBe(false);
    expect(cnpjValido("11111111111111")).toBe(false);
    expect(cnpjValido("123")).toBe(false);
  });
});
