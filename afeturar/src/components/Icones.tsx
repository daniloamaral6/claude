const base = {
  width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true,
};

const paths: Record<string, React.ReactNode> = {
  frete: <><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7" /><circle cx="7" cy="17" r="1.5" /><circle cx="17" cy="17" r="1.5" /></>,
  pagamento: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18" /></>,
  coracao: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  casa: <><path d="M4 11l8-7 8 7" /><path d="M6 10v10h12V10" /></>,
  presente: <><rect x="4" y="9" width="16" height="11" rx="1" /><path d="M3 9h18M12 9v11" /><path d="M12 9c-2-4-6-3-5 0M12 9c2-4 6-3 5 0" /></>,
  caneta: <><path d="M4 20l1-4L16 5l3 3L8 19z" /><path d="M14 7l3 3" /></>,
  busca: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></>,
  conta: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c1-4 4-5.5 7-5.5s6 1.5 7 5.5" /></>,
  sacola: <><path d="M5 8h14l-1.2 11H6.2L5 8z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  esquerda: <path d="M15 5l-7 7 7 7" />,
  direita: <path d="M9 5l7 7-7 7" />,
  baixo: <path d="M6 9l6 6 6-6" />,
  seta: <path d="M5 12h14M13 6l6 6-6 6" />,
  instagram: <><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="17" cy="7" r="0.6" fill="currentColor" /></>,
};

export function Icone({ nome, tamanho = 22, className }: { nome: keyof typeof paths | string; tamanho?: number; className?: string }) {
  return (
    <svg {...base} width={tamanho} height={tamanho} className={className}>
      {paths[nome]}
    </svg>
  );
}
