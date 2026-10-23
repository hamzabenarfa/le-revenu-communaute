# Strapi v5 CMS: builds the admin panel and server once, then seeds the demo data on start.
FROM node:22-bookworm-slim
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY --chown=node:node . .
ENV NODE_ENV=production
# The seed and admin scripts reuse the compiled dist/ (scripts/load-strapi.js), like `strapi start`.
RUN npm run build && mkdir -p public/uploads
EXPOSE 1337
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
CMD ["npm", "run", "start"]
