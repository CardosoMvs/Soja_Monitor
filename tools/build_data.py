# -*- coding: utf-8 -*-
"""Aggregate soja transition CSVs into data.js for the GitHub Pages site."""
import csv, glob, json, os

SRC = r"D:\Marcos\Downloads\GEE_Soja-20261106T211114Z-1-001\GEE_Soja"
OUT_DIR = r"D:\Marcos\Downloads\GEE_Soja-20261106T211114Z-1-001\github-pages"

UF_LABELS = {
    "Acre": "Acre", "Pernambuco": "Pernambuco",
    "Alagoas": "Alagoas", "Amapa": "Amapá", "Amazonas": "Amazonas",
    "Bahia": "Bahia", "Ceara": "Ceará", "Distrito_Federal": "Distrito Federal",
    "Espirito_Santo": "Espírito Santo", "Goias": "Goiás", "Mato_Grosso": "Mato Grosso",
    "Mato_Grosso_Do_Sul": "Mato Grosso do Sul", "Minas_Gerais": "Minas Gerais",
    "Paraiba": "Paraíba", "Parana": "Paraná", "Piaui": "Piauí",
    "Rio_De_Janeiro": "Rio de Janeiro", "Rio_Grande_Do_Norte": "Rio Grande do Norte",
    "Rio_Grande_Do_Sul": "Rio Grande do Sul", "Rondonia": "Rondônia",
    "Roraima": "Roraima", "Santa_Catarina": "Santa Catarina", "Sao_Paulo": "São Paulo",
    "Sergipe": "Sergipe", "Tocantins": "Tocantins",
}
# (todas as exportações agora usam a janela 2018 → 2024)

T_V = "Virou soja"
T_D = "Deixou de ser soja"
T_P = "Permaneceu soja"

states = {}  # uf -> {"uf","label","ano","virou":[...],"deixou":[...],"permaneceu":ha}

def parse_transicao(t):
    if t.startswith("Virou"):
        return T_V
    if t.startswith("Deixou"):
        return T_D
    if t.startswith("Permaneceu"):
        return T_P
    return None

for path in sorted(glob.glob(os.path.join(SRC, "*.csv"))):
    name = os.path.basename(path)
    stem = name.replace(".csv", "")
    stem = stem[len("soja39_transicoes_"):]        # "2018_2024_UF"
    parts = stem.split("_")
    ano, uf_raw = parts[1], "_".join(parts[2:])
    uf = uf_raw
    label = UF_LABELS.get(uf, uf.replace("_", " "))
    rows = []
    with open(path, encoding="utf-8-sig") as f:
        for r in csv.DictReader(f):
            t = parse_transicao((r.get("transicao") or "").strip())
            if not t:
                continue
            try:
                area = float((r.get("area_ha") or "0").strip())
            except ValueError:
                area = 0.0
            rows.append({"classe": (r.get("classe_nome") or "Sem classe").strip(),
                         "classe_id": int(r["classe_id"]) if r.get("classe_id") else None,
                         "area": area, "tipo": t})
    if uf not in states:
        states[uf] = {"uf": uf, "label": label, "ano": ano, "virou": [], "deixou": [], "permaneceu": 0.0}
    st = states[uf]
    st["ano"] = ano
    for r in rows:
        if r["tipo"] == T_V:
            st["virou"].append(r)
        elif r["tipo"] == T_D:
            st["deixou"].append(r)
        elif r["tipo"] == T_P:
            st["permaneceu"] += r["area"]

def total(rows):
    return sum(r["area"] for r in rows)

data = {"gerado": "2026-11-06", "periodo": "2018–2024", "unidade": "ha",
        "estados": []}
for uf in sorted(states, key=lambda u: UF_LABELS.get(u, u)):
    st = states[uf]
    virou, deixou = total(st["virou"]), total(st["deixou"])
    st["virou"].sort(key=lambda r: -r["area"])
    st["deixou"].sort(key=lambda r: -r["area"])
    data["estados"].append({
        "uf": st["uf"], "label": st["label"], "ano": st["ano"],
        "virou": virou, "deixou": deixou, "permaneceu": st["permaneceu"],
        "virou_classes": st["virou"], "deixou_classes": st["deixou"],
        "comDados": bool(virou or deixou or st["permaneceu"]),
    })

os.makedirs(OUT_DIR, exist_ok=True)
js = "// Gerado automaticamente a partir dos CSVs soja39_transicoes — não editar à mão\n"
js += "const DADOS = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n"
with open(os.path.join(OUT_DIR, "data.js"), "w", encoding="utf-8") as f:
    f.write(js)

# summary for the console
br_v = sum(s["virou"] for s in data["estados"])
br_d = sum(s["deixou"] for s in data["estados"])
br_p = sum(s["permaneceu"] for s in data["estados"])
print("estados: %d (com dados: %d)" % (len(data["estados"]), sum(1 for s in data["estados"] if s["comDados"])))
print("Brasil virou=%.0f ha | deixou=%.0f ha | permaneceu=%.0f ha" % (br_v, br_d, br_p))
for s in data["estados"]:
    print("%-20s ano=%s virou=%10.0f deixou=%9.0f perm=%10.0f n(v/d)=%d/%d"
          % (s["label"], s["ano"], s["virou"], s["deixou"], s["permaneceu"],
             len(s["virou_classes"]), len(s["deixou_classes"])))
