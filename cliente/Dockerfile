# App paciente (PWA) — Clube Florescer
#
# Coolify:
#   Base Directory:  /          (raiz do repositório)
#   Dockerfile:      cliente/Dockerfile
#   Porta:           3000

FROM node:20-alpine AS builder
WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

COPY frontend ./frontend
COPY cliente/package*.json ./cliente/
COPY cliente ./cliente

WORKDIR /app/cliente

# Não definir NODE_ENV=production aqui — o build precisa das devDependencies (cross-env, etc.)
ENV NUXT_PUBLIC_MOBILE_APP=true
ARG NUXT_PUBLIC_API_BASE=/api
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE

RUN npm ci && npm run generate

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/cliente/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/cliente/.output/public /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
