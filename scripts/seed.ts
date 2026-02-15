import { runSeed } from "../src/db/seed/seed";

runSeed().catch((error) => {
  console.error("Seed script failed", error);
  process.exit(1);
});
