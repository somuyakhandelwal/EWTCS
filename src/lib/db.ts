import { Pool, QueryResult } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({ connectionString });

export async function query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export default { pool, query, closePool };
