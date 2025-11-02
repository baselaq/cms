import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import databaseConfig from '@/config/database.config';
import { ClubEntity } from './entities/club.entity';

@Module({
  imports: [
    ConfigModule.forFeature(databaseConfig),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const config = configService.get<TypeOrmModuleOptions>('database');
        if (!config) {
          throw new Error('Database configuration not found');
        }
        return config;
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([ClubEntity]),
  ],
  exports: [TypeOrmModule],
})
export class MasterDatabaseModule {}
