# Base de alimentos (TBCA principal + TACO complemento)

Arquivos gerados pelos scripts em `backend/`:

- `tbca-source.jsonl` — dump bruto da TBCA **7.3** (portal oficial)
- `tbca-fetch-meta.json` — metadados do último fetch TBCA
- `taco.json` — Tabela TACO (NEPA/UNICAMP)
- `tbca.json` — TBCA normalizada para o app
- `catalog-meta.json` — metadados da geração

## Fontes no app

| Fonte | Situação | Como atualizar |
|-------|----------|----------------|
| **TACO** (NEPA/UNICAMP) | Aberta (CSV comunitário) | `npm run foods:import-taco` |
| **TBCA 7.3** (USP/FoRC) | Portal oficial | `npm run foods:update-tbca` |
| **TABNUT** (Unifesp) | **Sem dump redistribuível** — FAQ da Unifesp proíbe distribuição da base (é USDA traduzida) | — |
| **Tucunduva** (Philippi / Manole) | **Obra comercial** — sem dados abertos legais | — |

Não há “outras versões” da TBCA instaláveis no portal: a base pública atual é a **7.3**. O app exibe o rótulo `TBCA 7.3`.

## Merge Dietbox → banco (aliases + CUSTOM)

1. Sempre tentar **TBCA/TACO** com aliases (`food-catalog-aliases.ts`).
2. Só criar **CUSTOM** (`FoodOverride`) quando não houver equivalente — macros por 100 g com fonte citada no seed.
3. Aplicar aliases no Postgres + reseed CUSTOM:

```bash
npm run foods:patch-aliases
```

## Atualizar TBCA (oficial 7.3)

```bash
cd backend
npm run foods:fetch-tbca      # baixa do https://tbca.net.br/ (~10–20 min)
npm run foods:build-json      # gera taco.json + tbca.json
npm run foods:import          # upsert no PostgreSQL
```

Ou tudo de uma vez:

```bash
npm run foods:update-tbca
```

Só TACO:

```bash
npm run foods:import-taco
```

Teste rápido (1 página + 3 alimentos):

```bash
npm run foods:fetch-tbca:probe
```

## Seed só com arquivos já gerados

```bash
npm run foods:seed
```

Fontes:

- TACO: https://github.com/brolesi/taco
- TBCA: https://www.tbca.net.br/ (versão 7.3, USP/FoRC)
- TABNUT: https://tabnut.dis.epm.br/ (consulta web; sem export autorizado)
- Tucunduva: livro Manole (copyright)
