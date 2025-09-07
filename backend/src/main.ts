// main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
  origin: [
    "http://localhost:3001", // cho dev local
    "https://automated-api-performance-testing-s.vercel.app" // FE deploy trên Vercel
  ],
  credentials: true,
});


  await app.listen(process.env.PORT || 3000);
}
bootstrap();
