.PHONY: install dev dev-server dev-web dev-mobile build typecheck lint lint-fix db-migrate db-seed db-reset generate db-start db-stop db-reset db-drop test-e2e test-e2e-ci test-e2e-teardown

install:
	pnpm install

dev:
	pnpm dev

dev-server:
	pnpm --filter @crabwatch/server dev

dev-web:
	pnpm --filter @crabwatch/web dev

dev-mobile:
	pnpm --filter @crabwatch/mobile start

build:
	pnpm build

typecheck:
	pnpm typecheck

lint:
	pnpm lint

lint-fix:
	pnpm lint:fix

db-migrate:
	pnpm --filter @crabwatch/server prisma migrate dev

db-seed:
	pnpm --filter @crabwatch/server prisma db seed

db-reset:
	pnpm --filter @crabwatch/server prisma migrate reset

generate:
	pnpm --filter @crabwatch/server prisma generate

db-start:
	docker compose up -d postgres

db-stop:
	docker compose down

db-drop:
	pnpm --filter @crabwatch/server prisma db drop --force

test-e2e:
	pnpm test:e2e:setup && concurrently -k -s first "pnpm dev:server" "pnpm dev:web" "wait-on http://localhost:3001/health && pnpm test:e2e"

test-e2e-ci:
	pnpm test:e2e:ci

test-e2e-teardown:
	pnpm test:e2e:teardown
