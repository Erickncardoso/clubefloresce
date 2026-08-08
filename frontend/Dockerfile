# Painel admin Next.js — Coolify: Base Directory = frontend | Dockerfile = Dockerfile
#
# Importante:
# - NEXT_PUBLIC_* precisa ser Build Argument (embutido no build)
# - Coolify costuma injetar NODE_ENV=production (corta deps no npm ci).
# - next build NÃO pode rodar com NODE_ENV=development (quebra prerender).
FROM node:22-bookworm-slim AS deps
WORKDIR /app
# Força install completo mesmo se o Coolify exportar NODE_ENV=production
ENV NODE_ENV=development
COPY package.json package-lock.json ./
RUN npm ci --include=dev \
  && test -d node_modules/next \
  && node -e "const n=Object.keys(require('./package-lock.json').packages||{}).length; if(n<200){console.error('package-lock incompleto:',n); process.exit(1)}"

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Sanity check: contexto precisa incluir lib/ e tsconfig (alias @/*)
RUN test -f ./lib/api.ts \
  && test -f ./tsconfig.json \
  && test -d ./components \
  && test -d ./app

ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_WHATSAPP_API_BASE=/api/whatsapp
ARG NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID=
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_WHATSAPP_API_BASE=$NEXT_PUBLIC_WHATSAPP_API_BASE
ENV NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID=$NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID

# Obrigatório production no build — development quebra static generation
ENV NODE_ENV=production
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
