# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
#
# Multi-stage build on Docker Hardened Images (pulling from dhi.io needs `docker login dhi.io`
# with a Docker Hub account):
#   build      dev image (npm, root): installs all dependencies and builds the site
#   prod-deps  dev image: production dependencies only
#   runtime    hardened Node image (non-root uid 1000, no shell, no package manager): serves the
#              site and the high score API
#
# Both build stages run on the builder's native platform (--platform=$BUILDPLATFORM): their
# output is architecture independent (built assets, pure-JS dependencies), so the arm64 and
# amd64 images are produced without emulation. Typecheck, lint and tests run in CI, not here.
# The assets are the committed output of `npm run assets`: original/ is not needed to build.
#
#   docker build -t 24games .
#   docker run --rm -p 8080:8080 --read-only 24games                       # scores in each browser
#   docker run --rm -p 8080:8080 --read-only -e DB_HOST=… -e DB_PASSWORD=… 24games   # shared scores
#
# Images are pinned by digest (multi-arch index); Renovate keeps them up to date.

FROM --platform=$BUILDPLATFORM dhi.io/node:26-alpine-dev@sha256:4f971dcdc1fdf59f9d3e84dbd529690c2d15f75ae898fb310acad9c12d7bbdf9 AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM --platform=$BUILDPLATFORM dhi.io/node:26-alpine-dev@sha256:4f971dcdc1fdf59f9d3e84dbd529690c2d15f75ae898fb310acad9c12d7bbdf9 AS prod-deps
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM dhi.io/node:26-alpine@sha256:5c86dab3a84b76e8ae134d04adf87bd23c5356a4d24f2005f57aa0aa305d7773 AS runtime
ARG REVISION=unknown
# The release tag (e.g. 2026-11-01), or edge-<commit>.
ARG VERSION=dev
LABEL org.opencontainers.image.title="24games" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.description="The games of 24 Games for Windows 95, reverse-engineered for the browser" \
      org.opencontainers.image.source="https://github.com/sebastka/24Games" \
      org.opencontainers.image.licenses="MIT AND LicenseRef-Expert-Software" \
      org.opencontainers.image.revision="${REVISION}"

ENV NODE_ENV=production \
    LISTEN_HOST=0.0.0.0 \
    PORT=8080

# Everything is owned by root and world-readable, so the app user (1000) cannot modify it: a
# read-only root filesystem works (the server writes nothing; the scores are in MariaDB).
WORKDIR /app
COPY package.json ./
COPY --from=prod-deps /src/node_modules ./node_modules
COPY --from=build /src/dist ./dist
COPY src/server ./src/server
COPY src/shared ./src/shared

EXPOSE 8080

# No shell or curl in the image, so the probe is written in Node.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT}/api/health`).then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]

CMD ["node", "/app/src/server/index.ts"]
