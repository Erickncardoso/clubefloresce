# Base de alimentos (TBCA principal + TACO complemento)

Arquivos gerados pelos scripts em `backend/`:

- `tbca-source.jsonl` — dump bruto da TBCA **7.3** (portal oficial)
- `tbca-fetch-meta.json` — metadados do último fetch TBCA
- `taco.json` — Tabela TACO (NEPA/UNICAMP)
- `tbca.json` — TBCA normalizada para o app
- `catalog-meta.json` — metadados da geração

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
- TBCA: https://tbca.net.br/ (versão 7.3, USP/FoRC)
