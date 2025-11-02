import { DataSource } from 'typeorm';

export interface ITenantDbConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  poolSize?: number;
}

export interface ITenantMetadata {
  id: string;
  subdomain: string;
  name: string;
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPasswordEncrypted: string;
  connectionPoolSize?: number;
  status: 'active' | 'suspended' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface ITenantContext {
  tenantId: string;
  subdomain: string;
  dbConfig: ITenantDbConfig;
  dataSource: DataSource;
  metadata: ITenantMetadata;
}

export interface IConnectionMetrics {
  tenantId: string;
  activeConnections: number;
  poolSize: number;
  acquisitionTime: number;
  lastAcquired: Date;
  totalAcquisitions: number;
  totalReleases: number;
}
