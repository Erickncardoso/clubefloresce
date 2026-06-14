# Clube Florescer — Agentes e Skills (AG Kit)

## Dois apps

| App | Pasta | Porta dev |
|-----|-------|-----------|
| **Painel admin** | `frontend/` | 3000 |
| **App paciente PWA** | `cliente/` | 3002 |

- `cliente/pages/` = **design original do paciente** (fonte de verdade)
- `frontend/pages/` = **somente admin** (paciente foi removido daqui)
- `cliente/` estende `frontend/` só para componentes/composables/assets

## Dev

```bash
npm run dev:backend
npm run dev:frontend   # admin
npm run dev:cliente    # paciente (usa cliente/pages/)
```
