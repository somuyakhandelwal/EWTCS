Quick Start — Development
=========================

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
2. Install dependencies:

```bash
npm install
```

3. Run migrations:

```bash
npm run db:migrate
```

4. Initialize the system (creates admin):

```bash
npm run init
```

5. (Optional) Seed dev data:

```bash
SEED_PASSWORD=secret npm run db:seed
```
