import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';

loadEnv();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5433),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'seventout',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/infra/database/migrations/*.ts'],
  synchronize: false,
});
