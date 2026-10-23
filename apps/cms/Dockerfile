# Strapi v5 CMS: builds the admin panel and server once, then seeds the demo data on start.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ENV NODE_ENV=production
# Dev dependencies stay: the seed script compiles the TypeScript project at runtime.
RUN npm run build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
COPY docker-entrypoint.sh /usr/local/bin/cms-entrypoint
RUN chmod +x /usr/local/bin/cms-entrypoint && mkdir -p public/uploads && chown -R node:node /app
USER node
EXPOSE 1337
ENTRYPOINT ["cms-entrypoint"]
CMD ["npm", "run", "start"]
