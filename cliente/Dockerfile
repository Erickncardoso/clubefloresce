# App paciente (PWA) — Clube Florescer
#
# Coolify:
#   Base Directory:  /          (raiz do repositório)
#   Dockerfile:      cliente/Dockerfile
#   Porta:           80

FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
COPY cliente/nginx.conf ./cliente/nginx.conf

WORKDIR /app/frontend

ENV NODE_ENV=production
ENV NUXT_PUBLIC_MOBILE_APP=true
ARG NUXT_PUBLIC_API_BASE=https://apiclube.nutrisabellajardim.com.br/api
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

RUN npm run prepare:mobile && npm run generate:paciente

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/cliente/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/frontend/.output/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
