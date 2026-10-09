export const somenteDigitos = (s: unknown) => String(s ?? "").replace(/\D/g, "");

/** CPF com dígitos verificadores (rejeita sequências repetidas como 111.111.111-11). */
export function cpfValido(valor: unknown): boolean {
  const cpf = somenteDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const dv = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(cpf.slice(0, 9), 10) === Number(cpf[9]) && dv(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export const cepValido = (v: unknown) => /^\d{8}$/.test(somenteDigitos(v)) && somenteDigitos(v) !== "00000000";
export const formatarCep = (v: unknown) => somenteDigitos(v).replace(/^(\d{5})(\d{0,3})$/, "$1-$2").replace(/-$/, "");
export const formatarCpf = (v: unknown) => somenteDigitos(v).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
/** Mostra só os 2 últimos dígitos (LGPD): •••.•••.•••-12 */
export const mascararCpf = (v: unknown) => (somenteDigitos(v).length === 11 ? `•••.•••.•••-${somenteDigitos(v).slice(9)}` : "—");
export const telefoneValido = (v: unknown) => /^\d{10,11}$/.test(somenteDigitos(v));

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"] as const;
export const emailValido = (v: unknown) => /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(String(v ?? "").trim()) && String(v).length <= 200;
