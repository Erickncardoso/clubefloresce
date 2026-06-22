# Painel admin — Coolify: Base Directory = frontend | Dockerfile = Dockerfile
FROM node:22-alpine AS builder

WORKDIR /app

ENV NUXT_TELEMETRY_DISABLED=1
ARG NUXT_PUBLIC_API_BASE=/api
ENV NUXT_PUBLIC_API_BASE=$NUXT_PUBLIC_API_BASE
ENV NODE_OPTIONS=--max-old-space-size=3072

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && rm -rf node_modules .nuxt \
  && npm cache clean --force

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NUXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=builder /app/.output ./.output

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
