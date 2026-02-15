Project Commands
===============

- `npm install` — install dependencies
- `npm run dev` — start Next.js dev server
- `npm run init` — run system initialization (validates env, checks migrations, creates admin)
- `npm run db:migrate` — run database migrations (uses `node-pg-migrate`)
- `npm run db:status` — show migration status
- `npm run db:seed` — seed development data (`SEED_PASSWORD` env optional)
- `node scripts/run-migrations.js up` — run migrations via script
- `node scripts/run-migrations.js status` — show migrations status via script

Scripts are located in the `scripts/` directory. Ensure `DATABASE_URL` or encrypted equivalent is available in `.env.local` before running DB commands.
