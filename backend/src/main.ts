// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3001', // nơi frontend đang chạy
    credentials: true,
  });

  await app.listen(3000);
}
bootstrap();
