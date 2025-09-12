// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow same-origin requests (scheduled tests, internal calls)
      if (!origin) {
        return callback(null, true);
      }

      // Allow Vercel deployments
      if (/\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Allow your production domains
      const allowedDomains = [
        'https://automated-api-performance-testing-system-rn51.onrender.com',
        
      ];

      if (allowedDomains.includes(origin)) {
        return callback(null, true);
      }

      // Block other origins
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
