FROM node:24.14.1-slim AS pnpm-stage

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app
RUN CI=true pnpm install && pnpm build

FROM nginx:1.29.8

# Allow React routing. Fail if the configuration file is not modified.
RUN configfile="/etc/nginx/conf.d/default.conf"; \
    confighash="$(md5sum "${configfile}")"; \
    sed -Ei \
      '/\s*location\s+\/\s+\{\s*$/a \        try_files $uri /index.html;' \
      "${configfile}" && \
    printf "${confighash}" | md5sum --check --status - && exit 1 || true

COPY --from=pnpm-stage /app/dist /usr/share/nginx/html
