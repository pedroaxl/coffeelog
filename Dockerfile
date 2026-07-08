# syntax=docker/dockerfile:1

# ---- Build stage: install everything, build web + server ----
FROM node:22-bookworm-slim AS build
WORKDIR /app

# Toolchain for building better-sqlite3 / @napi-rs/canvas native deps.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm install

COPY . .
RUN npm run build

# ---- Runtime stage: production deps + built artifacts only ----
FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=8080

COPY package.json package-lock.json* ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ ca-certificates && npm install --omit=dev --workspace=@coffeelog/server \
    && apt-get purge -y python3 make g++ && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*

# Built server code and the static web bundle (served by the server).
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/web/dist ./server/web

VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "server/dist/index.js"]
