# Clube Florescer — App Expo (paciente)

App nativo espelhando **100%** o PWA em `cliente/`. O `cliente/` **não é alterado** — este projeto é independente e consome a mesma API.

## Rodar

```bash
# Terminal 1 — backend
npm run dev:backend

# Terminal 2 — Expo
npm run dev:expo
```

Copie `.env.example` para `.env` e ajuste `EXPO_PUBLIC_API_BASE` se testar em celular físico (use o IP da máquina na LAN).

## Estrutura

| Pasta | Função |
|-------|--------|
| `app/` | Rotas Expo Router — mesmas URLs do `cliente/pages/` |
| `src/lib/cliente-screen-map.ts` | Mapa 1:1 rota → arquivo Vue fonte |
| `src/screens/LoginScreen.tsx` | Login portado (`cliente/pages/index.vue`) |
| `src/components/PatientTabBar.tsx` | Tab bar (`frontend/components/PatientTabBar.vue`) |
| `src/hooks/usePatientRouteGuard.ts` | Auth + onboarding + assinatura (middlewares do cliente) |

## Migração tela a tela

Telas ainda não portadas exibem um **espelho** com a rota e o arquivo Vue de referência. Para portar uma tela:

1. Abra o `.vue` correspondente em `cliente/pages/`
2. Substitua o `createClienteMirrorScreen(...)` pela UI React Native
3. Reuse componentes de `frontend/` como **referência** (não importe `.vue` direto)

## Auth nativo

O app envia `X-CF-Client: expo` e recebe o JWT no JSON (cookie continua só no PWA). Mudança mínima no backend — `cliente/` intacto.

## Scripts

```bash
npm run routes:sync   # regenera rotas espelho a partir do mapa
```
