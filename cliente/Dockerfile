# App paciente (PWA) — Clube Florescer
#
# Coolify:
#   Base Directory:  /          (raiz do repositório)
#   Dockerfile:      cliente/Dockerfile
#   Porta exposta:   80
#
# O build usa o layer Nuxt em frontend/ + cliente/.

FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
COPY cliente ./cliente

WORKDIR /app/frontend

ENV NODE_ENV=production
ENV NUXT_PUBLIC_MOBILE_APP=true
ARG NUXT_PUBLIC_API_BASE=https://apiclube.nutrisabellajardim.com.br/api
ARG NUXT_PUBLIC_WHATSAPP_API_BASE=https://apiclube.nutrisabellajardim.com.br/api/whatsapp
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NUXT_PUBLIC_WHATSAPP_API_BASE=$NUXT_PUBLIC_WHATSAPP_API_BASE

RUN npm run generate:paciente

FROM nginx:1.27-alpine AS runner

COPY cliente/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/cliente/.output/public /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
