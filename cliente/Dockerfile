# App paciente (PWA) — Clube Florescer
#
# Coolify:
#   Base Directory:  /          (raiz do repositório)
#   Dockerfile:      cliente/Dockerfile
#   Porta:           3000
#
# Coolify builders pequenos matam o build com exit 255 (OOM) sem mensagem.
# Evitar `nuxt prepare` no pós-install do npm ci — roda de novo no generate.

FROM node:22-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Coolify costuma injetar NODE_ENV=production (corta devDeps no npm ci).
ENV NODE_ENV=development
ENV NUXT_TELEMETRY_DISABLED=1
ENV NUXT_IGNORE_LOCK=1
ENV NUXT_PUBLIC_MOBILE_APP=true
ENV NODE_OPTIONS=--max-old-space-size=3072
ARG NUXT_PUBLIC_API_BASE=/api
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

# Layer Nuxt compartilhado (utils + components usados pelo PWA)
COPY frontend2 ./frontend2
COPY cliente/package*.json ./cliente/
COPY cliente ./cliente

WORKDIR /app/cliente

# --ignore-scripts: não roda `prepare`/`nuxt prepare` aqui (economiza RAM).
RUN npm ci --include=dev --include=optional --ignore-scripts --no-audit --no-fund \
  && npm cache clean --force

ENV NODE_ENV=production
RUN npm run generate \
  && rm -rf node_modules .nuxt-mobile \
  && npm cache clean --force

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/cliente/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/cliente/.output/public /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
