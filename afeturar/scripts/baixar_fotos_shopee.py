"""
Baixa as fotos (galeria e cores) listadas no produtos.json da Shopee.

  python3 -I scripts/baixar_fotos_shopee.py produtos.json storage/fotos-shopee

Cria <destino>/<slug>/fotos/NN.jpg e <destino>/<slug>/variacoes/<cor>.jpg. Pula o que já existe.
Vídeos não são baixados (a loja ainda não exibe vídeo).
"""
import json, os, subprocess, sys


def baixar(url, destino):
    if os.path.exists(destino) and os.path.getsize(destino) > 0:
        return "já existia"
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    r = subprocess.run(["curl", "-sS", "-m", "60", "--retry", "2", "-o", destino + ".part", "-w", "%{http_code}", url], capture_output=True, text=True)
    if r.stdout.strip() != "200":
        if os.path.exists(destino + ".part"):
            os.remove(destino + ".part")
        return f"ERRO {r.stdout.strip()} {r.stderr.strip()[:80]}"
    os.replace(destino + ".part", destino)
    return "ok"


def main(entrada, pasta):
    produtos = json.load(open(entrada, encoding="utf-8"))["produtos"]
    erros = 0
    for p in produtos:
        itens = [(f["url_shopee"], f["arquivo"]) for f in p["fotos"] if f.get("url_shopee")]
        for v in p["variacoes"]:
            itens += [(o["url_shopee"], o["arquivo"]) for o in v["opcoes"] if o.get("url_shopee") and o.get("arquivo")]
        res = [baixar(u, os.path.join(pasta, a)) for u, a in itens]
        erros += sum(r.startswith("ERRO") for r in res)
        print(f"{p['slug'][:50]:50} {len(itens):3} arquivos | falhas: {sum(r.startswith('ERRO') for r in res)}")
    print("TOTAL de falhas:", erros)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
