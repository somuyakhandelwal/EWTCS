**US-0.1 — CLI: System Initialization**

Summary:
- Adds an idempotent CLI to validate environment, verify and run migrations, and ensure an admin user exists.

What I changed:
- Added `scripts/init-system.js` (orchestrator) and helper modules under `scripts/` to keep files <200 lines.
- Restored `scripts/run-migrations.js` runner and installed `node-pg-migrate` as a project dependency.
- Fixed migration type mismatch in `migrations/002_core_schema.js` (changed `changed_by` to `uuid`).
- Updated `package.json` to include the `init` script.

Files added/modified (key):
- [scripts/init-system.js](scripts/init-system.js) — CLI entrypoint.
- [scripts/lib-env.js](scripts/lib-env.js) — env + encrypted DATABASE_URL resolution.
- [scripts/lib-db.js](scripts/lib-db.js) — DB checks, migrations check, admin creation.
- [scripts/lib-logger.js](scripts/lib-logger.js) — CLI logging helpers.
- [scripts/run-migrations.js](scripts/run-migrations.js) — migration runner (uses `node-pg-migrate`).
- [migrations/002_core_schema.js](migrations/002_core_schema.js) — adjusted FK column type to `uuid`.
- [scripts/seed-db.js](scripts/seed-db.js) — updated to use `username` and bcrypt-hash seed passwords.

How to run locally (development):
1. Ensure local Postgres and .env.local contain `DATABASE_URL` or set `DATABASE_URL_ENCRYPTED` + `ENCRYPTION_KEY`.
2. Install deps: `npm install`
3. Apply migrations: `npm run db:migrate` or `node scripts/run-migrations.js`
4. Initialize system (creates admin user if missing): `npm run init`
5. Seed dev data (optional): `SEED_PASSWORD=secret npm run db:seed`

Acceptance criteria met:
- `npm run init` validates env, checks DB connectivity, verifies migrations applied, and creates/updates an admin user idempotently.
- Migrations now apply without type mismatch.

Testing performed:
- Ran `npm run db:migrate` (fixed an FK type mismatch, re-applied).
- Ran `npm run init` — admin user created and temporary password generated.
- Ran `npm run db:seed` after adjusting seed script to match `users` schema.

Notes & recommendations:
- `scripts/seed-db.js` now hashes passwords; use `SEED_PASSWORD` env to control dev seed password.
- Consider replacing AES-CBC secret handling with AES-GCM or add HMAC for integrity.
- Review `package-lock.json` and push lockfile consistency with your team.

Contact/PR body is in `PR_BODY_US-0.1.md`.
