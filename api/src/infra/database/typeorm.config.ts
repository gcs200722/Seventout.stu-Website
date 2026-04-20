import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

loadEnv();
const isTypeScriptRuntime = __filename.endsWith('.ts');
const entitiesPath = isTypeScriptRuntime
  ? 'src/**/*.entity.ts'
  : 'dist/**/*.entity.js';
const migrationsPath = isTypeScriptRuntime
  ? 'src/infra/database/migrations/*.ts'
  : 'dist/infra/database/migrations/*.js';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'seventout',
  entities: [entitiesPath],
  migrations: [migrationsPath],
  synchronize: false,
});
