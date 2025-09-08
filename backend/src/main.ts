// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: (origin, callback) => {
      // Regex cho tất cả FE deploy trên vercel
      if (/\.vercel\.app$/.test(origin)) {
        return callback(null, true);
      }

      // Nếu không khớp thì chặn
      return callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
