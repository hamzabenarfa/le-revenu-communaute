# Next.js 16 app. `next build` prerenders pages from live Strapi data, so the build runs
# when the container starts (Compose waits for a healthy CMS), not during `docker build`.
FROM node:22-bookworm-slim
COPY --from=oven/bun:1.4.0 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
COPY docker-entrypoint.sh /usr/local/bin/web-entrypoint
RUN chmod +x /usr/local/bin/web-entrypoint && mkdir -p public && chown -R node:node /app
ENV NEXT_TELEMETRY_DISABLED=1 PORT=3000
USER node
EXPOSE 3000
ENTRYPOINT ["web-entrypoint"]
CMD ["bun", "run", "start"]
