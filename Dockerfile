# syntax=docker/dockerfile:1.28.0@sha256:bb22d9815c728170f72750f4e5b0d672e06176142e1d602c7e66c050100b7e5b
#
# Multi-stage build on Docker Hardened Images (pulling from dhi.io needs `docker login dhi.io`
# with a Docker Hub account):
#   build    Node dev image: installs the dependencies and builds the site (static files)
#   runtime  hardened nginx (non-root uid 65532): serves the site
#
# The build stage runs on the builder's native platform (--platform=$BUILDPLATFORM): its output
# is architecture independent, so the arm64 and amd64 images are produced without emulation.
# Typecheck, lint and tests run in CI, not here. The assets are the committed output of
# `npm run assets`: original/ is not needed to build.
#
#   docker build -t 24games .
#   docker run --rm -p 8080:8080 --read-only --tmpfs /tmp 24games
#
# Images are pinned by digest (multi-arch index); Renovate keeps them up to date.

FROM --platform=$BUILDPLATFORM dhi.io/node:26-alpine-dev@sha256:4f971dcdc1fdf59f9d3e84dbd529690c2d15f75ae898fb310acad9c12d7bbdf9 AS build
WORKDIR /src
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund
COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM dhi.io/nginx:1-alpine3.24@sha256:7a4e9021737f414ad0f851efb939600690d9d092f51712ce6512bfd0a767ceae AS runtime
ARG REVISION=unknown
# The release tag (e.g. 2026-11-01), or edge-<commit>.
ARG VERSION=dev
LABEL org.opencontainers.image.title="24games" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.description="The games of 24 Games for Windows 95, reverse-engineered for the browser" \
      org.opencontainers.image.source="https://github.com/sebastka/24Games" \
      org.opencontainers.image.licenses="MIT AND LicenseRef-Expert-Software" \
      org.opencontainers.image.revision="${REVISION}"

# Owned by root and world-readable: the nginx user (65532) cannot modify them, and a read-only
# root filesystem works (nginx writes only to /tmp).
COPY deploy/nginx/ /etc/24games/
COPY --from=build /src/dist /usr/share/24games

USER 65532:65532
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/healthz"]

ENTRYPOINT ["nginx", "-e", "/dev/stderr", "-c", "/etc/24games/nginx.conf", "-g", "daemon off;"]
CMD []
