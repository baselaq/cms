import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import type { IRedisConfig } from '../config/redis.config';
import redisConfig from '../config/redis.config';
import { MasterDatabaseModule } from '../database/master/master-database.module';
import { AuthModule } from '../auth/auth.module';
import { TenantMetadataService } from './tenant-metadata.service';
import { ConnectionManagerService } from './connection-manager.service';
import { TenantCacheService } from './tenant-cache.service';
import { TenantContextService } from './tenant-context.service';
import { TenantResolverGuard } from './tenant-resolver.guard';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    AuthModule, // Import AuthModule to access RoleSeedService
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const config = configService.get<IRedisConfig>('redis');
        if (!config) {
          throw new Error('Redis configuration not found');
        }
        const ttl = (config.ttl || 3600) * 1000; // Convert to milliseconds
        return {
          store: await redisStore({
            socket: {
              host: config.host,
              port: config.port,
            },
            password: config.password,
            database: config.db || 0,
            ttl,
          }),
          ttl,
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    MasterDatabaseModule,
  ],
  providers: [
    TenantMetadataService,
    ConnectionManagerService,
    TenantCacheService,
    TenantContextService,
    TenantResolverGuard,
  ],
  exports: [
    TenantMetadataService,
    ConnectionManagerService,
    TenantCacheService,
    TenantContextService,
    TenantResolverGuard,
  ],
})
export class TenantModule {}
