
const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const dotenv = require('dotenv');

// Load .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const envSchema = z.object({
    DATABASE_URL: z.string().optional(),
    DATABASE_URL_ENCRYPTED: z.string().optional(),
    SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
    ENCRYPTION_KEY: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string()
        .url('NEXT_PUBLIC_APP_URL must be a valid URL')
        .default('http://localhost:3000'),
    NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
    RED_ALERT_THRESHOLD_MS: z.coerce.number().int().positive().default(10800000),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_API_KEY_ENCRYPTED: z.string().optional(),
});

console.log('Validating environment variables...');
const result = envSchema.safeParse(process.env);

if (!result.success) {
    console.error('Validation FAILED:', JSON.stringify(result.error.flatten(), null, 2));
    process.exit(1);
} else {
    console.log('Validation PASSED');
    console.log('SESSION_SECRET length:', result.data.SESSION_SECRET.length);
}
