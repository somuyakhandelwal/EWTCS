import path from "path";
import { Pool } from "pg";
import { SeedConfig, SeedValidator } from "./validator";
import seedConfig from "./config/JMCH.json";

export interface SeedResult {
  success: boolean;
  timestamp: string;
  bedCount: number;
  stageCount: number;
  message: string;
  errors?: string[];
}

export class DatabaseSeeder {
  private pool: Pool;
  private validator: SeedValidator;

  constructor(pool: Pool) {
    this.pool = pool;
    this.validator = new SeedValidator();
  }

  private generateBeds(config: SeedConfig): Array<{ code: string; status: string }> {
    const beds = [];
    const { prefix, start, end } = config.beds;

    for (let i = start; i <= end; i += 1) {
      const bedNumber = `${prefix}-${String(i).padStart(2, "0")}`;
      beds.push({
        code: bedNumber,
        status: "available",
      });
    }

    return beds;
  }

  private async seedStages(config: SeedConfig): Promise<number> {
    const client = await this.pool.connect();

    try {
      let stageCount = 0;

      for (const stage of config.stages) {
        const query = `
          INSERT INTO stages (id, name, description, color, sequence)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (id) DO UPDATE
          SET name = $2, description = $3, color = $4, sequence = $5
          RETURNING id;
        `;

        const result = await client.query(query, [
          stage.id,
          stage.name,
          stage.description ?? null,
          stage.color,
          stage.sequence,
        ]);

        if (result.rows.length > 0) {
          stageCount += 1;
        }
      }

      return stageCount;
    } finally {
      client.release();
    }
  }

  private async seedBeds(config: SeedConfig): Promise<number> {
    const beds = this.generateBeds(config);
    const client = await this.pool.connect();

    try {
      let bedCount = 0;

      for (const bed of beds) {
        const query = `
          INSERT INTO beds (code, status, created_at)
          VALUES ($1, $2, NOW())
          ON CONFLICT (code) DO UPDATE
          SET status = $2
          RETURNING id;
        `;

        const result = await client.query(query, [bed.code, bed.status]);

        if (result.rows.length > 0) {
          bedCount += 1;
        }
      }

      return bedCount;
    } finally {
      client.release();
    }
  }

  async seed(config: SeedConfig): Promise<SeedResult> {
    const startTime = Date.now();

    const validation = this.validator.validateAll(config);
    if (!validation.valid) {
      return {
        success: false,
        timestamp: new Date().toISOString(),
        bedCount: 0,
        stageCount: 0,
        message: "Seed configuration validation failed",
        errors: validation.errors,
      };
    }

    const testClient = await this.pool.connect();
    testClient.release();

    const stageCount = await this.seedStages(config);
    const bedCount = await this.seedBeds(config);
    const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      bedCount,
      stageCount,
      message: `Seed completed successfully in ${durationSeconds}s`,
    };
  }
}

export async function runSeed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    const seeder = new DatabaseSeeder(pool);
    const configPath = path.resolve(
      process.cwd(),
      "src",
      "db",
      "seed",
      "config",
      "JMCH.json"
    );

    const config = seedConfig as SeedConfig;
    const result = await seeder.seed(config);

    console.log(result.message);
    console.log(`Seeded stages: ${result.stageCount}`);
    console.log(`Seeded beds: ${result.bedCount}`);

    if (result.errors && result.errors.length > 0) {
      console.error("Seed errors:");
      for (const error of result.errors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }

    console.log(`Seed config path: ${configPath}`);
    process.exit(result.success ? 0 : 1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runSeed().catch((error) => {
    console.error("Seed script failed", error);
    process.exit(1);
  });
}
