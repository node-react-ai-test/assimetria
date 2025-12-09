import dotenv from 'dotenv';
import { Pool, PoolClient, PoolConfig, QueryResult, QueryResultRow } from 'pg';

dotenv.config();

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseBoolean = (value: string | undefined, fallback = false): boolean => {
  if (value === undefined) {
    return fallback;
  }

  return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
};

const baseConfig: PoolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
    }
  : {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseNumber(process.env.DB_PORT, 5432),
      user: process.env.DB_USER ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'assimetria',
    };

const poolConfig: PoolConfig = {
  ...baseConfig,
  max: parseNumber(process.env.DB_POOL_MAX, 10),
  idleTimeoutMillis: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30_000),
  connectionTimeoutMillis: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 2_000),
};

if (parseBoolean(process.env.DB_SSL_ENABLED)) {
  poolConfig.ssl = {
    rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, false),
  };
}

export const dbPool = new Pool(poolConfig);

dbPool.on('error', (error) => {
  console.error('Unexpected Postgres pool error: ', error);
});

export const getDbClient = (): Promise<PoolClient> => dbPool.connect();

export const runQuery = <T extends QueryResultRow = QueryResultRow>(
  queryText: string,
  params?: ReadonlyArray<unknown>,
): Promise<QueryResult<T>> => {
  const mutableParams = params ? [...params] : undefined;
  return dbPool.query<T>(queryText, mutableParams);
};
