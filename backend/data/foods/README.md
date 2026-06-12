# Base de alimentos (TACO + TBCA)

Arquivos gerados pelo script `npm run foods:build-json`:

- `taco.json` — Tabela TACO (NEPA/UNICAMP)
- `tbca.json` — Tabela TBCA (USP), ~5.600 itens
- `catalog-meta.json` — metadados da geração

Importar no PostgreSQL:

```bash
cd backend
npm run foods:build-json
npm run foods:import
```

Ou tudo de uma vez:

```bash
npm run foods:seed
```

Fontes:

- TACO: https://github.com/brolesi/taco
- TBCA: https://github.com/raul-rznd/web-scraping-tbca
