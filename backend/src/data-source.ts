import 'dotenv/config'
import { join } from 'path'
import { DataSource } from 'typeorm'

/**
 * Standalone DataSource for the TypeORM CLI (migrations). The application itself
 * configures TypeORM in app.module; this file exists so schema changes go
 * through generated, version-controlled migrations instead of manual SQL —
 * which is what prevented the entity/DB drift that caused earlier bugs.
 *
 * Usage:
 *   npm run migration:generate -- src/migrations/<Name>
 *   npm run migration:run
 *   npm run migration:revert
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'goldeksa',
  entities: [join(__dirname, '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: false,
})

export default AppDataSource
