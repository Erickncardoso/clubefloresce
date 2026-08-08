# Painel admin Next.js — Coolify: Base Directory = frontend | Dockerfile = Dockerfile
#
# Importante: NEXT_PUBLIC_* é embutido no BUILD. Configure como Build Arguments
# no Coolify (não basta só Runtime Environment Variables).
#
# Se o deploy morrer em "Creating an optimized production build" (exit 255),
# aumente memória do build no Coolify (recomendado ≥ 4 GB) — OOM costuma truncar o log.
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:22-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE=/api
ARG NEXT_PUBLIC_WHATSAPP_API_BASE=/api/whatsapp
ARG NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID=
ENV NEXT_PUBLIC_API_BASE=$NEXT_PUBLIC_API_BASE
ENV NEXT_PUBLIC_WHATSAPP_API_BASE=$NEXT_PUBLIC_WHATSAPP_API_BASE
ENV NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID=$NEXT_PUBLIC_BUNNY_STREAM_LIBRARY_ID

# Webpack no Coolify: Turbopack no build costuma estourar memória e matar o container
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
