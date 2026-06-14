---
type: project
created: 2026-06-09
updated: 2026-06-09
---

# Clube Florescer — Stack e convenções

## Dois apps Nuxt

| App | Pasta | Scripts |
|-----|-------|---------|
| Admin (nutri) | `frontend/` | `npm run dev:frontend` |
| Paciente PWA | `cliente/` | `npm run dev:cliente` |

`cliente/` extends `frontend/` — componentes compartilhados no frontend; páginas do paciente só em `cliente/pages/`.

## Backend

- `backend/` — Express + Prisma + PostgreSQL (`:3001`)
- Cloudinary e OpenAI no serviço **apiclube** (Coolify)

## Produção

- Admin: `clube.nutrisabellajardim.com.br`
- PWA: `app.nutrisabellajardim.com.br`
- API: `apiclube.nutrisabellajardim.com.br`

## Regras

- Não duplicar páginas entre `cliente/pages` e `frontend/pages`
- Admin: middleware `admin-auth.global.ts`
- Paciente: middleware em `cliente/middleware/`
