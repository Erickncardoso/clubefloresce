# App paciente (PWA) — Clube Florescer
#
# Coolify:
#   Base Directory:  /          (raiz do repositório)
#   Dockerfile:      cliente/Dockerfile
#   Porta:           3000

FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_OPTIONS=--max-old-space-size=4096
ENV NUXT_TELEMETRY_DISABLED=1
ENV NUXT_IGNORE_LOCK=1
ENV NUXT_PUBLIC_MOBILE_APP=true
ARG NUXT_PUBLIC_API_BASE=/api
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

COPY frontend ./frontend
COPY cliente/package*.json ./cliente/
COPY cliente ./cliente

WORKDIR /app/cliente

RUN npm ci && npm run generate

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/cliente/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/cliente/.output/public /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
