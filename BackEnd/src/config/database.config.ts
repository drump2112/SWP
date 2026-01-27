import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getDatabaseConfig = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_DATABASE || 'fuel_management',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV === 'development', // Only in development!
  logging: process.env.NODE_ENV === 'development',

  // Connection Pool - tối ưu performance
  extra: {
    // Số connections tối đa trong pool
    max: 20,
    // Số connections tối thiểu giữ sẵn
    min: 5,
    // Thời gian chờ lấy connection (ms)
    connectionTimeoutMillis: 10000,
    // Thời gian idle trước khi đóng connection (ms)
    idleTimeoutMillis: 30000,
    // ✅ Đặt timezone cho PostgreSQL - chạy mỗi khi có connection mới
    // PostgreSQL sẽ chạy: SET TIME ZONE '+07:00'
    timezone: '+07:00', // UTC+7 (Asia/Ho_Chi_Minh)
  },

  // Cache query plans để tăng tốc
  cache: {
    duration: 60000, // Cache 60 giây
  },
});
