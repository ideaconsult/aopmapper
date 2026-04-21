FROM node:24.15.0-slim AS pnpm-stage

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app
RUN CI=true pnpm install && pnpm build

FROM nginx:1.29.8
COPY --from=pnpm-stage /app/dist /usr/share/nginx/html
