import { execSync } from 'child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { askInput, askQuestion, log } from './setup-utils.mjs';

function runPsql(command, dbConfig) {
  return execSync(command, {
    encoding: 'utf-8',
    env: {
      ...process.env,
      PGPASSWORD: dbConfig.password || '',
    },
  });
}

/**
 * Ensure database exists using default local config.
 */
export async function setupDatabase(step, totalSteps) {
  log.step(step, totalSteps, 'Configuring database...');

  const useDefaults = await askQuestion(
    'Use default database settings (postgres@localhost:5432/ewtcs)?'
  );

  const dbConfig = {
    host: 'localhost',
    port: '5432',
    user: 'postgres',
    dbName: 'ewtcs',
    password: '',
  };

  if (!useDefaults) {
    dbConfig.host = await askInput('Database host', dbConfig.host);
    dbConfig.port = await askInput('Database port', dbConfig.port);
    dbConfig.user = await askInput('Database user', dbConfig.user);
    dbConfig.dbName = await askInput('Database name', dbConfig.dbName);
  }

  dbConfig.password = await askInput('PostgreSQL password (leave empty if none)');

  const basePsql = `psql -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} -d postgres`;

  try {
    runPsql(`${basePsql} -tAc "SELECT 1;"`, dbConfig);
  } catch {
    log.error('Could not connect to PostgreSQL with provided settings.');
    process.exit(1);
  }

  try {
    const exists = runPsql(
      `${basePsql} -tAc "SELECT 1 FROM pg_database WHERE datname='${dbConfig.dbName}';"`,
      dbConfig
    )
      .trim()
      .startsWith('1');

    if (exists) {
      log.success(`Database '${dbConfig.dbName}' already exists`);
    } else {
      execSync(
        `createdb -h ${dbConfig.host} -p ${dbConfig.port} -U ${dbConfig.user} ${dbConfig.dbName}`,
        {
          stdio: 'inherit',
          env: {
            ...process.env,
            PGPASSWORD: dbConfig.password || '',
          },
        }
      );
      log.success(`Database '${dbConfig.dbName}' created`);
    }
  } catch (error) {
    log.error(`Failed to ensure database exists: ${error.message}`);
    process.exit(1);
  }

  return dbConfig;
}

/**
 * Create .env.local and inject DATABASE_URL.
 */
export async function createEnvFile(step, totalSteps, rootDir, dbConfig) {
  log.step(step, totalSteps, 'Configuring environment file...');

  const envLocalPath = join(rootDir, '.env.local');
  const envExamplePath = join(rootDir, '.env.example');

  if (existsSync(envLocalPath)) {
    const overwrite = await askQuestion('.env.local already exists. Overwrite it?');
    if (!overwrite) {
      log.info('Keeping existing .env.local');
      return;
    }
  }

  if (existsSync(envExamplePath)) {
    copyFileSync(envExamplePath, envLocalPath);
  } else {
    writeFileSync(envLocalPath, '', 'utf-8');
  }

  const passwordPart = dbConfig.password
    ? `:${encodeURIComponent(dbConfig.password)}`
    : '';
  const databaseUrl = `postgresql://${dbConfig.user}${passwordPart}@${dbConfig.host}:${dbConfig.port}/${dbConfig.dbName}`;

  let envContent = readFileSync(envLocalPath, 'utf-8');
  if (/^DATABASE_URL=.*$/m.test(envContent)) {
    envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${databaseUrl}`);
  } else {
    envContent = `DATABASE_URL=${databaseUrl}\n${envContent}`;
  }

  writeFileSync(envLocalPath, envContent, 'utf-8');
  log.success('.env.local configured');
}
