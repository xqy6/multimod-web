FROM node:24-alpine AS web-builder
RUN corepack enable
WORKDIR /app
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY web/ ./
RUN pnpm build

FROM node:24-alpine
RUN corepack enable
WORKDIR /app/server
COPY server/package.json server/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY server/ ./
COPY --from=web-builder /app/dist /app/web/dist

ENV PORT=4000
EXPOSE 4000
CMD ["node", "src/index.js"]
