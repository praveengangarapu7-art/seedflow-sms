import type { PoolClient } from 'pg';
import { pool } from './pool';

/**
 * Runs `work` inside a single BEGIN/COMMIT transaction on one connection.
 * Any error thrown by `work` triggers a ROLLBACK before the connection is
 * released, so partial writes (e.g. an allocation insert followed by a
 * failing quantity update) never persist.
 */
export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
