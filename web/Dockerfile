# CRAFT-ON web/PWA container — runs on Cloud Run (asia-northeast1).
# Multi-stage build using Next.js standalone output for a small runtime image.

# ── Build stage ───────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS build
WORKDIR /app

# Install deps first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# NEXT_PUBLIC_* values are inlined at build time, so they must be set before build.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
ARG NEXT_PUBLIC_AUTH_MODE=fake
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_AUTH_MODE=${NEXT_PUBLIC_AUTH_MODE} \
    NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN npm run build

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# Standalone server bundle + static assets + public files.
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

EXPOSE 8080
# server.js is emitted by Next.js standalone output; it honors $PORT and $HOSTNAME.
CMD ["node", "server.js"]
