// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
  origin: 'https://automated-api-performance-testing-s.vercel.app',
  credentials: true,
});


  await app.listen(process.env.PORT || 3000);
}
bootstrap();
