import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export interface IMasterDatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.MASTER_DB_HOST || 'localhost',
    port: parseInt(process.env.MASTER_DB_PORT || '5432', 10),
    username: process.env.MASTER_DB_USER || 'postgres',
    password: process.env.MASTER_DB_PASSWORD || 'postgres',
    database: process.env.MASTER_DB_NAME || 'cms_master',
    entities: [__dirname + '/../database/master/entities/*.entity{.ts,.js}'],
    synchronize: process.env.NODE_ENV === 'development',
    logging: process.env.NODE_ENV === 'development',
    migrations: [__dirname + '/../database/master/migrations/*{.ts,.js}'],
    migrationsRun: false,
  }),
);

