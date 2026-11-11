import { config } from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

config(); // charge le fichier .env

// Utilisé par la CLI TypeORM (migrations) et le script de seed
export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
});
