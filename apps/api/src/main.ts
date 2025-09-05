import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = Number(process.env.PORT) || 3001;
  await app.listen(PORT, '0.0.0.0');
  console.log(`API listening on http://0.0.0.0:${PORT}`);
}
bootstrap();
