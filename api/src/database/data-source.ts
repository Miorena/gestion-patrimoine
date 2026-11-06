import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

config(); // loads .env

// Used by the TypeORM CLI (migrations) and the seed script
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
