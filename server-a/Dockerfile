FROM node:24-alpine AS base 
RUN corepack enable
USER node
WORKDIR /app

FROM base AS dev
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY --chown=node:node . .
CMD ["pnpm", "run", "start:dev"]

FROM dev AS build
RUN pnpm run build

FROM base AS prod
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --chown=node:node --from=build /app/dist ./dist
CMD ["pnpm", "run", "start"]