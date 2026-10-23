# Installation and configuration

## With Docker only (recommended to try it)

```bash
docker compose up --build      # http://localhost:3000, Strapi admin at http://localhost:1337/admin
```

Compose starts PostgreSQL, then Strapi (which seeds the demo data and creates the admin account on each start; both steps are idempotent), then Next.js. The web container runs `next build` on its first start, because the build prerenders pages from the live CMS; restarts reuse that build. Every variable has a local-demo default in `docker-compose.yml`; override any of them in a root `.env` (`APP_KEYS`, `JWT_SECRET`, `SEED_USER_PASSWORD`, `ADMIN_PASSWORD`, `WEB_PORT`, `CMS_PORT`, `DATABASE_PORT`...). Set `SEED_ON_START=false` on the `cms` service to skip seeding.

After changing the code, run `docker compose up --build` again. `docker compose down -v` deletes the data.

## Local development

### Prerequisites

Node.js 20–26, npm 10+, bun 1.4, Docker with Compose v2.

### Steps

```bash
git clone https://github.com/hamzabenarfa/le-revenu-communaute.git && cd le-revenu-communaute

# Database: PostgreSQL 16 on localhost:5433, plus the empty lerevenu_test database
cp .env.example .env
docker compose up -d db

# Strapi
cd apps/cms
cp .env.example .env            # generate real secrets: openssl rand -base64 16 (one per value)
npm install
npm run seed                    # demo data (idempotent); `npm run seed -- --reset` rebuilds it
npm run admin:create            # optional: admin panel account from ADMIN_EMAIL / ADMIN_PASSWORD
npm run develop                 # http://localhost:1337, admin at /admin

# Next.js (another terminal)
cd apps/web
cp .env.example .env.local
bun install
bun run dev                     # http://localhost:3000
```

Production: `npm run build && npm run start` in `apps/cms`, and `bun run build && bun run start` in `apps/web`.

## Environment variables

### `.env` (root, Docker Compose)

| Variable | Default |
| --- | --- |
| `DATABASE_USERNAME` / `DATABASE_PASSWORD` / `DATABASE_NAME` | `strapi` / `strapi` / `lerevenu` |
| `DATABASE_PORT` | `5433` |

### `apps/cms/.env`

| Variable | Purpose |
| --- | --- |
| `HOST`, `PORT` | Strapi server (`0.0.0.0`, `1337`) |
| `APP_KEYS`, `API_TOKEN_SALT`, `ADMIN_JWT_SECRET`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | Secrets. Must be replaced |
| `JWT_EXPIRES_IN` | Member token lifetime (`7d`) |
| `DATABASE_*` | PostgreSQL connection (matches Compose) |
| `DATABASE_URL` | Optional. A full connection string (e.g. Neon's direct one) that overrides the `DATABASE_HOST`/`PORT`/`NAME`/credentials values. Ignored by the test suite |
| `TEST_DATABASE_NAME` | Integration-test database (`lerevenu_test`) |
| `SEED_USER_PASSWORD` | Password of every seeded member (min. 8) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Admin account created by `npm run admin:create` (8+ characters, with an uppercase letter, a lowercase letter and a digit) |
| `COMMUNITY_WRITE_LIMIT` | Optional. Writes per member per minute (default 30) |

### `apps/web/.env.local`

| Variable | Purpose |
| --- | --- |
| `STRAPI_URL` | Server-only base URL of Strapi (`http://127.0.0.1:1337`). Never prefix it with `NEXT_PUBLIC_` |

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ECONNREFUSED 127.0.0.1:5433` | `docker compose up -d db` |
| `database "lerevenu_test" does not exist` | `docker exec lerevenu-postgres createdb -U strapi lerevenu_test` (the init script only runs on a fresh volume) |
| "Impossible de charger les discussions" | Strapi is not reachable at `STRAPI_URL` |
| CMS tests: "Unknown error" from `load-config-file` | `strapi develop` was rebuilding `dist/`; rerun |
| Demo data looks off | `npm run seed -- --reset` |
| Port 5433 busy | Change `DATABASE_PORT` in both `.env` files |
| Port 1337 or 3000 busy (Docker) | `CMS_PORT=1338 WEB_PORT=3001 docker compose up --build`, or stop the local `npm run develop` / `bun run dev` |
