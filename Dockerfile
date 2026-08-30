FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json tsconfig*.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY mac-sync/package.json mac-sync/package.json
RUN npm ci
COPY shared shared
COPY server server
RUN npm run build -w shared && npm run build -w server

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8787 DATABASE_PATH=/data/ti-tickets.sqlite
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/shared ./shared
COPY --from=build /app/server ./server
EXPOSE 8787
VOLUME ["/data"]
CMD ["node", "server/dist/index.js"]
