
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

// Cấu hình DataSource tương tự như ormconfig.ts nhưng tối giản
const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'fuel_management',
  entities: [],
  migrations: [],
  synchronize: false,
});

async function run() {
  console.log('Initializing DataSource...');
  await AppDataSource.initialize();

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();

  console.log('Starting transaction...');
  await queryRunner.startTransaction();

  try {
    console.log('Note: This is a placeholder migration runner.');
    console.log('Add your migration code here or use TypeORM CLI instead.');

    await queryRunner.commitTransaction();
    console.log('Migration executed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    await queryRunner.rollbackTransaction();
  } finally {
    await queryRunner.release();
    await AppDataSource.destroy();
  }
}

run();
