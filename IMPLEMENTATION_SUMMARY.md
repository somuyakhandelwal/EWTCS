Implementation Summary — US-0.1
================================

Design:
- Small, single-purpose helper modules in `scripts/` (`lib-env`, `lib-db`, `lib-logger`) to keep files under 200 lines.
- `scripts/init-system.js` is an orchestrator that runs environment checks, DB connectivity checks, migration verification, and admin creation.
- Migrations are managed with `node-pg-migrate`; `scripts/run-migrations.js` is a thin wrapper to call it with project defaults.

Security choices:
- Encrypted env support uses AES-256-CBC with a derived key. Recommend AES-GCM/HMAC for integrity in future.
- Passwords are hashed with `bcrypt` for seed and admin setup.

Idempotency:
- `setupAdminUser` is idempotent: it updates password for existing admin or inserts a new admin if missing.
