# Next.js 16 app. `next build` prerenders pages from live Strapi data, so the build runs
# when the container starts (Compose waits for a healthy CMS), not during `docker build`.
FROM node:22-bookworm-slim
COPY --from=oven/bun:1.4.0 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
RUN chown node:node /app
USER node
COPY --chown=node:node package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY --chown=node:node . .
RUN mkdir -p public
ENV NEXT_TELEMETRY_DISABLED=1 PORT=3000
EXPOSE 3000
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
CMD ["bun", "run", "start"]
