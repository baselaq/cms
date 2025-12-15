import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for local development with subdomain support
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // In development, allow all origins for easier debugging
      if (process.env.NODE_ENV === 'development') {
        if (origin) {
          console.log(`[CORS] Allowing origin in development: ${origin}`);
        }
        return callback(null, true);
      }

      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) {
        console.log('[CORS] Allowing request with no origin');
        return callback(null, true);
      }

      // Allow localhost and subdomain.localhost patterns
      // Also allow app domain and subdomain.app-domain patterns
      const appDomain = process.env.APP_DOMAIN || 'cms.test';
      const escapedDomain = appDomain.replace(/\./g, '\\.');
      const allowedOrigins = [
        /^https?:\/\/localhost(:\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
        /^https?:\/\/([a-z0-9-]+\.)?localhost(:\d+)?$/, // Matches club1.localhost:3000, club1.localhost:3001, etc.
        new RegExp(`^https?://${escapedDomain}(:\\d+)?$`), // Main domain (e.g., cms.test)
        new RegExp(`^https?://([a-z0-9-]+\\.)?${escapedDomain}(:\\d+)?$`), // Subdomains (e.g., example.cms.test)
      ];

      const isAllowed = allowedOrigins.some((pattern) => pattern.test(origin));

      if (isAllowed) {
        console.log(`[CORS] Allowing origin: ${origin}`);
        callback(null, true);
      } else {
        console.error(`[CORS] Rejecting origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Tenant-Subdomain',
      'x-onboarding-token',
      'X-Onboarding-Token',
      'X-ONBOARDING-TOKEN', // All case variations for compatibility
    ],
    exposedHeaders: ['Authorization', 'x-onboarding-token'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
